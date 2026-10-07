-- The inline CHECK on `source` was created unnamed inside the column definition, so
-- Postgres named it word_translations_source_check. The next migration added a *named*
-- constraint (word_translations_source) and dropped that, which left the original one
-- in force -- and it still allowed only human/dictionary/machine, so every write marked
-- 'ai' was rejected with a constraint violation.
--
-- Drop both by their real names, then add one constraint that says the whole truth.

alter table public.word_translations drop constraint if exists word_translations_source_check;
alter table public.word_translations drop constraint if exists word_translations_source;

alter table public.word_translations add constraint word_translations_source
  check (source in ('human', 'dictionary', 'machine', 'ai'));
