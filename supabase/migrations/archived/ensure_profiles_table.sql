-- Migration: Ensure profiles table exists with correct structure
-- Run this in Supabase SQL Editor: https://qzqmuegbpmvqrjrlfbgk.supabase.co
-- SQL Editor → New Query → paste → Run
--
-- This table stores per-user profile data. It may have been created manually
-- in the SQL editor without a corresponding migration file in git.
-- This script is idempotent (safe to run multiple times).

-- ============================================================
-- 1. Create profiles table if it doesn't exist
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  native_lang TEXT DEFAULT 'en',
  location TEXT,
  learning_profile JSONB,
  bio_summary TEXT,
  goal_primary TEXT,
  use_cases TEXT[],
  domain TEXT,
  focus_preferences TEXT[],
  feedback_preference TEXT,
  context_examples_preference TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. RLS (safe to re-run)
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- 3. Auto-create profile on signup (trigger)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger to ensure it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 4. Add user_preferences columns for settings panel
-- ============================================================
ALTER TABLE IF EXISTS user_preferences ADD COLUMN IF NOT EXISTS ui_language TEXT DEFAULT 'it';
ALTER TABLE IF EXISTS user_preferences ADD COLUMN IF NOT EXISTS save_sessions BOOLEAN DEFAULT true;
ALTER TABLE IF EXISTS user_preferences ADD COLUMN IF NOT EXISTS anonymous_sharing BOOLEAN DEFAULT false;

-- ============================================================
-- 5. Backfill display_name for existing users
-- ============================================================
UPDATE profiles SET display_name = full_name WHERE display_name IS NULL AND full_name IS NOT NULL;

-- ============================================================
-- 6. Verify
-- ============================================================
SELECT 'profiles columns:' AS check_point;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles' ORDER BY ordinal_position;

SELECT 'user_preferences settings columns:' AS check_point;
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'user_preferences' AND column_name IN ('ui_language', 'save_sessions', 'anonymous_sharing')
ORDER BY column_name;

SELECT 'Row count:' AS check_point;
SELECT 'profiles' AS tbl, count(*) AS rows FROM profiles
UNION ALL
SELECT 'user_preferences', count(*) FROM user_preferences;
