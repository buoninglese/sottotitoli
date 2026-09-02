-- ============================================================================
-- 2026-09-02 — Fix user_wordbank_words drift vs live schema
-- ============================================================================
-- Live table was missing columns the app expects + the UNIQUE(wordbank_id, word)
-- constraint that upserts (onConflict 'wordbank_id,word') rely on.
-- (Migration 20260803_fix_wordbank_words_columns.sql was never applied on live.)
-- Idempotent. Applied to live via Management API 2026-09-02.
-- ============================================================================

-- 1. Missing columns (additive, safe)
ALTER TABLE user_wordbank_words ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'learning';
ALTER TABLE user_wordbank_words ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE user_wordbank_words ADD COLUMN IF NOT EXISTS cefr_level TEXT;

-- 2. Dedupe existing (wordbank_id, word) pairs — keep the newest row
--    (6 duplicate groups found on live before this migration)
DELETE FROM user_wordbank_words a
USING user_wordbank_words b
WHERE a.wordbank_id = b.wordbank_id
  AND a.word = b.word
  AND (a.created_at < b.created_at OR (a.created_at IS NOT DISTINCT FROM b.created_at AND a.id < b.id));

-- 3. Unique index enabling upserts with onConflict 'wordbank_id,word'
CREATE UNIQUE INDEX IF NOT EXISTS user_wordbank_words_bank_word_key
  ON user_wordbank_words (wordbank_id, word);

-- 4. VERIFY
-- SELECT COUNT(*) FROM (SELECT wordbank_id, word FROM user_wordbank_words GROUP BY 1,2 HAVING COUNT(*)>1) d; -- expect 0
