-- ============================================================================
-- 2026-09-02 — Fix RLS infinite recursion on Traduzione room tables
-- ============================================================================
-- ROOT CAUSE: policies on rooms/room_members/room_invites/transcript_segments
-- referenced each other through subqueries, and every subquery re-evaluates the
-- target table's own RLS → infinite recursion:
--   rooms SELECT → EXISTS(room_members …)  → room_members policy → EXISTS(rooms …) → ∞
-- Live symptom (any query on these tables): 400 "infinite recursion detected in
-- policy for relation room_members/rooms".
--
-- FIX: SECURITY DEFINER helpers (run as table owner → bypass RLS on the queried
-- tables) evaluated inside the policies. Same row-level semantics as before.
--
-- Safe to re-run. Run via `supabase db push` or in the SQL editor.
-- ============================================================================

-- ── Helpers (SECURITY DEFINER = no RLS re-evaluation inside) ──
CREATE OR REPLACE FUNCTION public.is_room_member(p_room_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = p_room_id
      AND user_id = auth.uid()
      AND left_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_room_owner(p_room_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rooms
    WHERE id = p_room_id
      AND owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_contribute_to_room(p_room_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = p_room_id
      AND user_id = auth.uid()
      AND left_at IS NULL
      AND role IN ('owner','editor','speaker')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_room_member(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_room_owner(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.can_contribute_to_room(UUID) TO authenticated, anon;

-- ── ROOMS ──
DO $$ BEGIN
  DROP POLICY IF EXISTS "Members read live rooms" ON rooms;
  CREATE POLICY "Members read live rooms" ON rooms FOR SELECT
    USING (public.is_room_member(id));
EXCEPTION WHEN others THEN null; END $$;

-- ── ROOM_MEMBERS ──
DO $$ BEGIN
  DROP POLICY IF EXISTS "Owner manages members" ON room_members;
  CREATE POLICY "Owner manages members" ON room_members FOR ALL
    USING (public.is_room_owner(room_id));
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Members read room members" ON room_members;
  CREATE POLICY "Members read room members" ON room_members FOR SELECT
    USING (public.is_room_member(room_id));
EXCEPTION WHEN others THEN null; END $$;

-- "Members update own membership" is already non-recursive (user_id = auth.uid()) — keep as is.

-- ── ROOM_INVITES ──
DO $$ BEGIN
  DROP POLICY IF EXISTS "Owner manages invites" ON room_invites;
  CREATE POLICY "Owner manages invites" ON room_invites FOR ALL
    USING (public.is_room_owner(room_id));
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Members read active invites" ON room_invites;
  CREATE POLICY "Members read active invites" ON room_invites FOR SELECT
    USING (public.is_room_member(room_id) AND room_invites.revoked_at IS NULL);
EXCEPTION WHEN others THEN null; END $$;

-- ── TRANSCRIPT_SEGMENTS ──
DO $$ BEGIN
  DROP POLICY IF EXISTS "Members read segments" ON transcript_segments;
  CREATE POLICY "Members read segments" ON transcript_segments FOR SELECT
    USING (public.is_room_member(room_id));
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Members insert segments" ON transcript_segments;
  CREATE POLICY "Members insert segments" ON transcript_segments FOR INSERT
    WITH CHECK (public.can_contribute_to_room(room_id));
EXCEPTION WHEN others THEN null; END $$;

-- ── VERIFY (expect 0 rows returned from the policy evaluation itself) ──
-- SELECT count(*) FROM rooms;             -- should no longer error
-- SELECT count(*) FROM room_members;      -- should no longer error
-- SELECT count(*) FROM room_invites;      -- should no longer error
-- SELECT count(*) FROM transcript_segments; -- should no longer error
