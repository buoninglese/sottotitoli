-- Add missing columns to profiles table
-- Run this in Supabase SQL Editor: https://qzqmuegbpmvqrjrlfbgk.supabase.co

ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS native_lang TEXT DEFAULT 'en';
ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS learning_profile JSONB;
