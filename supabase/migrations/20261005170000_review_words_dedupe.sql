-- ═══════════════════════════════════════════════════════════════════════════
-- review_words: collapse the duplicates, then make them impossible
--
-- WHY
-- Three writers insert into review_words with a select-then-insert pattern, and they do
-- not agree on the key:
--   js/learner.js:2050 (writeGrade)   looks up (user_id, lang, normalized)
--   js/panoramica.js:4890, :7133      look up (user_id, lemma) -- no lang at all, and
--                                     `lemma` has punctuation stripped, so a row stored as
--                                     'How are you?' is invisible to a lookup for
--                                     'How are you' -> insert
--   js/smart-suggestions.js:698       same shape as the panoramica pair
--
-- The damage then COMPOUNDS, which is what made the numbers explode rather than drift:
-- those writers use .maybeSingle(), which returns an ERROR (not a row) when more than one
-- row matches. So once two rows existed, the code read "no row found" and inserted a third,
-- and every later sync added another.
--
-- Measured on one account immediately before this migration (owner-visible rows only):
--   383 rows, 218 of them inside duplicate groups, 16 duplicate keys, the worst holding 30
--   rows. 200 of the 383 were source_type 'smart' with is_new = true and reps = 0 -- never
--   reviewed, pure noise, yet counted by "Due now" / "Fragile" / saved-from-sessions.
--
-- WHAT THIS DELIBERATELY DOES NOT DO
-- It does not guess a language for the legacy NULL-lang rows. A sample of them contains
-- 'gaat' and 'deutsch' -- words from the user's own speech that belong to neither course
-- language -- so NULL is a real bucket, not a missing value to be filled in. Those rows
-- keep lang NULL and the constraint below limits them to one per word.
--
-- personal_frequency is NOT summed across the collapsed rows. The duplicates came from
-- repeated syncs of the same words, not from the learner meeting the word that many times,
-- so a sum would invent a frequency -- and frequency feeds relevance scoring.
--
-- AFTER
-- One row per (user_id, lang, normalized), enforced by the database, so a writer cannot
-- reintroduce the problem even if its own lookup is wrong.
--
-- NOTE FOR WHOEVER APPLIES THIS: the client writers must be switched to upsert on the same
-- key. Until they are, a writer that still inserts blindly will get 23505 and its own
-- try/catch swallows it, so the word silently stops being synced. See the JS change.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ── 0. Record the starting point (surfaces in the `supabase db push` output) ──
-- Kept in a temp table rather than a local variable: the closing block needs it too.
create temp table rw_before on commit drop as
select (select count(*) from public.review_words) as n_rows,
       (select count(*) from (
          select 1 from public.review_words group by user_id, lang, normalized
        ) g) as n_keys;

do $$
declare b record;
begin
  select * into b from rw_before;
  raise notice 'review_words BEFORE: % rows across % keys', b.n_rows, b.n_keys;
end $$;

-- ── 1. Remove NULL-lang rows that only shadow a real-lang row ────────────────
-- Conservative on purpose: only when the row has NEVER been reviewed AND an advanced
-- sibling with a real language exists. Such a row can never advance -- every write path is
-- lang-filtered and cannot see it -- while permanently inflating the due/fragile counts.
delete from public.review_words d
 where d.lang is null
   and coalesce(d.reps, 0) = 0
   and d.last_reviewed_at is null
   and exists (
     select 1 from public.review_words k
      where k.user_id = d.user_id
        and k.normalized = d.normalized
        and k.lang is not null
   );

-- ── 2. Within each remaining key, keep the row that carries the real progress ─
-- DISTINCT ON treats NULLs as equal, so the NULL-lang bucket collapses correctly here,
-- unlike a plain unique index which treats every NULL as distinct -- exactly how the
-- legacy rows escaped one.
create temp table rw_keep on commit drop as
select distinct on (user_id, lang, normalized) id
  from public.review_words
 order by user_id,
          lang,
          normalized,
          coalesce(reps, 0) desc,
          last_reviewed_at desc nulls last,
          coalesce(mastery_score, 0) desc,
          created_at asc,
          id;

-- Rescue any detail the survivor lacks before the others go.
update public.review_words s
   set pos                 = coalesce(s.pos, g.pos),
       cefr                = coalesce(s.cefr, g.cefr),
       translation_primary = coalesce(s.translation_primary, g.translation_primary)
  from (
    select user_id, lang, normalized,
           min(pos) as pos, min(cefr) as cefr, min(translation_primary) as translation_primary
      from public.review_words
     group by user_id, lang, normalized
  ) g
 where s.id in (select id from rw_keep)
   and g.user_id = s.user_id
   and g.normalized = s.normalized
   and g.lang is not distinct from s.lang;

delete from public.review_words d
 where not exists (select 1 from rw_keep k where k.id = d.id);

-- ── 3. Make it impossible to reintroduce ─────────────────────────────────────
-- `nulls not distinct` (PG15+) so the NULL-lang bucket is limited to one row per word too.
-- This also creates the (user_id, lang, normalized) index the write paths filter on and
-- previously had no index for.
alter table public.review_words
  add constraint review_words_user_lang_normalized_key
  unique nulls not distinct (user_id, lang, normalized);

do $$
declare n_after bigint; k_after bigint; b record;
begin
  select count(*) into n_after from public.review_words;
  select count(*) into k_after from (
    select 1 from public.review_words group by user_id, lang, normalized
  ) g;
  select * into b from rw_before;
  raise notice 'review_words AFTER : % rows across % keys (% rows removed)',
    n_after, k_after, b.n_rows - n_after;
end $$;

commit;
