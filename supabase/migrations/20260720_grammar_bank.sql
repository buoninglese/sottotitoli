-- Grammar error bank — stores user-saved (original, corrected, explanation) triplets
-- Supports future error classification, grouping, and prioritization

create table if not exists public.grammar_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  segment_id uuid references public.transcript_segments(id) on delete set null,
  language text not null default 'en',
  original_text text not null,
  corrected_text text not null,
  explanation text,
  error_category text,          -- 'basic','intermediate','advanced'
  error_type text,              -- 'verb_tense','preposition','article','word_order','spelling',etc.
  rule_id text,                 -- LanguageTool rule ID for grouping
  saved_at timestamptz not null default now(),
  review_count integer default 0,
  last_reviewed_at timestamptz
);

alter table public.grammar_errors enable row level security;

create policy "grammar_errors_owner_all"
on public.grammar_errors
for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Index for grouping errors by category and type
create index if not exists grammar_errors_user_category_idx
  on public.grammar_errors(user_id, error_category);

create index if not exists grammar_errors_user_type_idx
  on public.grammar_errors(user_id, error_type);

-- ═══ "All Looked-Up Words" — ensure a pinned wordbank exists for each user ═══
-- This is an idempotent helper: creates the bank if it doesn't exist, returns its ID.

create or replace function public.ensure_looked_up_words_bank()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_bank_id uuid;
begin
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  -- Check if already exists
  select id into v_bank_id
  from public.user_wordbanks
  where user_id = v_user_id and name = 'All Looked-Up Words'
  limit 1;

  if v_bank_id is null then
    insert into public.user_wordbanks (user_id, name, lang, description)
    values (v_user_id, 'All Looked-Up Words', 'en', 'Automatically saved looked-up words')
    returning id into v_bank_id;
  end if;

  return v_bank_id;
end;
$$;

-- Save a looked-up word to the All Looked-Up Words bank
create or replace function public.save_looked_up_word(
  p_word text,
  p_pos text default null,
  p_language text default 'en'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_bank_id uuid;
  v_existing public.user_wordbank_words;
  v_inserted public.user_wordbank_words;
begin
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  -- Ensure the bank exists
  v_bank_id := public.ensure_looked_up_words_bank();

  -- Check for existing word
  select * into v_existing
  from public.user_wordbank_words
  where wordbank_id = v_bank_id and word = p_word;

  if v_existing.id is not null then
    update public.user_wordbank_words
    set usage_count = coalesce(usage_count, 0) + 1,
        last_used = now()
    where id = v_existing.id
    returning * into v_inserted;

    return jsonb_build_object('status', 'incremented', 'word', to_jsonb(v_inserted));
  end if;

  insert into public.user_wordbank_words (wordbank_id, word, pos, usage_count, last_used)
  values (v_bank_id, p_word, p_pos, 1, now())
  returning * into v_inserted;

  return jsonb_build_object('status', 'inserted', 'word', to_jsonb(v_inserted));
end;
$$;
