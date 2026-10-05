-- ═══════════════════════════════════════════════════════════════════════════
-- review_words: make the stored `normalized` canonical
--
-- WHY
-- 20261005170000 collapsed the duplicates and locked the key, but it could only merge rows
-- that already shared a key. The queue had been written by two DIFFERENT normalisations:
--
--   js/learner.js norm()  (= js/data-service.js srsKey())   punctuation -> SPACE
--                                                          "you're" -> "you re"
--   the old writers       (panoramica.js x2, smart-suggestions.js)
--                                                          punctuation -> DELETED
--                                                          "you're" -> "youre"
--
-- so words containing punctuation existed twice under two spellings of the same key, and
-- the dedupe could not see they were the same word.
--
-- The JS writers now all call srsKey (commit b994f75), which stops NEW collisions. This
-- migration repairs the ones already stored, so a lookup by the canonical key finds the row
-- that actually holds the progress. Measured on the live table before writing this: exactly
-- one word affected ('a-ok' stored as both 'a-ok' and 'a ok').
--
-- ORDER MATTERS: the collision is resolved BEFORE `normalized` is rewritten, because
-- rewriting first would violate the unique constraint added by 20261005170000. That
-- constraint is also this migration's assertion: if any collision were missed, the UPDATE
-- would abort the whole transaction rather than leave a half-converted table.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- Canonical form, mirroring js/data-service.js srsKey() exactly:
--   lower -> strip accents -> every run of non-alphanumerics becomes one space -> trim
-- The two strings in translate() must stay the same length (24 characters each).
create temp table rw_canon on commit drop as
select id, user_id, lang,
       trim(regexp_replace(
         translate(lower(coalesce(nullif(lemma, ''), normalized)),
                   'àáâãäåèéêëìíîïòóôõöùúûüç',
                   'aaaaaaeeeeiiiiooooouuuuc'),
         '[^a-z0-9]+', ' ', 'g')) as canon
  from public.review_words;

do $$
declare n_before bigint;
begin
  select count(*) into n_before from public.review_words;
  raise notice 'canonical pass over % rows', n_before;
end $$;

-- ── 1. Resolve the collisions first: keep the row that carries the progress ──
create temp table rw_canon_keep on commit drop as
select distinct on (c.user_id, c.lang, c.canon) c.id
  from rw_canon c
  join public.review_words r on r.id = c.id
 order by c.user_id,
          c.lang,
          c.canon,
          coalesce(r.reps, 0) desc,
          r.last_reviewed_at desc nulls last,
          coalesce(r.mastery_score, 0) desc,
          r.created_at asc,
          c.id;

delete from public.review_words d
 where not exists (select 1 from rw_canon_keep k where k.id = d.id);

-- ── 2. Rewrite every stored key to the canonical form ────────────────────────
-- Only `normalized` changes. `lemma` keeps the word as the learner saw it, because that is
-- what the UI displays.
update public.review_words r
   set normalized = c.canon
  from rw_canon c
 where c.id = r.id
   and r.normalized is distinct from c.canon;

do $$
declare n_after bigint; k bigint;
begin
  select count(*) into n_after from public.review_words;
  select count(*) into k from (
    select 1 from public.review_words group by user_id, lang, normalized
  ) g;
  raise notice 'canonical pass done: % rows, % keys (rows == keys means unique)', n_after, k;
end $$;

commit;
