-- Migration: Authoritative segments with member UUIDs, server sequences, and feed view
-- Run: supabase db push or apply via Supabase SQL editor

create extension if not exists pgcrypto;

-- Add color to room_members
alter table public.room_members
  add column if not exists color text not null default '#7c3aed';

-- Add client_id and sequence to transcript_segments
alter table public.transcript_segments
  add column if not exists client_id uuid,
  add column if not exists sequence bigint;

-- Backfill client_id for existing rows
update public.transcript_segments
set client_id = gen_random_uuid()
where client_id is null;

alter table public.transcript_segments
  alter column client_id set not null;

-- Unique constraints
create unique index if not exists transcript_segments_room_client_id_key
  on public.transcript_segments(room_id, client_id);

create unique index if not exists transcript_segments_room_sequence_key
  on public.transcript_segments(room_id, sequence)
  where sequence is not null;

-- Sequence counter per room
create table if not exists public.room_counters (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  next_sequence bigint not null default 1
);

-- Allocate next sequence atomically
create or replace function public.allocate_room_sequence(p_room_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  allocated bigint;
begin
  insert into public.room_counters(room_id, next_sequence)
  values (p_room_id, 2)
  on conflict (room_id)
  do update set next_sequence = public.room_counters.next_sequence + 1
  returning next_sequence - 1 into allocated;

  return allocated;
end;
$$;

-- Create final segment RPC (resolves speaker from auth.uid())
create or replace function public.create_final_segment(
  p_room_id uuid,
  p_client_id uuid,
  p_source_text text,
  p_source_language text
)
returns table (
  id uuid,
  room_id uuid,
  client_id uuid,
  sequence bigint,
  source_text text,
  source_language text,
  is_final boolean,
  created_at timestamptz,
  speaker_member_id uuid,
  speaker_name text,
  speaker_language text,
  speaker_color text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  member_row public.room_members;
  segment_row public.transcript_segments;
  allocated_sequence bigint;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated';
  end if;

  select *
  into member_row
  from public.room_members
  where room_id = p_room_id
    and user_id = auth.uid()
    and left_at is null
    and role in ('owner', 'editor', 'speaker')
  limit 1;

  if member_row.id is null then
    raise exception 'forbidden';
  end if;

  -- Idempotent: if client_id already exists, return existing
  select *
  into segment_row
  from public.transcript_segments
  where room_id = p_room_id
    and client_id = p_client_id
  limit 1;

  if segment_row.id is null then
    allocated_sequence := public.allocate_room_sequence(p_room_id);

    insert into public.transcript_segments (
      room_id,
      speaker_member_id,
      client_id,
      sequence,
      source_text,
      source_language,
      is_final
    )
    values (
      p_room_id,
      member_row.id,
      p_client_id,
      allocated_sequence,
      trim(p_source_text),
      p_source_language,
      true
    )
    returning * into segment_row;
  end if;

  return query
  select
    segment_row.id,
    segment_row.room_id,
    segment_row.client_id,
    segment_row.sequence,
    segment_row.source_text,
    segment_row.source_language,
    segment_row.is_final,
    segment_row.created_at,
    member_row.id,
    member_row.display_name,
    member_row.source_language,
    member_row.color;
end;
$$;

-- Authoritative feed view (joins members + latest translation)
create or replace view public.room_segment_feed
with (security_invoker = true)
as
select
  ts.id,
  ts.room_id,
  ts.client_id,
  ts.sequence,
  ts.source_text,
  ts.source_language,
  ts.is_final,
  ts.created_at,

  rm.id as speaker_member_id,
  rm.display_name as speaker_name,
  rm.source_language as speaker_language,
  rm.color as speaker_color,

  st.id as translation_id,
  st.target_language as translation_language,
  st.translated_text as translation_text,
  st.status as translation_status,
  st.error_code as translation_error_code,
  st.updated_at as translation_updated_at
from public.transcript_segments ts
join public.room_members rm
  on rm.id = ts.speaker_member_id
left join lateral (
  select *
  from public.segment_translations t
  where t.segment_id = ts.id
  order by t.updated_at desc
  limit 1
) st on true;
