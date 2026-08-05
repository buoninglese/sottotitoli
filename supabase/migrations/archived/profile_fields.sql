-- Migration: Profile fields + multi-session support for AI reports
-- Run in Supabase SQL Editor against the production database.

-- Profile linguistico columns for account.html questionnaire
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bio_summary TEXT,
  ADD COLUMN IF NOT EXISTS goal_primary TEXT,
  ADD COLUMN IF NOT EXISTS use_cases TEXT[],
  ADD COLUMN IF NOT EXISTS domain TEXT,
  ADD COLUMN IF NOT EXISTS focus_preferences TEXT[],
  ADD COLUMN IF NOT EXISTS feedback_preference TEXT,
  ADD COLUMN IF NOT EXISTS context_examples_preference TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Multi-session support for reports like Repeating Errors / CEFR
ALTER TABLE session_ai_reports
  ADD COLUMN IF NOT EXISTS session_ids TEXT[];
