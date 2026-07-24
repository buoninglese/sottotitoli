-- Grant 1000 minutes + 1000 credits to studiobuoninglese@gmail.com
-- Run this in Supabase SQL Editor:
--   https://supabase.com/dashboard/project/qzqmuegbpmvqrjrlfbgk/sql/new

DO $$
DECLARE
  uid UUID;
  current_minutes INTEGER;
  current_tokens INTEGER;
  v_balance_after_credits INTEGER;
  v_balance_after_tokens INTEGER;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'studiobuoninglese@gmail.com';

  IF uid IS NULL THEN
    RAISE NOTICE '❌ studiobuoninglese@gmail.com not found in auth.users';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Found user: %', uid;

  -- ── MINUTES (user_credits) ──────────────────────────────────────────
  -- Set balance_minutes = 1000 (absolute set, not add)
  INSERT INTO user_credits (user_id, balance_minutes, balance_seconds, lifetime_seconds, updated_at)
  VALUES (uid, 1000, 60000, 60000, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET balance_minutes = 1000,
                balance_seconds = 60000,
                lifetime_seconds = user_credits.lifetime_seconds + 60000,
                updated_at = NOW()
  RETURNING balance_minutes INTO current_minutes;

  -- Log the credit transaction
  INSERT INTO credit_transactions (user_id, amount_seconds, type, reference, balance_after)
  VALUES (uid, 60000, 'manual', 'admin_grant_1000min', current_minutes * 60);

  RAISE NOTICE '💰 Minutes: set to 1000 min';

  -- ── TOKENS / CREDITS (user_tokens) ──────────────────────────────────
  INSERT INTO user_tokens (user_id, balance, lifetime_tokens, updated_at)
  VALUES (uid, 1000, 1000, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET balance = 1000,
                lifetime_tokens = user_tokens.lifetime_tokens + 1000,
                updated_at = NOW()
  RETURNING balance INTO current_tokens;

  -- Log the token transaction
  INSERT INTO token_transactions (user_id, amount, type, reference, balance_after)
  VALUES (uid, 1000, 'manual', 'admin_grant_1000tokens', 1000);

  RAISE NOTICE '🪙 Tokens: set to 1000 credits';

  RAISE NOTICE '🎉 Done! studiobuoninglese@gmail.com now has 1000 min + 1000 credits.';
END $$;
