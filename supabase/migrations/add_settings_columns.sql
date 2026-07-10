-- Migration: Add missing columns for settings persistence
-- Run this in Supabase SQL Editor: https://qzqmuegbpmvqrjrlfbgk.supabase.co
-- SQL Editor → New Query → paste → Run
--
-- Context: panoramica.html's Impostazioni panel saves to profiles + user_preferences.
-- Several columns referenced by saveSettings() in data-service.js don't exist yet.

-- ============================================================
-- 1. profiles: add display_name (used by settings panel for user's chosen name)
-- ============================================================
ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Backfill: copy full_name → display_name for existing rows
UPDATE profiles SET display_name = full_name WHERE display_name IS NULL AND full_name IS NOT NULL;

-- ============================================================
-- 2. user_preferences: add columns for settings panel
--    ui_language       → 'it' or 'en' (UI language toggle)
--    save_sessions     → boolean (privacy toggle)
--    anonymous_sharing → boolean (privacy toggle)
-- ============================================================
ALTER TABLE IF EXISTS user_preferences ADD COLUMN IF NOT EXISTS ui_language TEXT DEFAULT 'it';
ALTER TABLE IF EXISTS user_preferences ADD COLUMN IF NOT EXISTS save_sessions BOOLEAN DEFAULT true;
ALTER TABLE IF EXISTS user_preferences ADD COLUMN IF NOT EXISTS anonymous_sharing BOOLEAN DEFAULT false;

-- ============================================================
-- 3. Verify
-- ============================================================
-- profiles columns
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name IN ('display_name', 'full_name', 'native_lang')
ORDER BY column_name;

-- user_preferences columns we just added
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'user_preferences' AND column_name IN ('ui_language', 'save_sessions', 'anonymous_sharing')
ORDER BY column_name;
