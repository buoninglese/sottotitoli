-- ============================================================================
-- TRADUZIONE — Room System Migration
-- Safe to re-run any number of times. Uses DO blocks for idempotency.
-- ============================================================================

-- 1. ROOMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','live','ended','archived')),
  settings_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours')
);

-- 2. ROOM MEMBERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS room_members (
  id BIGSERIAL PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('owner','editor','speaker','viewer')),
  display_name TEXT NOT NULL,
  source_language TEXT DEFAULT 'en',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  UNIQUE (room_id, user_id)
);

-- 3. ROOM INVITES
-- ============================================================================
CREATE TABLE IF NOT EXISTS room_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,              -- SHA-256 of the invite token
  role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('editor','speaker','viewer')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours'),
  max_uses INTEGER DEFAULT 10,
  uses INTEGER NOT NULL DEFAULT 0,
  revoked_at TIMESTAMPTZ
);

-- 4. TRANSCRIPT SEGMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS transcript_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  speaker_member_id BIGINT REFERENCES room_members(id) ON DELETE SET NULL,
  sequence INTEGER NOT NULL,
  source_text TEXT NOT NULL,
  source_language TEXT DEFAULT 'en',
  is_final BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  UNIQUE (room_id, sequence)
);

-- 5. VOCABULARY ENTRIES (server-authoritative, replaces localStorage)
-- ============================================================================
CREATE TABLE IF NOT EXISTS vocabulary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lemma TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','learning','known','ignored')),
  definition TEXT,
  cefr TEXT,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, lemma, language)
);

-- ============================================================================
-- RLS — Row Level Security
-- ============================================================================
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_entries ENABLE ROW LEVEL SECURITY;

-- ROOMS: owner has full access; members can read live rooms
DO $$ BEGIN
  DROP POLICY IF EXISTS "Owner full access" ON rooms;
  CREATE POLICY "Owner full access" ON rooms FOR ALL
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Members read live rooms" ON rooms;
  CREATE POLICY "Members read live rooms" ON rooms FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM room_members
      WHERE room_members.room_id = rooms.id
      AND room_members.user_id = auth.uid()
      AND room_members.left_at IS NULL
    ));
EXCEPTION WHEN others THEN null; END $$;

-- ROOM_MEMBERS: owner can manage; members can read their own; members can update own row
DO $$ BEGIN
  DROP POLICY IF EXISTS "Owner manages members" ON room_members;
  CREATE POLICY "Owner manages members" ON room_members FOR ALL
    USING (EXISTS (
      SELECT 1 FROM rooms WHERE rooms.id = room_members.room_id AND rooms.owner_id = auth.uid()
    ));
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Members read room members" ON room_members;
  CREATE POLICY "Members read room members" ON room_members FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM room_members rm2
      WHERE rm2.room_id = room_members.room_id
      AND rm2.user_id = auth.uid()
      AND rm2.left_at IS NULL
    ));
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Members update own membership" ON room_members;
  CREATE POLICY "Members update own membership" ON room_members FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN others THEN null; END $$;

-- ROOM_INVITES: owner manages; members can read non-revoked invites
DO $$ BEGIN
  DROP POLICY IF EXISTS "Owner manages invites" ON room_invites;
  CREATE POLICY "Owner manages invites" ON room_invites FOR ALL
    USING (EXISTS (
      SELECT 1 FROM rooms WHERE rooms.id = room_invites.room_id AND rooms.owner_id = auth.uid()
    ));
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Members read active invites" ON room_invites;
  CREATE POLICY "Members read active invites" ON room_invites FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM room_members
      WHERE room_members.room_id = room_invites.room_id
      AND room_members.user_id = auth.uid()
      AND room_members.left_at IS NULL
    ) AND room_invites.revoked_at IS NULL);
EXCEPTION WHEN others THEN null; END $$;

-- TRANSCRIPT_SEGMENTS: members can read and insert
DO $$ BEGIN
  DROP POLICY IF EXISTS "Members read segments" ON transcript_segments;
  CREATE POLICY "Members read segments" ON transcript_segments FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM room_members
      WHERE room_members.room_id = transcript_segments.room_id
      AND room_members.user_id = auth.uid()
      AND room_members.left_at IS NULL
    ));
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Members insert segments" ON transcript_segments;
  CREATE POLICY "Members insert segments" ON transcript_segments FOR INSERT
    WITH CHECK (EXISTS (
      SELECT 1 FROM room_members
      WHERE room_members.room_id = transcript_segments.room_id
      AND room_members.user_id = auth.uid()
      AND room_members.left_at IS NULL
      AND room_members.role IN ('owner','editor','speaker')
    ));
EXCEPTION WHEN others THEN null; END $$;

-- VOCABULARY_ENTRIES: users manage only their own
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users manage own vocabulary" ON vocabulary_entries;
  CREATE POLICY "Users manage own vocabulary" ON vocabulary_entries FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN others THEN null; END $$;
