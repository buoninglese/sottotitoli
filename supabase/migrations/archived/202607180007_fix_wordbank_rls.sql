-- Fix: add WITH CHECK clause so INSERT into user_wordbank_words works
-- The previous policy only had USING which covers SELECT/UPDATE/DELETE
-- but INSERT needs WITH CHECK (or FOR ALL with both USING + WITH CHECK)

DROP POLICY IF EXISTS "Users manage own wordbank words" ON user_wordbank_words;
CREATE POLICY "Users manage own wordbank words" ON user_wordbank_words FOR ALL
  USING (EXISTS (SELECT 1 FROM user_wordbanks wb WHERE wb.id = wordbank_id AND wb.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM user_wordbanks wb WHERE wb.id = wordbank_id AND wb.user_id = auth.uid()));

-- Also fix the same issue on user_wordbanks if present
DROP POLICY IF EXISTS "Users manage own wordbanks" ON user_wordbanks;
CREATE POLICY "Users manage own wordbanks" ON user_wordbanks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
