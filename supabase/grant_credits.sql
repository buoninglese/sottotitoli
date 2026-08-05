DO $$
DECLARE
  uid UUID;
  current_minutes INTEGER;
  current_tokens INTEGER;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'studiobuoninglese@gmail.com';

  IF uid IS NULL THEN
    RAISE NOTICE 'User not found';
    RETURN;
  END IF;

  -- MINUTES: set to 1000
  INSERT INTO user_credits (user_id, balance_minutes, balance_seconds, lifetime_seconds, updated_at)
  VALUES (uid, 1000, 60000, 60000, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET balance_minutes = 1000,
                balance_seconds = 60000,
                lifetime_seconds = user_credits.lifetime_seconds + 60000,
                updated_at = NOW()
  RETURNING balance_minutes INTO current_minutes;

  -- Log credit transaction
  INSERT INTO credit_transactions (user_id, amount_seconds, type, reference, balance_after)
  VALUES (uid, 60000, 'manual', 'admin_grant_1000min_20260724', 60000);

  -- TOKENS: set to 1000
  INSERT INTO user_tokens (user_id, balance, lifetime_tokens, updated_at)
  VALUES (uid, 1000, 1000, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET balance = 1000,
                lifetime_tokens = user_tokens.lifetime_tokens + 1000,
                updated_at = NOW()
  RETURNING balance INTO current_tokens;

  -- Log token transaction
  INSERT INTO token_transactions (user_id, amount, type, reference, balance_after)
  VALUES (uid, 1000, 'manual', 'admin_grant_1000tokens_20260724', 1000);

  RAISE NOTICE 'Done: % min, % tokens', current_minutes, current_tokens;
END $$;
