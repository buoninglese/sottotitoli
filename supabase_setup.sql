-- ============================================================================
-- SOTTOTITOLI — Complete Supabase Setup
-- Run this entire file in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================================

-- 1. NEWSLETTER SUBSCRIBERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  subscribed_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public inserts" ON newsletter_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated select" ON newsletter_subscribers FOR SELECT USING (auth.role() = 'authenticated');


-- 2. USER PREFERENCES
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_preferences (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  native_lang TEXT DEFAULT 'en',
  target_lang_1 TEXT,
  target_lang_2 TEXT,
  level TEXT DEFAULT 'B1',
  goal TEXT DEFAULT 'b2_6m',
  sessions_per_week INTEGER DEFAULT 4,
  daily_reminders BOOLEAN DEFAULT true,
  weekly_reports BOOLEAN DEFAULT false,
  dark_mode BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own prefs" ON user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users upsert own prefs" ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own prefs" ON user_preferences FOR UPDATE USING (auth.uid() = user_id);


-- 3. AI REPORT MODULES (14 modules in 4 families)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_report_modules (
  id BIGSERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  family TEXT NOT NULL CHECK (family IN ('cambridge','business','academic','linguistic')),
  default_rule TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert all 14 modules with explicit IDs (safe to re-run — skips existing)
INSERT INTO ai_report_modules (id, label, description, family, default_rule) VALUES

-- Cambridge (1-4)
(1, 'Grammar & Accuracy', 'Analyze grammatical structures, verb tenses, and accuracy for Cambridge English exams (B1-C2)', 'cambridge', 'Evaluate grammatical range and accuracy. Identify complex structures, verb tense variety, common errors with corrections, and Cambridge-aligned suggestions.'),
(2, 'Vocabulary Range', 'Assess lexical resource, collocations, and topic-specific vocabulary for Cambridge standards', 'cambridge', 'Analyze vocabulary: range (basic→advanced), collocations, idioms, topic-specific deployment, repetition patterns, expansion recommendations for Cambridge exams.'),
(3, 'Fluency & Coherence', 'Evaluate speaking flow, hesitations, and logical organization for Cambridge speaking tests', 'cambridge', 'Examine fluency: speech flow, discourse markers, logical organization, hesitations, self-corrections, overall coherence. Provide Cambridge band descriptor alignment.'),
(4, 'Pronunciation', 'Assessment of pronunciation features relevant to Cambridge speaking criteria', 'cambridge', 'Evaluate: individual sounds, word stress, sentence intonation, connected speech, intelligibility. Note: based on transcription patterns.'),

-- Business (5-7)
(5, 'Professional Communication', 'Evaluate business communication: formality, clarity, professional tone', 'business', 'Analyze: register appropriateness, professional tone, business vocabulary, formal/informal balance, suitability for business contexts.'),
(6, 'Meetings & Presentations', 'Assessment of skills for business meetings, presentations, and negotiations', 'business', 'Evaluate: opening/closing, turn-taking, persuasion, question handling, signposting language. Provide actionable business tips.'),
(7, 'Business Vocabulary', 'Analysis of industry-specific terminology and business idioms', 'business', 'Review: industry terminology, business idioms, financial/commercial language, formal vs informal register, professional lexicon suggestions.'),

-- Academic (8-10)
(8, 'Academic Discourse', 'Evaluate academic speaking for lectures, seminars, and presentations', 'academic', 'Analyze: hedging, academic qualifiers, citation language, critical thinking, abstract expression, objective vs subjective balance.'),
(9, 'Research Communication', 'Assessment of ability to discuss research, methodology, and findings', 'academic', 'Evaluate: methodology clarity, results presentation, limitations discussion, technical terminology, academic questioning response.'),
(10, 'Academic Vocabulary', 'Analysis of subject-specific terminology and academic word list coverage', 'academic', 'Review: academic word list coverage, subject terminology, abstract nouns, nominalization, formal register. Compare against academic corpus standards.'),

-- Linguistic (11-14)
(11, 'Discourse Analysis', 'Detailed linguistic analysis of discourse markers, cohesion, and pragmatics', 'linguistic', 'Analyze: discourse markers, cohesion devices, topic management, reference patterns, pragmatic features (politeness, indirectness).'),
(12, 'Syntax & Complexity', 'Analysis of syntactic structures and sentence complexity metrics', 'linguistic', 'Analyze: sentence length variation, clause types, subordination, syntactic complexity index, passive/active distribution. Include quantitative metrics.'),
(13, 'Lexical Analysis', 'Comprehensive lexical statistics including type-token ratio and frequency patterns', 'linguistic', 'Perform: type-token ratio interpretation, lexical density, word frequency distribution, semantic fields, sophistication indices. Provide comparative benchmarks.'),
(14, 'Filler Analysis', 'Detailed examination of fillers, hesitations, and disfluency patterns', 'linguistic', 'Examine: filler distribution (um, uh, er, like), false starts, self-repairs, pause patterns, repetition types, strategic vs problematic disfluencies.')

ON CONFLICT (id) DO NOTHING;


-- 4. AI REPORT REQUESTS (tracks which modules user requested)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_report_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id INTEGER REFERENCES ai_report_modules(id),
  family_key TEXT,
  session_ids UUID[] DEFAULT '{}',
  scope_type TEXT DEFAULT 'single_session',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);
ALTER TABLE ai_report_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own requests" ON ai_report_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own requests" ON ai_report_requests FOR INSERT WITH CHECK (auth.uid() = user_id);


-- 5. SESSION AI REPORTS (stores completed report results)
-- ============================================================================
CREATE TABLE IF NOT EXISTS session_ai_reports (
  id BIGSERIAL PRIMARY KEY,
  request_id INTEGER REFERENCES ai_report_requests(id),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id INTEGER REFERENCES ai_report_modules(id),
  session_id UUID,
  summary TEXT,
  summary_text TEXT,
  overall_score NUMERIC(3,1),
  confidence NUMERIC(3,1),
  strengths TEXT[],
  issues TEXT[],
  recommendations TEXT[],
  status TEXT DEFAULT 'completed',
  error_message TEXT,
  provider TEXT DEFAULT 'openai',
  model TEXT DEFAULT 'gpt-4o',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE session_ai_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own reports" ON session_ai_reports FOR SELECT USING (auth.uid() = user_id);


-- 6. MIGRATIONS: Add missing columns to existing sessions table (safe if they exist)
-- ============================================================================
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ngsl_coverage NUMERIC(4,3);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS unique_words_count INTEGER;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS question_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS negation_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS repetition_rate NUMERIC(4,3);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS turn_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS interruption_count INTEGER;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS speaking_share_ratio NUMERIC(4,3);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS transcript_text TEXT;


-- 7. USER PREFERENCES


-- 6. SESSIONS (captions + metrics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT,
  room TEXT,
  duration_seconds INTEGER,
  words_count INTEGER,
  transcript_text TEXT,
  wpm NUMERIC(5,1),
  fillers_per_minute NUMERIC(5,1),
  lexical_diversity NUMERIC(4,3),
  quality_score NUMERIC(4,3),
  question_count INTEGER DEFAULT 0,
  negation_count INTEGER DEFAULT 0,
  repetition_rate NUMERIC(4,3),
  turn_count INTEGER DEFAULT 0,
  interruption_count INTEGER,
  speaking_share_ratio NUMERIC(4,3),
  ngsl_coverage NUMERIC(4,3),
  uniquewords_count INTEGER,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own sessions" ON sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sessions" ON sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sessions" ON sessions FOR UPDATE USING (auth.uid() = user_id);


-- 7. Verify everything was created
-- ============================================================================
SELECT '✅ newsletter_subscribers' AS status FROM pg_tables WHERE tablename = 'newsletter_subscribers'
UNION ALL SELECT '✅ user_preferences' FROM pg_tables WHERE tablename = 'user_preferences'
UNION ALL SELECT '✅ ai_report_modules (' || (SELECT COUNT(*) FROM ai_report_modules) || ' rows)' FROM pg_tables WHERE tablename = 'ai_report_modules'
UNION ALL SELECT '✅ ai_report_requests' FROM pg_tables WHERE tablename = 'ai_report_requests'
UNION ALL SELECT '✅ session_ai_reports' FROM pg_tables WHERE tablename = 'session_ai_reports'
UNION ALL SELECT '✅ sessions' FROM pg_tables WHERE tablename = 'sessions';
