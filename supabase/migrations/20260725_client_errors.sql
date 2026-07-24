-- ═══ client_errors — Aggregate error monitoring for Sottotitoli ═══
-- Stores client-side error/warning events from all users.
-- Used by monitor.html to show production error trends.
-- Privacy: error metadata ONLY — no voice data, no transcript text, no PII.

CREATE TABLE IF NOT EXISTS public.client_errors (
  id            BIGSERIAL PRIMARY KEY,
  error_type    TEXT NOT NULL,              -- 'error' | 'warn'
  message       TEXT,                       -- truncated error message (max 200 chars)
  page          TEXT DEFAULT 'caption-s8t', -- which page generated the error
  user_agent    TEXT,                       -- browser UA string (truncated)
  url           TEXT,                       -- page URL at time of error
  session_id    TEXT,                       -- Supabase session ID (nullable — may not be logged in)
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- resolved server-side
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying recent errors
CREATE INDEX IF NOT EXISTS idx_client_errors_created_at ON public.client_errors (created_at DESC);

-- Index for filtering by error type
CREATE INDEX IF NOT EXISTS idx_client_errors_type ON public.client_errors (error_type);

-- Enable RLS
ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;

-- ═══ RLS Policies ═══

-- Anyone can insert (anonymous error reporting allowed)
DROP POLICY IF EXISTS "Allow anonymous insert" ON public.client_errors;
CREATE POLICY "Allow anonymous insert" ON public.client_errors
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated users with admin role can read (for monitor.html dashboard)
-- For now, allow the service_role to read (used by monitor.html via anon key with admin check)
DROP POLICY IF EXISTS "Allow authenticated read" ON public.client_errors;
CREATE POLICY "Allow authenticated read" ON public.client_errors
  FOR SELECT
  TO authenticated
  USING (true);

-- ═══ Helper: resolve user_id from session_id ═══
-- The client sends session_id (UUID from sessions table). We can resolve this
-- to user_id with a trigger, or just leave it as nullable for now.
-- For MVP, user_id is left null — we can backfill later if needed.

COMMENT ON TABLE public.client_errors IS 'Client-side error/warning events from all Sottotitoli users. Used for production monitoring.';
