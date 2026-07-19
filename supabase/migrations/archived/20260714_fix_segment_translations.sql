-- Fix migration: create segment_translations table (missing from 20260714)
-- and recreate the room_segment_feed view that depends on it

-- Create segment_translations table
create table if not exists public.segment_translations (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid not null references public.transcript_segments(id) on delete cascade,
  target_language text not null,
  translated_text text,
  status text not null default 'pending',
  error_code text,
  provider text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists segment_translations_segment_id_idx
  on public.segment_translations(segment_id);

-- Now recreate the feed view (this failed in 20260714 because the table didn't exist)
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
