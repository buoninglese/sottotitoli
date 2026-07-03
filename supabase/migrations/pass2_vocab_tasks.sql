-- ============================================================================
-- PASS 2: Vocabulary, Word Banks, Tasks — for panoramica.html panels
-- Run this in the Supabase SQL Editor against the production database.
-- ============================================================================

-- 1. USER VOCABULARY — central word table, one row per unique word per user per language
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_vocabulary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  word TEXT NOT NULL,
  lang TEXT NOT NULL CHECK (lang IN ('en','it')),
  pos TEXT,                          -- NOUN, VERB, ADJ, ADV, PRON, PREP, CONJ, INTERJ
  cefr_level TEXT,                   -- A1, A2, B1, B2, C1, C2
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, word, lang)
);

CREATE INDEX IF NOT EXISTS idx_uv_user_lang ON user_vocabulary(user_id, lang);
CREATE INDEX IF NOT EXISTS idx_uv_cefr ON user_vocabulary(cefr_level);

ALTER TABLE user_vocabulary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own vocab" ON user_vocabulary;
CREATE POLICY "Users manage own vocab" ON user_vocabulary FOR ALL USING (auth.uid() = user_id);

-- 2. WORD BANKS — user-named vocabulary collections
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_wordbanks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,                -- e.g. "English Tech", "Italiano Base"
  lang TEXT NOT NULL CHECK (lang IN ('en','it')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_uwb_user ON user_wordbanks(user_id, lang);

ALTER TABLE user_wordbanks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own wordbanks" ON user_wordbanks;
CREATE POLICY "Users manage own wordbanks" ON user_wordbanks FOR ALL USING (auth.uid() = user_id);

-- 3. WORD BANK ENTRIES — words inside each collection
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_wordbank_words (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wordbank_id UUID REFERENCES user_wordbanks(id) ON DELETE CASCADE NOT NULL,
  word TEXT NOT NULL,
  pos TEXT,
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_uwbw_bank ON user_wordbank_words(wordbank_id);

ALTER TABLE user_wordbank_words ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own wordbank words" ON user_wordbank_words;
CREATE POLICY "Users manage own wordbank words" ON user_wordbank_words FOR ALL
  USING (EXISTS (SELECT 1 FROM user_wordbanks wb WHERE wb.id = wordbank_id AND wb.user_id = auth.uid()));

-- 4. USER TASKS — for Insights → Compiti panel
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'doing' CHECK (status IN ('doing','todo','done')),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ut_user ON user_tasks(user_id);

ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own tasks" ON user_tasks;
CREATE POLICY "Users manage own tasks" ON user_tasks FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 5. SEED DATA — populate with the mock data so the page immediately shows real rows
--    Replace 'USER_UUID_HERE' with the actual user UUID in a separate seed script.
--    Or run this after looking up the user ID from auth.users.
-- ============================================================================

-- Example seed (run manually with your user ID):
-- Replace '00000000-0000-0000-0000-000000000000' with your actual user UUID.
-- SELECT id FROM auth.users WHERE email = 'studiobuoninglese@gmail.com';

-- Uncomment and run with your user ID:
/*
DO $$
DECLARE
  uid UUID := 'REPLACE_WITH_YOUR_USER_ID';
  wb1 UUID;
  wb2 UUID;
BEGIN
  -- Word bank: English Tech
  INSERT INTO user_wordbanks (user_id, name, lang) VALUES (uid, 'English Tech', 'en') RETURNING id INTO wb1;
  INSERT INTO user_wordbank_words (wordbank_id, word, pos, usage_count) VALUES
    (wb1, 'API', 'NOUN', 5),
    (wb1, 'deploy', 'VERB', 4),
    (wb1, 'endpoint', 'NOUN', 4),
    (wb1, 'deployment', 'NOUN', 6);

  -- Word bank: Italiano Base
  INSERT INTO user_wordbanks (user_id, name, lang) VALUES (uid, 'Italiano Base', 'it') RETURNING id INTO wb2;
  INSERT INTO user_wordbank_words (wordbank_id, word, pos, usage_count) VALUES
    (wb2, 'buongiorno', 'INTERJ', 4),
    (wb2, 'arrivederci', 'INTERJ', 3),
    (wb2, 'permesso', 'NOUN', 2);

  -- Vocabulary: top words
  INSERT INTO user_vocabulary (user_id, word, lang, pos, cefr_level, usage_count) VALUES
    (uid, 'development', 'en', 'NOUN', 'B2', 14),
    (uid, 'understand', 'en', 'VERB', 'A2', 11),
    (uid, 'important', 'en', 'ADJ', 'A2', 9);

  -- Tasks
  INSERT INTO user_tasks (user_id, title, status) VALUES
    (uid, 'Leggi articolo su AI', 'doing'),
    (uid, 'Scrivi 500 parole in inglese', 'doing'),
    (uid, 'Guarda video TED senza sottotitoli', 'todo');
END $$;
*/
