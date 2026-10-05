-- ============================================================================
-- 20260923: Security hardening — RLS tightening + RPC authorization
-- ----------------------------------------------------------------------------
-- Fixes over-broad policies that applied to PUBLIC, and makes the SECURITY
-- DEFINER token RPCs refuse to act on other users' balances.
--
-- Safe for the live app:
--   * Only edge functions (service role) read/write ai_configs.
--   * The client calls deduct_tokens/get_token_balance for the CALLER'S OWN
--     user id (js/panoramica-reportai.js), so we keep `authenticated` access
--     but enforce auth.uid() = p_user_id inside the function.
--   * Notifications are inserted by edge functions/triggers (service role).
-- ============================================================================

-- ── 1. ai_configs: management + reads are service_role only ─────────────────
-- Was: FOR ALL USING (true)  → applied to PUBLIC, letting anyone edit prompts,
-- model and pricing. Add the missing TO clause.
DROP POLICY IF EXISTS "Service role can manage ai_configs" ON ai_configs;
CREATE POLICY "Service role can manage ai_configs" ON ai_configs
  FOR ALL TO service_role USING (true) WITH CHECK (true);
-- Reads (prompts/pricing) are internal-only; the client never reads this table.
DROP POLICY IF EXISTS "Users can read ai_configs" ON ai_configs;
CREATE POLICY "ai_configs_service_read" ON ai_configs
  FOR SELECT TO service_role USING (true);
-- ── 2. Token RPCs: enforce caller == p_user_id ──────────────────────────────
CREATE OR REPLACE FUNCTION deduct_tokens(
  p_user_id UUID,
  p_amount INTEGER,
  p_reference TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid amount');
  END IF;

  -- Only the caller (or the service role, whose auth.uid() is NULL) may deduct.
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;

  SELECT balance INTO v_balance
  FROM user_tokens
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No token record found', 'balance', 0);
  END IF;

  IF v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient tokens', 'balance', v_balance, 'needed', p_amount);
  END IF;

  UPDATE user_tokens
  SET balance = balance - p_amount, updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO token_transactions (user_id, amount, type, reference, balance_after)
  VALUES (p_user_id, -p_amount, 'report_usage', p_reference, v_balance - p_amount);

  RETURN jsonb_build_object('success', true, 'balance', v_balance - p_amount, 'deducted', p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE OR REPLACE FUNCTION get_token_balance(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT balance INTO v_balance FROM user_tokens WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO user_tokens (user_id, balance, lifetime_tokens) VALUES (p_user_id, 3, 0);
    RETURN 3;
  END IF;
  RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Block anonymous execution; keep authenticated (self) + service_role.
REVOKE EXECUTE ON FUNCTION deduct_tokens(uuid, integer, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION get_token_balance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION deduct_tokens(uuid, integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_token_balance(uuid) TO authenticated, service_role;
-- ── 3. notifications: insert privileges are service_role only ───────────────
-- Was: WITH CHECK (true) with no TO clause → PUBLIC could insert for any user.
DROP POLICY IF EXISTS "Service role can insert any" ON notifications;
CREATE POLICY "Service role can insert any" ON notifications
  FOR INSERT TO service_role WITH CHECK (true);
-- Users no longer need to insert their own notifications directly (edge fns do).
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
-- ── 4. client_errors: reads are service_role only ───────────────────────────
-- Was: any authenticated user could read every user's error records.
DROP POLICY IF EXISTS "Allow authenticated read" ON public.client_errors;
CREATE POLICY "Service role can read client_errors" ON public.client_errors
  FOR SELECT TO service_role USING (true);
-- Keep anonymous client-side error reporting ("Allow anonymous insert").

-- Verify
SELECT 'security hardening 20260923 applied' AS status;
