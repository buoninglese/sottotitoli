-- word_translations — the store of record for what a word MEANS.
--
-- Why a table of its own: review_words holds the review SCHEDULE (next_review_at,
-- mastery_score, lapses) and, until now, also held the meaning in
-- translation_primary. Because one column served two masters, anything able to write
-- the schedule could also write the meaning, and a transcript sentence ("Il bollitore
-- iniziera a bollire.") ended up as the translation of `start`. Keeping content apart
-- from state means one word has ONE meaning no matter how many banks reference it,
-- which is also the thing that stops the upkeep growing with the number of banks.
--
-- The CHECK is the important part. A sentence can no longer be stored, so the
-- poisoning cannot recur even if the writer that produced it is still running
-- somewhere outside this repository. That is why the rule lives here rather than in
-- a habit.

create table if not exists public.word_translations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  lang        text not null default 'en',
  normalized  text not null,
  word        text not null,
  translation text not null,
  -- Where the meaning came from. Precedence at read time is human > dictionary >
  -- machine, and a human row is never overwritten by a machine one.
  source      text not null default 'machine'
              check (source in ('human', 'dictionary', 'machine')),
  -- Human confirms flip this. The confirmation queue is exactly "verified = false".
  verified    boolean not null default false,
  -- Anything rejected by the CHECK is kept here instead: quarantined, not deleted,
  -- so a bad value can be audited later.
  raw_value   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint word_translations_clean check (
    -- no markup or entities
    translation !~ '[<>]'
    and translation !~ '&(#?[a-zA-Z]+);'
    -- no sentence stop at the end
    and translation !~ '[.!?](\s|$)'
    -- a gloss, not prose: six words or more is a sentence, not a meaning
    and translation !~ '(\s\S+){5,}'
    and length(translation) between 1 and 80
  )
);

-- One row per word per language per learner. All three columns are NOT NULL, so a
-- plain unique index is enough; the NULLS NOT DISTINCT dance from the review_words
-- saga is not needed here.
create unique index if not exists word_translations_key
  on public.word_translations (user_id, lang, normalized);

create index if not exists word_translations_queue
  on public.word_translations (user_id, lang, verified)
  where verified = false;

alter table public.word_translations enable row level security;

drop policy if exists word_translations_own on public.word_translations;
create policy word_translations_own on public.word_translations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
