-- Migration: Add status + updated_at columns to user_wordbank_words
-- Needed by: updateWordStatus() in js/data-service.js
-- Run in Supabase SQL Editor or via supabase CLI

ALTER TABLE user_wordbank_words ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'learning';
ALTER TABLE user_wordbank_words ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
