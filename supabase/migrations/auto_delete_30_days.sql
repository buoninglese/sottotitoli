-- ============================================================================
-- SOTTOTITOLI — Auto-delete unsaved sessions after 30 days
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. Add 'saved' column to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS saved BOOLEAN DEFAULT false;

-- 2. Create index for the cleanup query
CREATE INDEX IF NOT EXISTS idx_sessions_cleanup ON sessions(created_at, saved)
  WHERE saved IS NOT TRUE;

-- 3. Function: delete unsaved sessions older than 30 days
CREATE OR REPLACE FUNCTION cleanup_unsaved_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM sessions
    WHERE (saved IS NOT TRUE)
      AND created_at < NOW() - INTERVAL '30 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RAISE NOTICE 'cleanup_unsaved_sessions: deleted % sessions older than 30 days', deleted_count;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Schedule: run daily at 03:00 UTC
-- NOTE: pg_cron must be enabled in your Supabase project (Extensions → pg_cron)
SELECT cron.schedule(
  'cleanup-unsaved-sessions',
  '0 3 * * *',          -- every day at 3 AM UTC
  'SELECT cleanup_unsaved_sessions();'
);

-- 5. Add RLS policy for DELETE (users can delete their own sessions)
DROP POLICY IF EXISTS "Users can delete own sessions" ON sessions;
CREATE POLICY "Users can delete own sessions" ON sessions
  FOR DELETE USING (auth.uid() = user_id);

GRANT DELETE ON sessions TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES (run manually to check)
-- ============================================================================
-- SELECT count(*) FROM sessions WHERE saved IS NOT TRUE AND created_at < NOW() - INTERVAL '30 days';
-- SELECT * FROM cron.job WHERE jobname = 'cleanup-unsaved-sessions';
-- SELECT cleanup_unsaved_sessions();  -- manual test run
