-- Migration: language_services
-- Creates segment_grammar + segment_tokens tables
-- Adds enriched feed RPC and save-to-wordbank RPC
-- Uses existing user_wordbanks + user_wordbank_words tables

-- ═══ EXTENSIONS ═══
create extension if not exists pgcrypto;

-- ═══ TABLES ═══

-- Grammar corrections for same-language text (English now, Italian later)
create table if not exists public.segment_grammar (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid not null references public.transcript_segments(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  language text not null,
  provider text not null,
  mode text not null check (mode in ('fix_grammar', 'improve_clarity')),
  original_text text not null,
  corrected_text text,
  status text not null check (status in ('pending', 'complete', 'failed')),
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (segment_id, language, provider, mode)
);

create index if not exists segment_grammar_room_id_idx
  on public.segment_grammar(room_id);

-- Tokenized words extracted from segments (vocabulary cache)
create table if not exists public.segment_tokens (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid not null references public.transcript_segments(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  language text not null,
  surface text not null,
  lemma text,
  pos text,
  token_index integer not null,
  created_at timestamptz not null default now()
);

create index if not exists segment_tokens_segment_id_idx
  on public.segment_tokens(segment_id);

create index if not exists segment_tokens_room_id_idx
  on public.segment_tokens(room_id);

-- ═══ RLS ═══

alter table public.segment_grammar enable row level security;
alter table public.segment_tokens enable row level security;

-- Grammar: room members can read
create policy "segment_grammar_room_members_select"
on public.segment_grammar
for select
using (
  exists (
    select 1 from public.room_members rm
    where rm.room_id = segment_grammar.room_id
      and rm.user_id = auth.uid()
      and rm.left_at is null
  )
);

-- Grammar: room members can insert
create policy "segment_grammar_room_members_insert"
on public.segment_grammar
for insert
with check (
  exists (
    select 1 from public.room_members rm
    where rm.room_id = segment_grammar.room_id
      and rm.user_id = auth.uid()
      and rm.left_at is null
  )
);

-- Grammar: room members can update
create policy "segment_grammar_room_members_update"
on public.segment_grammar
for update
using (
  exists (
    select 1 from public.room_members rm
    where rm.room_id = segment_grammar.room_id
      and rm.user_id = auth.uid()
      and rm.left_at is null
  )
)
with check (
  exists (
    select 1 from public.room_members rm
    where rm.room_id = segment_grammar.room_id
      and rm.user_id = auth.uid()
      and rm.left_at is null
  )
);

-- Tokens: room members can read
create policy "segment_tokens_room_members_select"
on public.segment_tokens
for select
using (
  exists (
    select 1 from public.room_members rm
    where rm.room_id = segment_tokens.room_id
      and rm.user_id = auth.uid()
      and rm.left_at is null
  )
);

-- Tokens: room members can insert
create policy "segment_tokens_room_members_insert"
on public.segment_tokens
for insert
with check (
  exists (
    select 1 from public.room_members rm
    where rm.room_id = segment_tokens.room_id
      and rm.user_id = auth.uid()
      and rm.left_at is null
  )
);

-- ═══ RPC FUNCTIONS ═══

-- Enriched feed item: wraps existing get_room_segment_feed + joins grammar
create or replace function public.get_room_segment_enriched_item(
  p_segment_id uuid,
  p_target_language text
)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_room_id uuid;
  v_feed jsonb;
  v_grammar jsonb;
  v_result jsonb;
begin
  -- Resolve room_id from the segment
  select room_id into v_room_id
  from public.transcript_segments
  where id = p_segment_id;

  if v_room_id is null then
    return null;
  end if;

  -- Get the segment feed projection (existing function)
  v_feed := public.get_room_segment_feed_item(p_segment_id, p_target_language);

  if v_feed is null then
    return null;
  end if;

  -- Get latest grammar correction for this segment
  select row_to_json(g) into v_grammar
  from public.segment_grammar g
  where g.segment_id = p_segment_id
  order by g.updated_at desc
  limit 1;

  -- Merge
  v_result := v_feed || jsonb_build_object('grammar', coalesce(v_grammar, 'null'::jsonb));

  return v_result;
end;
$$;

-- Save a word to an existing user wordbank
-- Uses existing user_wordbank_words table (NOT a new table)
create or replace function public.save_word_to_bank(
  p_wordbank_id uuid,
  p_word text,
  p_pos text default null,
  p_source_language text default 'en'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_wordbank public.user_wordbanks;
  v_existing public.user_wordbank_words;
  v_inserted public.user_wordbank_words;
begin
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  -- Verify ownership of the wordbank
  select * into v_wordbank
  from public.user_wordbanks
  where id = p_wordbank_id and user_id = v_user_id;

  if v_wordbank is null then
    raise exception 'wordbank_not_found_or_not_owned';
  end if;

  -- Check if word already exists in this bank
  select * into v_existing
  from public.user_wordbank_words
  where wordbank_id = p_wordbank_id and word = p_word;

  if v_existing.id is not null then
    -- Increment usage count
    update public.user_wordbank_words
    set usage_count = coalesce(usage_count, 0) + 1,
        last_used = now()
    where id = v_existing.id
    returning * into v_inserted;

    return jsonb_build_object(
      'status', 'incremented',
      'word', to_jsonb(v_inserted)
    );
  end if;

  -- Insert new word
  insert into public.user_wordbank_words (
    wordbank_id, word, pos, usage_count, last_used
  )
  values (
    p_wordbank_id, p_word, p_pos, 1, now()
  )
  returning * into v_inserted;

  return jsonb_build_object(
    'status', 'inserted',
    'word', to_jsonb(v_inserted)
  );
end;
$$;
