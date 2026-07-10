-- Migration: Add display_name column to profiles table
-- Run this in Supabase SQL Editor: https://qzqmuegbpmvqrjrlfbgk.supabase.co
-- SQL Editor → New Query → paste → Run
--
-- This column is used by panoramica.html settings panel and data-service.js
-- for storing the user's chosen display name (distinct from full_name from OAuth).

-- 1. Add the missing column
ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 2. Backfill: copy full_name into display_name for existing profiles that lack it
UPDATE profiles SET display_name = full_name WHERE display_name IS NULL AND full_name IS NOT NULL;

-- 3. Verify
SELECT id, full_name, display_name, native_lang FROM profiles LIMIT 5;
