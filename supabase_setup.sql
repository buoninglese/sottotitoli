-- ============================================================================
-- SOTTOTITOLI — Complete Supabase Setup (safe to re-run)
-- ============================================================================

-- 0. DROP conflicting policies first (safe — silently skips if not found)
-- ============================================================================
DROP POLICY IF EXISTS "Allow public inserts" ON newsletter_subscribers;
DROP POLICY IF EXISTS "Allow authenticated select" ON newsletter_subscribers;
DROP POLICY IF EXISTS "Users read own prefs" ON user_preferences;
DROP POLICY IF EXISTS "Users upsert own prefs" ON user_preferences;
DROP POLICY IF EXISTS "Users update own prefs" ON user_preferences;
DROP POLICY IF EXISTS "Users read own requests" ON ai_report_requests;
DROP POLICY IF EXISTS "Users insert own requests" ON ai_report_requests;
DROP POLICY IF EXISTS "Users read own reports" ON session_ai_reports;
DROP POLICY IF EXISTS "Users read own sessions" ON sessions;
DROP POLICY IF EXISTS "Users insert own sessions" ON sessions;
DROP POLICY IF EXISTS "Users update own sessions" ON sessions;

-- 1. NEWSLETTER SUBSCRIBERS
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id BIGSERIAL PRIMARY KEY, email TEXT NOT NULL UNIQUE, subscribed_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public inserts" ON newsletter_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated select" ON newsletter_subscribers FOR SELECT USING (auth.role() = 'authenticated');

-- 2. USER PREFERENCES
CREATE TABLE IF NOT EXISTS user_preferences (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  native_lang TEXT DEFAULT 'en', target_lang_1 TEXT, target_lang_2 TEXT,
  level TEXT DEFAULT 'B1', goal TEXT DEFAULT 'b2_6m', sessions_per_week INTEGER DEFAULT 4,
  daily_reminders BOOLEAN DEFAULT true, weekly_reports BOOLEAN DEFAULT false,
  dark_mode BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own prefs" ON user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users upsert own prefs" ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own prefs" ON user_preferences FOR UPDATE USING (auth.uid() = user_id);

-- 3. AI REPORT MODULES (14 modules, skips existing IDs)
CREATE TABLE IF NOT EXISTS ai_report_modules (
  id BIGSERIAL PRIMARY KEY, label TEXT NOT NULL, description TEXT,
  family TEXT NOT NULL CHECK (family IN ('cambridge','business','academic','linguistic')),
  default_rule TEXT, created_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO ai_report_modules (id, label, description, family, default_rule) VALUES
(1,'Grammar & Accuracy','Grammar for Cambridge B1-C2','cambridge','Evaluate: complex structures, verb tenses, errors.'),
(2,'Vocabulary Range','Lexical resource for Cambridge','cambridge','Analyze: vocabulary range, collocations, idioms.'),
(3,'Fluency & Coherence','Fluency for Cambridge speaking','cambridge','Examine: speech flow, discourse markers, coherence.'),
(4,'Pronunciation','Pronunciation for Cambridge','cambridge','Evaluate: sounds, stress, intonation.'),
(5,'Professional Communication','Business formality and tone','business','Analyze: register, professional tone, vocabulary.'),
(6,'Meetings & Presentations','Business meetings skills','business','Evaluate: openings, turn-taking, persuasion.'),
(7,'Business Vocabulary','Industry terminology','business','Review: industry terms, business idioms, register.'),
(8,'Academic Discourse','Academic speaking','academic','Analyze: hedging, qualifiers, critical thinking.'),
(9,'Research Communication','Research discussion','academic','Evaluate: methodology, results, terminology.'),
(10,'Academic Vocabulary','Academic terminology','academic','Review: AWL coverage, subject terms, nominalization.'),
(11,'Discourse Analysis','Discourse and cohesion','linguistic','Analyze: markers, cohesion, topic management.'),
(12,'Syntax & Complexity','Syntactic complexity','linguistic','Analyze: sentence length, clauses, complexity.'),
(13,'Lexical Analysis','Lexical statistics','linguistic','Perform: TTR, lexical density, frequency.'),
(14,'Filler Analysis','Fillers and disfluency','linguistic','Examine: filler distribution, false starts.')
ON CONFLICT (id) DO NOTHING;

-- 4. AI REPORT REQUESTS
CREATE TABLE IF NOT EXISTS ai_report_requests (
  id BIGSERIAL PRIMARY KEY, user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id INTEGER REFERENCES ai_report_modules(id), family_key TEXT,
  session_ids UUID[] DEFAULT '{}', scope_type TEXT DEFAULT 'single_session',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  created_at TIMESTAMPTZ DEFAULT now(), processed_at TIMESTAMPTZ
);
ALTER TABLE ai_report_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own requests" ON ai_report_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own requests" ON ai_report_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. SESSION AI REPORTS
CREATE TABLE IF NOT EXISTS session_ai_reports (
  id BIGSERIAL PRIMARY KEY, request_id INTEGER REFERENCES ai_report_requests(id),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, module_id INTEGER REFERENCES ai_report_modules(id),
  session_id UUID, summary TEXT, summary_text TEXT, overall_score NUMERIC(3,1),
  confidence NUMERIC(3,1), strengths TEXT[], issues TEXT[], recommendations TEXT[],
  status TEXT DEFAULT 'completed', error_message TEXT, provider TEXT DEFAULT 'openai',
  model TEXT DEFAULT 'gpt-4o', created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE session_ai_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own reports" ON session_ai_reports FOR SELECT USING (auth.uid() = user_id);

-- 6. SESSIONS
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT, room TEXT, duration_seconds INTEGER, words_count INTEGER,
  transcript_text TEXT, wpm NUMERIC(5,1), fillers_per_minute NUMERIC(5,1),
  lexical_diversity NUMERIC(4,3), quality_score NUMERIC(4,3),
  question_count INTEGER DEFAULT 0, negation_count INTEGER DEFAULT 0,
  repetition_rate NUMERIC(4,3), turn_count INTEGER DEFAULT 0,
  interruption_count INTEGER, speaking_share_ratio NUMERIC(4,3),
  ngsl_coverage NUMERIC(4,3), unique_words_count INTEGER,
  started_at TIMESTAMPTZ DEFAULT now(), ended_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own sessions" ON sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sessions" ON sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sessions" ON sessions FOR UPDATE USING (auth.uid() = user_id);

-- 7. MIGRATIONS — add missing columns (safe)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ngsl_coverage NUMERIC(4,3);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS unique_words_count INTEGER;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS question_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS negation_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS repetition_rate NUMERIC(4,3);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS turn_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS interruption_count INTEGER;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS speaking_share_ratio NUMERIC(4,3);

-- 8. VERIFY
SELECT 'newsletter_subscribers' AS tbl FROM pg_tables WHERE tablename='newsletter_subscribers'
UNION ALL SELECT 'user_preferences' FROM pg_tables WHERE tablename='user_preferences'
UNION ALL SELECT 'ai_report_modules ('||(SELECT COUNT(*) FROM ai_report_modules)||' rows)' FROM pg_tables WHERE tablename='ai_report_modules'
UNION ALL SELECT 'ai_report_requests' FROM pg_tables WHERE tablename='ai_report_requests'
UNION ALL SELECT 'session_ai_reports' FROM pg_tables WHERE tablename='session_ai_reports'
UNION ALL SELECT 'sessions' FROM pg_tables WHERE tablename='sessions';
