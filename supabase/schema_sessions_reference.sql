-- ============================================================================
-- SOTTOTITOLI — sessions table reference schema
-- This table was created manually in the Supabase dashboard.
-- Run this in Supabase SQL Editor if you need to recreate it.
-- ============================================================================

CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  room TEXT,                          -- e.g. 'caption-enus-lq4xyz', 'tr-en-it-lq4xyz'
  mode TEXT,                          -- e.g. 'caption-en', 'translate-en-it', 'caption-it'
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,           -- populated on session end
  language_pair TEXT,                 -- e.g. 'en-US', 'it-IT', 'en-it'
  session_type TEXT,                  -- 'caption', 'translation', 'solo'
  topic_tag TEXT,                     -- optional topic label (old cockpit)
  words_count INTEGER DEFAULT 0,      -- total words spoken
  transcript_text TEXT,               -- full transcript (newline-separated)
  -- Metrics (populated by finalizeSessionRow in app.js)
  wpm_avg NUMERIC(5,1),
  quality_score NUMERIC(5,1),
  lexical_diversity NUMERIC(5,3),
  filler_count INTEGER DEFAULT 0,
  pos_verbs INTEGER DEFAULT 0,
  pos_nouns INTEGER DEFAULT 0,
  pos_adjectives INTEGER DEFAULT 0,
  pos_adverbs INTEGER DEFAULT 0,
  pos_pronouns INTEGER DEFAULT 0,
  pos_prepositions INTEGER DEFAULT 0,
  ngs1_coverage NUMERIC(5,3),        -- NGSL 1k word coverage
  ngs2_coverage NUMERIC(5,3),        -- NGSL 2k word coverage
  ngs3_coverage NUMERIC(5,3),        -- NGSL 3k word coverage
  cefr_level TEXT,                    -- e.g. 'B2', 'C1'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_room ON sessions(room);
CREATE INDEX IF NOT EXISTS idx_sessions_session_type ON sessions(session_type);

-- RLS: Users can read/write their own sessions
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own sessions" ON sessions;
CREATE POLICY "Users can read own sessions" ON sessions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sessions" ON sessions;
CREATE POLICY "Users can insert own sessions" ON sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sessions" ON sessions;
CREATE POLICY "Users can update own sessions" ON sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON sessions TO authenticated;
