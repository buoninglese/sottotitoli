-- Grant credits to specific users
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/qzqmuegbpmvqrjrlfbgk/sql/new

-- First, find the user IDs
DO $$
DECLARE
  uid1 UUID;
  uid2 UUID;
BEGIN
  SELECT id INTO uid1 FROM auth.users WHERE email = 'gloriouspitchfork@gmail.com';
  SELECT id INTO uid2 FROM auth.users WHERE email = 'kostantina.tatsios@gmail.com';

  -- gloriouspitchfork@gmail.com
  IF uid1 IS NOT NULL THEN
    -- Update or insert user_credits
    INSERT INTO user_credits (user_id, balance_seconds, lifetime_seconds, updated_at)
    VALUES (uid1, 30000, 30000, NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET balance_seconds = user_credits.balance_seconds + 30000,
                  lifetime_seconds = user_credits.lifetime_seconds + 30000,
                  updated_at = NOW();
    RAISE NOTICE '✅ gloriouspitchfork: +500 min credits';
  ELSE
    RAISE NOTICE '❌ gloriouspitchfork@gmail.com not found in auth.users';
  END IF;

  -- kostantina.tatsios@gmail.com
  IF uid2 IS NOT NULL THEN
    INSERT INTO user_credits (user_id, balance_seconds, lifetime_seconds, updated_at)
    VALUES (uid2, 30000, 30000, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET balance_seconds = user_credits.balance_seconds + 30000,
                  lifetime_seconds = user_credits.lifetime_seconds + 30000,
                  updated_at = NOW();
    RAISE NOTICE '✅ kostantina.tatsios: +500 min credits';
  ELSE
    RAISE NOTICE '❌ kostantina.tatsios@gmail.com not found in auth.users';
  END IF;
END $$;
