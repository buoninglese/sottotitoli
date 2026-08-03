-- ============================================================================
-- 20260803: Fix AI Report Pipeline — status, columns, config table, token RPCs
-- Run in Supabase SQL Editor
-- ============================================================================

-- 1. Add 'pending' to the ai_report_requests status CHECK constraint
ALTER TABLE IF EXISTS ai_report_requests 
  DROP CONSTRAINT IF EXISTS ai_report_requests_status_check;

ALTER TABLE IF EXISTS ai_report_requests 
  ADD CONSTRAINT ai_report_requests_status_check 
  CHECK (status IN ('pending','queued','processing','completed','failed'));

-- 2. Add report_markdown + tokens_spent + input_snapshot columns (used by edge function)
ALTER TABLE IF EXISTS ai_report_requests 
  ADD COLUMN IF NOT EXISTS report_markdown TEXT;

ALTER TABLE IF EXISTS ai_report_requests 
  ADD COLUMN IF NOT EXISTS tokens_spent INTEGER DEFAULT 0;

ALTER TABLE IF EXISTS ai_report_requests 
  ADD COLUMN IF NOT EXISTS input_snapshot TEXT;

ALTER TABLE IF EXISTS ai_report_requests 
  ADD COLUMN IF NOT EXISTS prompt_key TEXT;

ALTER TABLE IF EXISTS ai_report_requests 
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 3. Add error_message column to session_ai_reports (if not exists)
ALTER TABLE IF EXISTS session_ai_reports 
  ADD COLUMN IF NOT EXISTS error_message TEXT;

ALTER TABLE IF EXISTS session_ai_reports 
  ADD COLUMN IF NOT EXISTS raw_json JSONB;

ALTER TABLE IF EXISTS session_ai_reports 
  ADD COLUMN IF NOT EXISTS prompt_version TEXT DEFAULT 'v1';

ALTER TABLE IF EXISTS session_ai_reports 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 4. AI Configs table — for dev.html to manage prompts, pricing, presets
-- Drop old version if it has wrong columns (safe: no production data yet)
DROP TABLE IF EXISTS ai_configs CASCADE;

CREATE TABLE ai_configs (
  id BIGSERIAL PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default configs
INSERT INTO ai_configs (config_key, config_value, description) VALUES
('preset_pricing', '{
  "holistic": {"credits": 3, "module_id": 1},
  "personalized": {"credits": 3, "module_id": 1},
  "growth": {"credits": 3, "module_id": 1},
  "cefr": {"credits": 4, "module_id": 4},
  "explorer": {"credits": 2, "module_id": 3},
  "homework": {"credits": 2, "module_id": 3},
  "cambridge": {"credits": 4, "module_id": 11},
  "speech": {"credits": 4, "module_id": 4},
  "drills": {"credits": 2, "module_id": 2}
}', 'Credit costs and module mapping for each UI preset'),
('prompt_overrides', '{}', 'User-customizable prompt overrides per module'),
('report_settings', '{
  "default_model": "gpt-4o",
  "default_temperature": 0.7,
  "default_max_tokens": 800,
  "available_models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"]
}', 'Global AI report generation settings');

ALTER TABLE ai_configs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read configs
DROP POLICY IF EXISTS "Users can read ai_configs" ON ai_configs;
CREATE POLICY "Users can read ai_configs" ON ai_configs 
  FOR SELECT USING (true);

-- Allow service_role to manage configs (dev page saves via edge function)
DROP POLICY IF EXISTS "Service role can manage ai_configs" ON ai_configs;
CREATE POLICY "Service role can manage ai_configs" ON ai_configs 
  FOR ALL USING (true);

-- 5. RPC: Atomic token deduction (CAS — compare and swap)
CREATE OR REPLACE FUNCTION deduct_tokens(
  p_user_id UUID,
  p_amount INTEGER,
  p_reference TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_balance INTEGER;
  v_result JSONB;
BEGIN
  -- Lock the row for atomic update
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

  -- Deduct
  UPDATE user_tokens
  SET balance = balance - p_amount, updated_at = now()
  WHERE user_id = p_user_id;

  -- Log transaction
  INSERT INTO token_transactions (user_id, amount, type, reference, balance_after)
  VALUES (p_user_id, -p_amount, 'report_usage', p_reference, v_balance - p_amount);

  RETURN jsonb_build_object('success', true, 'balance', v_balance - p_amount, 'deducted', p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC: Get token balance (with fallback row creation)
CREATE OR REPLACE FUNCTION get_token_balance(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT balance INTO v_balance FROM user_tokens WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO user_tokens (user_id, balance, lifetime_tokens) VALUES (p_user_id, 3, 0);
    RETURN 3;
  END IF;
  RETURN v_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Auto-trigger: AI Report completed notification (fix — only for completed status)
CREATE OR REPLACE FUNCTION notify_report_ready()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.user_id,
      'system',
      'Report pronto',
      'Il tuo report AI è stato generato con successo.',
      jsonb_build_object('report_id', NEW.id, 'module_id', NEW.module_id, 'score', NEW.overall_score)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS report_ready_auto_notify ON session_ai_reports;
CREATE TRIGGER report_ready_auto_notify
  AFTER INSERT ON session_ai_reports
  FOR EACH ROW EXECUTE FUNCTION notify_report_ready();

-- Verify
SELECT 'ai_report_requests status check updated' AS status;
SELECT 'Migration 20260803_fix_ai_report_status complete' AS result;
