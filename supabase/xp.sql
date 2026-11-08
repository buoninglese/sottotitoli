-- ═══════════════════════════════════════════════════════════════
-- XP ledger — per-user backup of the Vocabulary Trainer's XP
-- (written by js/xp.js → XP.award / XP.sync, read back by XP.restore).
-- Columns mirror the trainer's localStorage store (sottotitoli-learner)
-- so a fresh device can restore the totals.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_xp (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp         INTEGER NOT NULL DEFAULT 0,
  today_xp   INTEGER NOT NULL DEFAULT 0,
  streak     INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;

-- Read own
DO $$ BEGIN
  CREATE POLICY "Users read own xp" ON user_xp
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN others THEN null; END $$;

-- Upsert own (insert)
DO $$ BEGIN
  CREATE POLICY "Users insert own xp" ON user_xp
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN others THEN null; END $$;

-- Update own
DO $$ BEGIN
  CREATE POLICY "Users update own xp" ON user_xp
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN others THEN null; END $$;
