-- Migration: Add missing onboarding columns (spoken/improve languages + ui_language)
-- Fixes audit issues: spoken_languages, improve_languages, ui_language were missing from schema
-- Run in Supabase SQL Editor
-- Safe to re-run (idempotent)

-- ============================================================
-- 1. Add spoken_languages columns
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_responses' AND column_name = 'spoken_languages') THEN
    ALTER TABLE onboarding_responses ADD COLUMN spoken_languages TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_responses' AND column_name = 'spoken_languages_other') THEN
    ALTER TABLE onboarding_responses ADD COLUMN spoken_languages_other TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_responses' AND column_name = 'improve_languages') THEN
    ALTER TABLE onboarding_responses ADD COLUMN improve_languages TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_responses' AND column_name = 'improve_languages_other') THEN
    ALTER TABLE onboarding_responses ADD COLUMN improve_languages_other TEXT;
  END IF;
END $$;

-- ============================================================
-- 2. Add ui_language column
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'onboarding_responses' AND column_name = 'ui_language') THEN
    ALTER TABLE onboarding_responses ADD COLUMN ui_language TEXT DEFAULT 'it';
  END IF;
END $$;
