-- ============================================================================
-- SOTTOTITOLI — Complete Supabase Setup (safe to re-run, any number of times)
-- ============================================================================

-- 1. CORE TABLES
-- ============================================================================
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
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued','processing','completed','failed')),
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

-- 2. CREDIT & TOKEN SYSTEM
-- ============================================================================

-- Credit balances (minutes of usage time)
CREATE TABLE IF NOT EXISTS user_credits (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance_seconds INTEGER NOT NULL DEFAULT 900,  -- [DEPRECATED] legacy seconds column
  balance_minutes INTEGER NOT NULL DEFAULT 15,    -- minutes pool (caption 0.5×, translation 1×)
  lifetime_seconds INTEGER NOT NULL DEFAULT 0,    -- total ever purchased (legacy)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Migration for existing data:
-- ALTER TABLE user_credits ADD COLUMN IF NOT EXISTS balance_minutes INTEGER NOT NULL DEFAULT 15;
-- UPDATE user_credits SET balance_minutes = GREATEST(1, ROUND(balance_seconds / 60)) WHERE balance_minutes = 15;

-- Token balances (for AI reports)
CREATE TABLE IF NOT EXISTS user_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance INTEGER NOT NULL DEFAULT 3,            -- 3 free tokens on signup
  lifetime_tokens INTEGER NOT NULL DEFAULT 0,     -- total ever purchased
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Credit transaction log (every add/deduct)
CREATE TABLE IF NOT EXISTS credit_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_seconds INTEGER NOT NULL,               -- positive=credit, negative=debit
  type TEXT NOT NULL CHECK (type IN ('purchase','signup_bonus','session_usage','refund','manual')),
  reference TEXT,                                  -- Stripe session ID, session UUID, etc.
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Token transaction log
CREATE TABLE IF NOT EXISTS token_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,                        -- positive=credit, negative=debit
  type TEXT NOT NULL CHECK (type IN ('purchase','signup_bonus','report_usage','refund','manual')),
  reference TEXT,
  balance_after INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS
-- ============================================================================
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_report_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_ai_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;

-- 4. POLICIES (error-proof DO blocks)
-- ============================================================================
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

DO $$ BEGIN DROP POLICY IF EXISTS "Users read own credits" ON user_credits; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Users read own credits" ON user_credits FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Users insert own credits" ON user_credits; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Users insert own credits" ON user_credits FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Users update own credits" ON user_credits; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Users update own credits" ON user_credits FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN DROP POLICY IF EXISTS "Users read own tokens" ON user_tokens; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Users read own tokens" ON user_tokens FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Users insert own tokens" ON user_tokens; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Users insert own tokens" ON user_tokens FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Users update own tokens" ON user_tokens; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Users update own tokens" ON user_tokens FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN DROP POLICY IF EXISTS "Users read own credit log" ON credit_transactions; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Users read own credit log" ON credit_transactions FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Users insert credit log" ON credit_transactions; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Users insert credit log" ON credit_transactions FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN DROP POLICY IF EXISTS "Users read own token log" ON token_transactions; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Users read own token log" ON token_transactions FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "Users insert token log" ON token_transactions; EXCEPTION WHEN others THEN null; END $$;
DO $$ BEGIN CREATE POLICY "Users insert token log" ON token_transactions FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN others THEN null; END $$;

-- 5. AI REPORT MODULES (14 rows, skips existing IDs)
-- ============================================================================
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

-- 6. MIGRATIONS
-- ============================================================================
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ngsl_coverage NUMERIC(4,3);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS unique_words_count INTEGER;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS question_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS negation_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS repetition_rate NUMERIC(4,3);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS turn_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS interruption_count INTEGER;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS favorite boolean DEFAULT false;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS speaking_share_ratio NUMERIC(4,3);

-- 7. VERIFY
-- ============================================================================
SELECT 'newsletter_subscribers' AS tbl FROM pg_tables WHERE tablename='newsletter_subscribers'
UNION ALL SELECT 'user_preferences' FROM pg_tables WHERE tablename='user_preferences'
UNION ALL SELECT 'ai_report_modules ('||(SELECT COUNT(*) FROM ai_report_modules)||' rows)' FROM pg_tables WHERE tablename='ai_report_modules'
UNION ALL SELECT 'ai_report_requests' FROM pg_tables WHERE tablename='ai_report_requests'
UNION ALL SELECT 'session_ai_reports' FROM pg_tables WHERE tablename='session_ai_reports'
UNION ALL SELECT 'sessions' FROM pg_tables WHERE tablename='sessions'
UNION ALL SELECT 'user_credits' FROM pg_tables WHERE tablename='user_credits'
UNION ALL SELECT 'user_tokens' FROM pg_tables WHERE tablename='user_tokens'
UNION ALL SELECT 'credit_transactions' FROM pg_tables WHERE tablename='credit_transactions'
UNION ALL SELECT 'token_transactions' FROM pg_tables WHERE tablename='token_transactions';
