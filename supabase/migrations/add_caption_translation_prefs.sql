-- Migration: Add default_caption_lang + default_translation_pair to user_preferences
-- Run in Supabase SQL Editor
-- Context: panoramica.html Impostazioni panel saves caption/translation defaults

ALTER TABLE IF EXISTS user_preferences ADD COLUMN IF NOT EXISTS default_caption_lang TEXT;
ALTER TABLE IF EXISTS user_preferences ADD COLUMN IF NOT EXISTS default_translation_pair TEXT;
