-- ═══════════════════════════════════════════════════════════
-- RLS Audit Fix — 2026-07-23
-- Run in: https://supabase.com/dashboard/project/qzqmuegbpmvqrjrlfbgk/sql/new
-- ═══════════════════════════════════════════════════════════

-- ── 1. ai_report_modules: read-only catalog, restrict modifications ──
ALTER TABLE ai_report_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read report modules" ON ai_report_modules;
CREATE POLICY "Anyone can read report modules"
  ON ai_report_modules FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only service can modify modules" ON ai_report_modules;
CREATE POLICY "Only service can modify modules"
  ON ai_report_modules FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Only service can update modules"
  ON ai_report_modules FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Only service can delete modules"
  ON ai_report_modules FOR DELETE
  TO service_role
  USING (true);

-- ── 2. user_ai_entitlements: own data only ──
ALTER TABLE user_ai_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own entitlements" ON user_ai_entitlements;
CREATE POLICY "Users read own entitlements"
  ON user_ai_entitlements FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own entitlements" ON user_ai_entitlements;
CREATE POLICY "Users insert own entitlements"
  ON user_ai_entitlements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service manage entitlements" ON user_ai_entitlements;
CREATE POLICY "Service manage entitlements"
  ON user_ai_entitlements FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── 3. room_counters: internal only, no direct anon access ──
ALTER TABLE room_counters ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies — only accessible via SECURITY DEFINER RPC
-- (allocate_room_sequence) which already has auth.uid() check from hardening.

-- ── 4. user_analytics_snapshot: fix overly permissive policy ──
DROP POLICY IF EXISTS "Service upsert analytics" ON user_analytics_snapshot;

-- Replace with service_role-only upsert (edge functions use service_role key)
CREATE POLICY "Service upsert analytics"
  ON user_analytics_snapshot FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- User read policy (already exists but ensure it's correct)
DROP POLICY IF EXISTS "Users read own analytics" ON user_analytics_snapshot;
CREATE POLICY "Users read own analytics"
  ON user_analytics_snapshot FOR SELECT
  USING (auth.uid() = user_id);

-- ── 5. Verify ──

SELECT 'Tables with RLS enabled' AS check_name;
SELECT relname, relrowsecurity
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relkind = 'r'
  AND relrowsecurity = true
ORDER BY relname;

SELECT 'Tables MISSING RLS' AS check_name;
SELECT relname
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relkind = 'r'
  AND relrowsecurity = false
  AND relname NOT LIKE 'pg_%'
  AND relname NOT LIKE '_prisma%'
ORDER BY relname;
