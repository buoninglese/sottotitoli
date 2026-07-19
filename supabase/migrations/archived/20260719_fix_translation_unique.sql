-- Add unique constraint on segment_translations(segment_id, target_language)
-- Required for upsert onConflict to work correctly

alter table public.segment_translations
add constraint segment_translations_segment_target_unique
unique (segment_id, target_language);
