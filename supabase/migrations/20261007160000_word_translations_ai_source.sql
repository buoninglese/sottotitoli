-- Let the store say WHEN a meaning came from an AI pass.
--
-- The first backfill filled the store from MyMemory, and the results ranged from good
-- ("blend in -> mimetizzarsi") to nonsense ("sorry -> %", "can -> eossiwuo"). Overwriting
-- those means overwriting rows the table cannot distinguish from good ones, and the
-- confirmation queue needs to know what it is looking at: a human entry, a dictionary
-- entry, a machine guess, or an AI-authored one written during this pass.
--
-- Adding a value to a CHECK is cheap and reversible; guessing is not.

alter table public.word_translations drop constraint if exists word_translations_source;
alter table public.word_translations add constraint word_translations_source
  check (source in ('human', 'dictionary', 'machine', 'ai'));
