-- Migration: Add onboarding_responses table + add onboarding_completed to profiles
-- Run in Supabase SQL Editor or via: supabase db push
-- Safe to re-run (idempotent)

-- ============================================================
-- 1. onboarding_responses table — stores raw onboarding answers
-- ============================================================
CREATE TABLE IF NOT EXISTS onboarding_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  heard_from TEXT,
  heard_from_other TEXT,
  profession TEXT,
  profession_other TEXT,
  native_lang TEXT,
  native_lang_other TEXT,
  why_english TEXT[],
  why_english_other TEXT,
  interested_languages TEXT[],
  interested_languages_other TEXT,
  difficulties TEXT[],
  difficulties_other TEXT,
  mic_tested BOOLEAN DEFAULT false,
  short_term_goal TEXT,
  long_term_goal TEXT,
  intake_conversation_transcript TEXT,
  ai_objectives_conversation_transcript TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_skipped BOOLEAN DEFAULT false,
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. RLS for onboarding_responses
-- ============================================================
ALTER TABLE onboarding_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own onboarding" ON onboarding_responses;
DROP POLICY IF EXISTS "Users can insert own onboarding" ON onboarding_responses;
DROP POLICY IF EXISTS "Users can update own onboarding" ON onboarding_responses;

CREATE POLICY "Users can read own onboarding"
  ON onboarding_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding"
  ON onboarding_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding"
  ON onboarding_responses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 3. Add onboarding_completed_at to profiles (if not exists)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'onboarding_completed_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completed_at TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================================
-- 4. Index for fast onboarding status lookup
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_onboarding_responses_user_id
  ON onboarding_responses(user_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_responses_completed
  ON onboarding_responses(user_id, onboarding_completed)
  WHERE onboarding_completed = true;
