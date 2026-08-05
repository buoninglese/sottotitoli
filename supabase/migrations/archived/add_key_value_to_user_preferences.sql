-- Add key/value columns to user_preferences for key-value store pattern
-- Used by: studio-caption.html (WordBank sync)
-- Run this in Supabase SQL Editor

-- Add key column (the preference key, e.g. 'wordbank')
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS key TEXT;

-- Add value column (JSON-encoded preference value)
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS value JSONB;

-- Add unique constraint so upsert on (user_id, key) works
DO $$ BEGIN
  ALTER TABLE user_preferences ADD CONSTRAINT uq_user_prefs_user_key UNIQUE (user_id, key);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- Update RLS policies to cover the new columns (existing policies already cover user_id which is sufficient)
