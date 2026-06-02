-- ============================================================================
-- SOTTOTITOLI — Referral System Migration
-- Run this in Supabase SQL Editor (https://qzqmuegbpmvqrjrlfbgk.supabase.co)
-- Go to: SQL Editor → New Query → paste → Run
-- ============================================================================

-- 1. REFERRALS TABLE
-- Tracks who referred whom and the status of each referral
CREATE TABLE IF NOT EXISTS referrals (
  id BIGSERIAL PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'signed_up'
    CHECK (status IN ('signed_up', 'completed', 'expired')),
  bonus_amount INTEGER,
  bonus_granted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_user_id);

-- 2. ROW LEVEL SECURITY
-- Allow authenticated users to read their own referrals
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Users can see referrals where they are the referrer
CREATE POLICY "Users can view own referrals"
  ON referrals FOR SELECT
  USING (auth.uid() = referrer_id);

-- Users can insert a referral row (when they sign up via a link)
-- Only allow insert if referred_user_id matches the authenticated user
CREATE POLICY "Users can insert their own referral"
  ON referrals FOR INSERT
  WITH CHECK (auth.uid() = referred_user_id);

-- Service role bypasses RLS (for webhook and edge functions)
-- This is automatic — no policy needed for service_role

-- 3. ADD description COLUMN TO token_transactions (for referral descriptions)
ALTER TABLE token_transactions
  ADD COLUMN IF NOT EXISTS description TEXT;

-- ============================================================================
-- VERIFICATION QUERIES (run after migration to verify)
-- ============================================================================

-- Check table exists:
-- SELECT * FROM referrals LIMIT 1;

-- Check RLS policies:
-- SELECT * FROM pg_policies WHERE tablename = 'referrals';

-- Check token_transactions has description column:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'token_transactions' AND column_name = 'description';
