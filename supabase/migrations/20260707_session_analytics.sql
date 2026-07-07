-- ═══ Session Analytics — vocabulary + MATTR + CEFR ═══
-- Run this migration in Supabase SQL Editor.

-- 1) Add analytics columns to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS mattr_score NUMERIC(4,3);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cefr_a1_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cefr_a2_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cefr_b1_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cefr_b2_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cefr_c1_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cefr_c2_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS vocab_size INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS transcript_processed BOOLEAN DEFAULT false;

-- 2) User vocabulary — accumulates across all sessions
CREATE TABLE IF NOT EXISTS user_vocabulary (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lemma TEXT NOT NULL,
  cefr TEXT,           -- A1-C2
  first_seen TIMESTAMPTZ DEFAULT now(),
  last_seen TIMESTAMPTZ DEFAULT now(),
  encounter_count INTEGER DEFAULT 1,
  UNIQUE(user_id, lemma)
);

CREATE INDEX IF NOT EXISTS idx_user_vocab_user ON user_vocabulary(user_id);
CREATE INDEX IF NOT EXISTS idx_user_vocab_cefr ON user_vocabulary(user_id, cefr);

-- 3) Cumulative analytics snapshot — updated per session
CREATE TABLE IF NOT EXISTS user_analytics_snapshot (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_sessions INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  vocab_size INTEGER DEFAULT 0,
  mattr_avg NUMERIC(4,3),
  cefr_a1 INTEGER DEFAULT 0,
  cefr_a2 INTEGER DEFAULT 0,
  cefr_b1 INTEGER DEFAULT 0,
  cefr_b2 INTEGER DEFAULT 0,
  cefr_c1 INTEGER DEFAULT 0,
  cefr_c2 INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4) RLS policies
ALTER TABLE user_vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_analytics_snapshot ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users read own vocabulary" ON user_vocabulary;
  CREATE POLICY "Users read own vocabulary" ON user_vocabulary FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN others THEN null;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users insert own vocabulary" ON user_vocabulary;
  CREATE POLICY "Users insert own vocabulary" ON user_vocabulary FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN others THEN null;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users update own vocabulary" ON user_vocabulary;
  CREATE POLICY "Users update own vocabulary" ON user_vocabulary FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN others THEN null;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users read own analytics" ON user_analytics_snapshot;
  CREATE POLICY "Users read own analytics" ON user_analytics_snapshot FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN others THEN null;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Service upsert analytics" ON user_analytics_snapshot;
  CREATE POLICY "Service upsert analytics" ON user_analytics_snapshot FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN others THEN null;
END $$;
