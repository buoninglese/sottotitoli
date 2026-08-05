-- Add theme + font_pref columns to user_preferences for Aspetto settings
ALTER TABLE IF EXISTS user_preferences ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'auto';
ALTER TABLE IF EXISTS user_preferences ADD COLUMN IF NOT EXISTS font_pref TEXT DEFAULT 'sans';
