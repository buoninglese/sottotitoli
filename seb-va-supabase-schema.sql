-- ============================================================================
-- Sebastian's VA — Supabase Schema
-- Personal project, separate from sottotitoli main project.
-- ============================================================================

-- ── User profile: preferences, goals, context ──────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name      TEXT,
  native_language   TEXT DEFAULT 'nl',       -- Dutch
  target_language   TEXT DEFAULT 'it',       -- Italian
  target_level      TEXT DEFAULT 'B1',       -- CEFR level goal
  daily_goal_minutes INTEGER DEFAULT 30,     -- target practice minutes per day
  interests         TEXT[] DEFAULT '{}',     -- topics of interest
  occupation        TEXT,                    -- for context-aware suggestions
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own profile
CREATE POLICY "Own profile access" ON profiles
  FOR ALL USING (auth.uid() = id);

-- ── Daily goals / tasks ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_goals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  title       TEXT NOT NULL,
  description TEXT,
  estimated_minutes INTEGER,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done','skipped')),
  priority    INTEGER DEFAULT 0,            -- 0=normal, 1=important, 2=urgent
  ai_suggested BOOLEAN DEFAULT false,       -- was this goal suggested by AI?
  completed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_daily_goals_user_date ON daily_goals(user_id, date);

ALTER TABLE daily_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own goals access" ON daily_goals
  FOR ALL USING (auth.uid() = user_id);

-- ── Conversation log: full transcripts for AI context ──────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at  TIMESTAMPTZ DEFAULT now(),
  ended_at    TIMESTAMPTZ,
  duration_seconds INTEGER,
  voice_id    TEXT,                         -- which Kokoro voice was used
  language    TEXT DEFAULT 'it',            -- conversation language
  summary     TEXT,                         -- AI-generated summary
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_conversations_user_date ON conversations(user_id, started_at DESC);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own conversations access" ON conversations
  FOR ALL USING (auth.uid() = user_id);

-- ── Individual messages within a conversation ──────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content         TEXT NOT NULL,
  tool_name       TEXT,                     -- if role=tool, which tool?
  tool_input      JSONB,                    -- tool call parameters
  audio_duration  REAL,                     -- seconds of audio for this turn
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_conv ON messages(conversation_id, created_at);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own messages access" ON messages
  FOR ALL USING (auth.uid() = user_id);

-- ── User vocabulary / words of interest ────────────────────────────────────
CREATE TABLE IF NOT EXISTS vocabulary (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word        TEXT NOT NULL,
  language    TEXT DEFAULT 'it',
  translation TEXT,                         -- translation to native language
  pos         TEXT,                         -- part of speech
  cefr_level  TEXT,                         -- A1-C2
  times_seen  INTEGER DEFAULT 1,
  last_seen   TIMESTAMPTZ DEFAULT now(),
  mastered    BOOLEAN DEFAULT false,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, word, language)
);

CREATE INDEX idx_vocabulary_user ON vocabulary(user_id, language);

ALTER TABLE vocabulary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own vocabulary access" ON vocabulary
  FOR ALL USING (auth.uid() = user_id);

-- ── User preferences / settings ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_settings (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme           TEXT DEFAULT 'dark' CHECK (theme IN ('light','dark','auto')),
  voice_id        TEXT DEFAULT 'af_heart',
  serper_key      TEXT,                     -- encrypted or stored in vault
  openai_key      TEXT,
  daily_overview_enabled BOOLEAN DEFAULT true,
  weather_city    TEXT DEFAULT 'Bari',
  weather_lat     REAL DEFAULT 41.1115,
  weather_lon     REAL DEFAULT 16.8554,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own settings access" ON user_settings
  FOR ALL USING (auth.uid() = user_id);

-- ── Weekly / monthly learning snapshots for progress tracking ──────────────
CREATE TABLE IF NOT EXISTS learning_snapshots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period      TEXT NOT NULL CHECK (period IN ('daily','weekly','monthly')),
  date        DATE NOT NULL,
  total_minutes     INTEGER DEFAULT 0,
  total_conversations INTEGER DEFAULT 0,
  unique_words_used INTEGER DEFAULT 0,
  new_words_added   INTEGER DEFAULT 0,
  goals_completed   INTEGER DEFAULT 0,
  goals_total       INTEGER DEFAULT 0,
  ai_summary        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, period, date)
);

CREATE INDEX idx_snapshots_user ON learning_snapshots(user_id, date DESC);

ALTER TABLE learning_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own snapshots access" ON learning_snapshots
  FOR ALL USING (auth.uid() = user_id);

-- ── Helper: auto-update updated_at ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_daily_goals_updated_at
  BEFORE UPDATE ON daily_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_user_settings_updated_at
  BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Helper: generate daily overview from goals ─────────────────────────────
CREATE OR REPLACE FUNCTION get_daily_overview(uid UUID)
RETURNS TEXT AS $$
DECLARE
  goal_count INTEGER;
  total_mins INTEGER;
  pending_titles TEXT[];
  overview TEXT;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(estimated_minutes), 0)
    INTO goal_count, total_mins
    FROM daily_goals
    WHERE user_id = uid AND date = CURRENT_DATE;

  SELECT ARRAY_AGG(title ORDER BY priority DESC, created_at)
    INTO pending_titles
    FROM daily_goals
    WHERE user_id = uid AND date = CURRENT_DATE AND status = 'pending';

  IF goal_count = 0 THEN
    overview := 'Pronto per una sessione di pratica. Di cosa vuoi parlare oggi?';
  ELSE
    overview := 'Oggi hai ' || goal_count || ' cose da fare';
    IF total_mins > 0 THEN
      overview := overview || ' (~' || total_mins || ' min totali)';
    END IF;
    overview := overview || '. ';
    IF pending_titles IS NOT NULL AND array_length(pending_titles, 1) > 0 THEN
      overview := overview || 'In programma: ' || array_to_string(pending_titles, ', ') || '.';
    END IF;
  END IF;

  RETURN overview;
END;
$$ LANGUAGE plpgsql;
