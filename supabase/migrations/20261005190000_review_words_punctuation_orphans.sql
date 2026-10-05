-- ═══════════════════════════════════════════════════════════════════════════
-- review_words: remove the punctuation orphans left by the old writers
--
-- WHY THERE IS STILL ANYTHING TO DO
-- 20261005170000 deduped within a key and 20261005180000 rewrote keys to the canonical
-- form. Both worked from `lemma`, and that is the gap: the OLD writers stored
-- `lemma: clean` -- already stripped of punctuation -- so for a word like "you're welcome"
-- the stored lemma is "youre welcome" and re-normalising it yields 'youre welcome', while
-- the trainer (which normalises the RAW word) yields 'you re welcome'. Two forms of the same
-- word, so they were never the same key and neither dedupe could see they belonged together.
--
-- Measured on one account after both migrations, exactly two such pairs remained:
--   ('youre welcome',    'you re welcome') and ('im fine thank you', 'i m fine thank you')
--
-- Only one of the pair is reachable: the writers all derive the key from the raw word, so
-- they will always compute the spaced form. The other row is an orphan -- invisible to every
-- writer, permanently counted by "Due now"/"Fragile", and unable to ever advance.
--
-- THE RULE, and why it is safe:
--   in a group that collides under the canonical key, delete a row whose stored key is just
--   that key again (normalized = ckey -- i.e. produced from an already-stripped lemma) WHEN a
--   twin exists whose key differs from ckey (produced from the raw word, so it carries the
--   spacing punctuation produced) AND the row being deleted has never been reviewed.
-- The last two conditions are the safety net: a progressed row is never removed, and a group
-- with no punctuation-derived twin is left completely alone.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

create temp table rw_canon2 on commit drop as
select id, user_id, lang, normalized, coalesce(reps, 0) as reps, last_reviewed_at,
       trim(regexp_replace(
         translate(lower(coalesce(nullif(lemma, ''), normalized)),
                   'àáâãäåèéêëìíîïòóôõöùúûüç',
                   'aaaaaaeeeeiiiiooooouuuuc'),
         '[^a-z0-9]+', ' ', 'g')) as ckey
  from public.review_words;

do $$
declare n_before bigint;
begin
  select count(*) into n_before from public.review_words;
  raise notice 'punctuation-orphan pass over % rows', n_before;
end $$;

delete from public.review_words d
 using rw_canon2 c
 where c.id = d.id
   and c.normalized = c.ckey                       -- this row's key came from a stripped lemma
   and coalesce(c.reps, 0) = 0                     -- never reviewed
   and c.last_reviewed_at is null
   and exists (                                     -- a reachable twin exists
     select 1 from rw_canon2 t
      where t.user_id = c.user_id
        and t.lang is not distinct from c.lang
        and t.ckey = c.ckey
        and t.id <> c.id
        and t.normalized <> t.ckey
   );

do $$
declare n_after bigint; k bigint;
begin
  select count(*) into n_after from public.review_words;
  select count(*) into k from (select 1 from public.review_words group by user_id, lang, normalized) g;
  raise notice 'punctuation-orphan pass done: % rows, % keys', n_after, k;
end $$;

commit;
