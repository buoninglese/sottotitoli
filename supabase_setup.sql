-- ============================================================================
-- SOTTOTITOLI — Complete Supabase Setup (safe to re-run, any number of times)
-- ============================================================================

-- 1. TABLES (CREATE IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id BIGSERIAL PRIMARY KEY, email TEXT NOT NULL UNIQUE, subscribed_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  native_lang TEXT DEFAULT 'en', target_lang_1 TEXT, target_lang_2 TEXT,
  level TEXT DEFAULT 'B1', goal TEXT DEFAULT 'b2_6m', sessions_per_week INTEGER DEFAULT 4,
  daily_reminders BOOLEAN DEFAULT true, weekly_reports BOOLEAN DEFAULT false,
  dark_mode BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_report_modules (
  id BIGSERIAL PRIMARY KEY, label TEXT NOT NULL, description TEXT,
  family TEXT NOT NULL CHECK (family IN ('cambridge','business','academic','linguistic')),
  default_rule TEXT, created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_report_requests (
  id BIGSERIAL PRIMARY KEY, user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id INTEGER REFERENCES ai_report_modules(id), family_key TEXT,
  session_ids UUID[] DEFAULT '{}', scope_type TEXT DEFAULT 'single_session',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  created_at TIMESTAMPTZ DEFAULT now(), processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS session_ai_reports (
  id BIGSERIAL PRIMARY KEY, request_id INTEGER REFERENCES ai_report_requests(id),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, module_id INTEGER REFERENCES ai_report_modules(id),
  session_id UUID, summary TEXT, summary_text TEXT, overall_score NUMERIC(3,1),
  confidence NUMERIC(3,1), strengths TEXT[], issues TEXT[], recommendations TEXT[],
  status TEXT DEFAULT 'completed', error_message TEXT, provider TEXT DEFAULT 'openai',
  model TEXT DEFAULT 'gpt-4o', created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ENABLE RLS ON ALL TABLES (idempotent)
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_report_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_ai_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- 3. POLICIES — drop and recreate (DROP IF EXISTS + CREATE)
DO $$ BEGIN DROP POLICY IF EXISTS "Allow public inserts" ON newsletter_subscribers; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Allow public inserts" ON newsletter_subscribers FOR INSERT WITH CHECK (true); EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Allow authenticated select" ON newsletter_subscribers; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Allow authenticated select" ON newsletter_subscribers FOR SELECT USING (auth.role() = 'authenticated'); EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN DROP POLICY IF EXISTS "Users read own prefs" ON user_preferences; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Users read own prefs" ON user_preferences FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Users upsert own prefs" ON user_preferences; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Users upsert own prefs" ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Users update own prefs" ON user_preferences; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Users update own prefs" ON user_preferences FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN DROP POLICY IF EXISTS "Users read own requests" ON ai_report_requests; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Users read own requests" ON ai_report_requests FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Users insert own requests" ON ai_report_requests; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Users insert own requests" ON ai_report_requests FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN DROP POLICY IF EXISTS "Users read own reports" ON session_ai_reports; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Users read own reports" ON session_ai_reports FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN DROP POLICY IF EXISTS "Users read own sessions" ON sessions; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Users read own sessions" ON sessions FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Users insert own sessions" ON sessions; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Users insert own sessions" ON sessions FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Users update own sessions" ON sessions; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Users update own sessions" ON sessions FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN others THEN null; END $$;

-- 4. AI REPORT MODULES (14 rows, skips existing IDs)
INSERT INTO ai_report_modules (id, label, description, family, default_rule) VALUES
(1,'Grammar & Accuracy','Grammar for Cambridge B1-C2','cambridge','Complex structures, verb tenses, errors.'),
(2,'Vocabulary Range','Lexical resource for Cambridge','cambridge','Range, collocations, idioms, topic deployment.'),
(3,'Fluency & Coherence','Fluency for Cambridge speaking','cambridge','Speech flow, discourse markers, coherence.'),
(4,'Pronunciation','Pronunciation for Cambridge','cambridge','Sounds, stress, intonation, connected speech.'),
(5,'Professional Communication','Business formality and tone','business','Register, professional tone, vocabulary.'),
(6,'Meetings & Presentations','Business meetings skills','business','Openings, turn-taking, persuasion, signposting.'),
(7,'Business Vocabulary','Industry terminology','business','Industry terms, business idioms, register.'),
(8,'Academic Discourse','Academic speaking','academic','Hedging, qualifiers, citation, critical thinking.'),
(9,'Research Communication','Research discussion','academic','Methodology, results, technical terminology.'),
(10,'Academic Vocabulary','Academic terminology','academic','AWL coverage, subject terms, nominalization.'),
(11,'Discourse Analysis','Discourse and cohesion','linguistic','Markers, cohesion devices, topic management.'),
(12,'Syntax & Complexity','Syntactic complexity','linguistic','Sentence length, clauses, complexity index.'),
(13,'Lexical Analysis','Lexical statistics','linguistic','TTR, lexical density, frequency distribution.'),
(14,'Filler Analysis','Fillers and disfluency','linguistic','Filler distribution, false starts, self-repairs.')
ON CONFLICT (id) DO NOTHING;

-- 5. MIGRATIONS — add missing columns (safe)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ngsl_coverage NUMERIC(4,3);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS unique_words_count INTEGER;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS question_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS negation_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS repetition_rate NUMERIC(4,3);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS turn_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS interruption_count INTEGER;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS speaking_share_ratio NUMERIC(4,3);

-- 6. VERIFY
SELECT '✅ newsletter_subscribers' FROM pg_tables WHERE tablename='newsletter_subscribers'
UNION ALL SELECT '✅ user_preferences' FROM pg_tables WHERE tablename='user_preferences'
UNION ALL SELECT '✅ ai_report_modules ('||(SELECT COUNT(*) FROM ai_report_modules)||' rows)' FROM pg_tables WHERE tablename='ai_report_modules'
UNION ALL SELECT '✅ ai_report_requests' FROM pg_tables WHERE tablename='ai_report_requests'
UNION ALL SELECT '✅ session_ai_reports' FROM pg_tables WHERE tablename='session_ai_reports'
UNION ALL SELECT '✅ sessions' FROM pg_tables WHERE tablename='sessions';
