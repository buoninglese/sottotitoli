-- ============================================================================
-- Notification Bell System — realtime notifications via Supabase
-- Run in Supabase SQL Editor
-- ============================================================================

-- 1. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('system', 'welcome', 'metric', 'boost', 'motivational')),
  title TEXT NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Index for fast user queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read, created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own read status" ON notifications;
CREATE POLICY "Users can update own read status"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow service_role to insert for any user (for triggers and edge functions)
DROP POLICY IF EXISTS "Service role can insert any" ON notifications;
CREATE POLICY "Service role can insert any"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;


-- ============================================================================
-- 2. Auto-trigger: Session saved notification
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_session_saved()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    NEW.user_id,
    'system',
    'Sessione salvata',
    'La tua sessione di ' || COALESCE(NEW.duration_minutes, 0) || ' minuti è stata archiviata.',
    jsonb_build_object('session_id', NEW.id, 'duration', NEW.duration_minutes)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS session_saved_auto_notify ON sessions;
CREATE TRIGGER session_saved_auto_notify
  AFTER INSERT ON sessions
  FOR EACH ROW EXECUTE FUNCTION notify_session_saved();


-- ============================================================================
-- 3. Auto-trigger: AI Report ready notification
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_report_ready()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    NEW.user_id,
    'system',
    'Report pronto',
    'Il tuo report AI è stato generato con successo.',
    jsonb_build_object('report_id', NEW.id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS report_ready_auto_notify ON session_ai_reports;
CREATE TRIGGER report_ready_auto_notify
  AFTER INSERT ON session_ai_reports
  FOR EACH ROW EXECUTE FUNCTION notify_report_ready();
