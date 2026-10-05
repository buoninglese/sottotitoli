-- ═══════════════════════════════════════════════════════════════════════════
-- review_words: re-key with the apostrophe-DELETING canonical key
--
-- WHY
-- 20261005180000 rewrote the stored keys with the canonical form of that moment, which turned
-- an apostrophe into a SPACE ("I'm fine" -> "i m fine"). Both spellings occur in the course
-- data ("Im fine"), and that one also normalises to "im fine" -- so one word had two keys and
-- could occupy two rows. js/data-service.js srsKey() now DELETES the apostrophe instead
-- ("I'm fine" -> "im fine"), which collapses the pair, and js/learner.js writeGrade() takes
-- its key from srsKey() rather than from its own norm() (norm() still spaces it, because norm()
-- also grades spoken answers and must not change).
--
-- This migration brings the STORED rows in line with that key. It runs AFTER the JS deploy on
-- purpose: while the new key was live but the rows were not, a writer could have inserted a
-- second row for an apostrophe word, and the dedupe below absorbs exactly that.
--
-- ORDER MATTERS: collisions are resolved BEFORE `normalized` is rewritten, because rewriting
-- first would violate `review_words_user_lang_normalized_key`. That constraint is also this
-- migration's assertion -- a missed collision aborts the transaction instead of half-keying
-- the table.
--
-- The key is derived from `lemma` (falling back to `normalized`) because that is the only
-- column that may still carry the original apostrophe. Re-deriving from `normalized` would
-- NOT collapse the pair: the space is already baked in there by the previous pass.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- Canonical key, mirroring js/data-service.js srsKey():
--   lower -> fold accents -> DELETE apostrophes -> every other non-alphanumeric becomes one
--   space -> trim
create temp table rw_rk on commit drop as
select id, user_id, lang,
       trim(regexp_replace(
         regexp_replace(
           translate(lower(coalesce(nullif(lemma, ''), normalized)),
                     'àáâãäåèéêëìíîïòóôõöùúûüç',
                     'aaaaaaeeeeiiiiooooouuuuc'),
           '[''’`´]', '', 'g'),
         '[^a-z0-9]+', ' ', 'g')) as newkey
  from public.review_words;

do $$
declare n_before bigint; k_before bigint; k_new bigint;
begin
  select count(*) into n_before from public.review_words;
  select count(*) into k_before from (select 1 from public.review_words group by user_id, lang, normalized) g;
  select count(*) into k_new from (select 1 from rw_rk group by user_id, lang, newkey) g;
  raise notice 're-key: % rows, % current keys -> % keys under the new rule', n_before, k_before, k_new;
end $$;

-- ── 1. Resolve the collisions the new key introduces, keeping the progressed row ──
create temp table rw_rk_keep on commit drop as
select distinct on (c.user_id, c.lang, c.newkey) c.id
  from rw_rk c
  join public.review_words r on r.id = c.id
 order by c.user_id, c.lang, c.newkey,
          coalesce(r.reps, 0) desc,
          r.last_reviewed_at desc nulls last,
          coalesce(r.mastery_score, 0) desc,
          r.created_at asc,
          c.id;

-- rescue any detail the survivor lacks before the others go
update public.review_words s
   set pos                 = coalesce(s.pos, g.pos),
       cefr                = coalesce(s.cefr, g.cefr),
       translation_primary = coalesce(s.translation_primary, g.translation_primary)
  from rw_rk c
  join (
    select w.user_id, w.lang, w.newkey,
           min(r2.pos) as pos, min(r2.cefr) as cefr,
           min(r2.translation_primary) as translation_primary
      from rw_rk w
      join public.review_words r2 on r2.id = w.id
     group by w.user_id, w.lang, w.newkey
  ) g
    on g.user_id = c.user_id
   and g.lang is not distinct from c.lang
   and g.newkey = c.newkey
 where c.id = s.id
   and s.id in (select id from rw_rk_keep);

delete from public.review_words d
 where not exists (select 1 from rw_rk_keep k where k.id = d.id);

-- ── 2. Rewrite the keys ────────────────────────────────────────────────────
-- Only `normalized` changes; `lemma` keeps the word as the learner saw it.
update public.review_words r
   set normalized = c.newkey
  from rw_rk c
 where c.id = r.id
   and r.normalized is distinct from c.newkey;

do $$
declare n_after bigint; k bigint;
begin
  select count(*) into n_after from public.review_words;
  select count(*) into k from (select 1 from public.review_words group by user_id, lang, normalized) g;
  raise notice 're-key done: % rows, % keys (rows == keys means unique)', n_after, k;
end $$;

commit;
