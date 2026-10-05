-- Fix: session-saved notification — show seconds for sub-minute durations
-- and skip empty sessions (0 or null duration_seconds)
CREATE OR REPLACE FUNCTION notify_session_saved()
RETURNS TRIGGER AS $$
DECLARE
  dur_text TEXT;
  ds INTEGER;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.ended_at IS NOT NULL) OR
     (TG_OP = 'UPDATE' AND NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL) THEN
    ds := COALESCE(NEW.duration_seconds, 0);
    -- Skip empty sessions (no duration = nothing was recorded)
    IF ds <= 0 THEN
      RETURN NEW;
    END IF;
    -- Format duration: seconds for <60s, minutes otherwise
    IF ds < 60 THEN
      dur_text := ds || ' secondi';
    ELSE
      dur_text := (ds / 60) || ' minuti';
    END IF;
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.user_id,
      'system',
      'Sessione salvata',
      'La tua sessione di ' || dur_text || ' è stata archiviata.',
      jsonb_build_object('session_id', NEW.id, 'duration', ds)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
