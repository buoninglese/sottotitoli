-- Add native language profile columns to profiles table
-- Used by Profilo Linguistico → Lingua madre subsubtabs
ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS native_proficiency TEXT;
ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS native_contexts TEXT[];
ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS native_improve TEXT[];
ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS native_goals TEXT;
