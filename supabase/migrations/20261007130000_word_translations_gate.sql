-- Tighten the meaning gate.
--
-- The first version of the CHECK demanded no letter and allowed a single character, so
-- a machine translator's "%" was storable as a meaning. Measured on the first backfill:
-- 25 of 78 stored rows were echoes (the word returned as its own translation, or the
-- same word in different case) and one was pure noise. The application now refuses
-- those before writing, but the rule belongs in the table too -- the gate is what makes
-- this solidify rather than decay.
--
-- A meaning is: no markup or entities, no sentence stop, at most five words, between
-- two and eighty characters, and containing at least one letter.

alter table public.word_translations drop constraint if exists word_translations_clean;

alter table public.word_translations add constraint word_translations_clean check (
  translation !~ '[<>]'
  and translation !~ '&(#?[a-zA-Z]+);'
  and translation !~ '[.!?](\s|$)'
  and translation !~ '(\s\S+){5,}'
  and length(translation) between 2 and 80
  and translation ~ '[[:alpha:]]'
);
