-- Migration: Add last_weekly_topup column for recurring free credits
-- Run this in Supabase SQL Editor

-- Add the column if it doesn't exist
ALTER TABLE user_credits ADD COLUMN IF NOT EXISTS last_weekly_topup TIMESTAMPTZ;

-- Also ensure updated_at exists
ALTER TABLE user_credits ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
