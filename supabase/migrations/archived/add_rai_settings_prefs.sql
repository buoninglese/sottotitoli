-- Migration: Add AI Report settings columns to user_preferences
-- Context: panoramica.html's Impostazioni subtab (Report AI) saves these

ALTER TABLE IF EXISTS user_preferences ADD COLUMN IF NOT EXISTS rai_tone TEXT DEFAULT 'academic';
ALTER TABLE IF EXISTS user_preferences ADD COLUMN IF NOT EXISTS rai_lang TEXT DEFAULT 'it';
ALTER TABLE IF EXISTS user_preferences ADD COLUMN IF NOT EXISTS rai_priority TEXT DEFAULT 'accuracy';

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_preferences' AND column_name IN ('rai_tone', 'rai_lang', 'rai_priority')
ORDER BY column_name;
