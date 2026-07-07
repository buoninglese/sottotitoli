-- ═══ Session Analytics — vocabulary + MATTR + CEFR ═══
-- Run this migration in Supabase SQL Editor.
-- Prerequisites: pass2_vocab_tasks.sql must already be applied (user_vocabulary table exists).

-- 1) Add analytics columns to sessions table
-- NOTE: sessions columns verified 2026-07-07 — these are the NEW columns being added.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS mattr_score NUMERIC(4,3);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cefr_a1_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cefr_a2_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cefr_b1_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cefr_b2_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cefr_c1_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cefr_c2_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS vocab_size INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS transcript_processed BOOLEAN DEFAULT false;

-- 2) Cumulative analytics snapshot — updated per session by edge function
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

-- 3) RLS for user_analytics_snapshot
ALTER TABLE user_analytics_snapshot ENABLE ROW LEVEL SECURITY;

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

-- 4) RPC: increment vocabulary usage counts (called by edge function)
-- Bumps usage_count + last_used for existing words in user_vocabulary.
CREATE OR REPLACE FUNCTION increment_vocab_usage(
  p_user_id UUID,
  p_lang TEXT,
  p_words TEXT[]
) RETURNS void AS $$
BEGIN
  UPDATE user_vocabulary
  SET usage_count = usage_count + 1,
      last_used = now()
  WHERE user_id = p_user_id
    AND lang = p_lang
    AND word = ANY(p_words);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5) Verify: check that user_vocabulary uses correct column names
-- If the table was created by an older migration with 'lemma'/'cefr' columns,
-- this migration assumes pass2_vocab_tasks.sql was applied (word/cefr_level/lang).
-- Run this check query to confirm:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_vocabulary' ORDER BY ordinal_position;
