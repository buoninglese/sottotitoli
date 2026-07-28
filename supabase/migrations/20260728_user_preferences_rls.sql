-- ═══ user_preferences RLS policies ═══
-- RLS is enabled but no policies exist — this blocks all read/write for authenticated users.
-- Run in Supabase SQL Editor or via supabase db push.

-- Allow users to read their own preferences
DROP POLICY IF EXISTS "Users can read own preferences" ON public.user_preferences;
CREATE POLICY "Users can read own preferences"
  ON public.user_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow users to insert their own preferences
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow users to update their own preferences
DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
CREATE POLICY "Users can update own preferences"
  ON public.user_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow anon to insert (for first-time setup before auth is fully resolved)
DROP POLICY IF EXISTS "Allow anon insert" ON public.user_preferences;
CREATE POLICY "Allow anon insert"
  ON public.user_preferences
  FOR INSERT
  TO anon
  WITH CHECK (true);
