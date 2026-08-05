-- ═══════════════════════════════════════════════════════════
-- Security Hardening — Fix Supabase Advisory Issues
-- Run in: https://supabase.com/dashboard/project/qzqmuegbpmvqrjrlfbgk/sql/new
-- ═══════════════════════════════════════════════════════════

-- ── 1. REVOKE public execute on SECURITY DEFINER functions ──
--    (only authenticated users should call these)

REVOKE EXECUTE ON FUNCTION public.allocate_room_sequence FROM public;
REVOKE EXECUTE ON FUNCTION public.cleanup_unsaved_sessions FROM public;
REVOKE EXECUTE ON FUNCTION public.create_final_segment FROM public;
REVOKE EXECUTE ON FUNCTION public.ensure_looked_up_words_bank FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user FROM public;
REVOKE EXECUTE ON FUNCTION public.increment_vocab_usage FROM public;
REVOKE EXECUTE ON FUNCTION public.join_room_with_invite FROM public;
REVOKE EXECUTE ON FUNCTION public.save_looked_up_word FROM public;
REVOKE EXECUTE ON FUNCTION public.save_word_to_bank FROM public;

GRANT EXECUTE ON FUNCTION public.allocate_room_sequence TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_unsaved_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_final_segment TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_looked_up_words_bank TO authenticated;
-- handle_new_user is a trigger only — do NOT regrant
GRANT EXECUTE ON FUNCTION public.increment_vocab_usage TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_room_with_invite TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_looked_up_word TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_word_to_bank TO authenticated;

-- ── 2. Add explicit search_path to older SECURITY DEFINER functions ──

ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.cleanup_unsaved_sessions() SET search_path = public;
ALTER FUNCTION public.increment_vocab_usage(p_user_id uuid, p_lang text, p_words text[]) SET search_path = public;

-- ── 3. Fix SECURITY DEFINER functions that don't verify auth.uid() ──

-- allocate_room_sequence: add auth check
CREATE OR REPLACE FUNCTION public.allocate_room_sequence(p_room_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allocated bigint;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;
  INSERT INTO public.room_counters(room_id, next_sequence)
  VALUES (p_room_id, 2)
  ON CONFLICT (room_id)
  DO UPDATE SET next_sequence = public.room_counters.next_sequence + 1
  RETURNING next_sequence - 1 INTO allocated;
  RETURN allocated;
END;
$$;

-- increment_vocab_usage: verify p_user_id matches auth.uid()
CREATE OR REPLACE FUNCTION public.increment_vocab_usage(
  p_user_id UUID,
  p_lang TEXT,
  p_words TEXT[]
) RETURNS void AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;
  UPDATE user_vocabulary
  SET usage_count = usage_count + 1,
      last_used = now()
  WHERE user_id = p_user_id
    AND lang = p_lang
    AND word = ANY(p_words);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ── 4. Verify ──

SELECT 'Dictionary cache RLS' AS check_item;
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'dictionary_cache';

SELECT 'Function grants' AS check_item;
SELECT
  p.proname,
  (aclexplode(proacl)).grantee::regrole AS grantee,
  (aclexplode(proacl)).privilege_type
FROM pg_proc p
WHERE proname IN (
  'allocate_room_sequence','cleanup_unsaved_sessions','create_final_segment',
  'ensure_looked_up_words_bank','handle_new_user','increment_vocab_usage',
  'join_room_with_invite','save_looked_up_word','save_word_to_bank'
)
ORDER BY p.proname;
