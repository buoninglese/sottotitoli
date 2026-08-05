-- ============================================================
-- TEST ACCOUNT SETUP: 100 minutes + 100 tokens
-- Run this in: https://supabase.com/dashboard/project/qzqmuegbpmvqrjrlfbgk/sql
-- ============================================================

DO $$
DECLARE
  target_email TEXT := 'studiobuoninglese@gmail.com';
  target_id UUID;
BEGIN

  -- Find the user
  SELECT id INTO target_id FROM auth.users WHERE email = target_email;
  IF target_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', target_email;
  END IF;

  RAISE NOTICE 'Found user: %', target_id;

  -- Set 100 minutes (6000 seconds) of credits
  INSERT INTO user_credits (user_id, balance_seconds, lifetime_seconds)
  VALUES (target_id, 6000, 6000)
  ON CONFLICT (user_id)
  DO UPDATE SET balance_seconds = 6000, lifetime_seconds = 6000, updated_at = now();

  -- Set 100 tokens
  INSERT INTO user_tokens (user_id, balance, lifetime_tokens)
  VALUES (target_id, 100, 100)
  ON CONFLICT (user_id)
  DO UPDATE SET balance = 100, lifetime_tokens = 100, updated_at = now();

  RAISE NOTICE '✅ Test account set up: 100 min credits + 100 tokens for %', target_email;

END $$;
