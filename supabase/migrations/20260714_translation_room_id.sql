-- Migration: Add room_id to segment_translations for scoped Realtime filtering
-- This allows the Realtime subscription to filter translation updates by room.

alter table public.segment_translations
  add column if not exists room_id uuid;

-- Populate room_id from the parent segment
update public.segment_translations st
set room_id = ts.room_id
from public.transcript_segments ts
where st.segment_id = ts.id
  and st.room_id is null;

-- Add index for Realtime filtering
create index if not exists segment_translations_room_id_idx
  on public.segment_translations(room_id);
