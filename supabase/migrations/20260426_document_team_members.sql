-- 20260426_document_team_members.sql
--
-- Purpose:
--   Document the `team_members` table that was created manually in both dev
--   and prod Supabase outside of the migration workflow.
--
--   This migration is safe to run: all statements use IF NOT EXISTS / IF NOT
--   EXISTS guards, so running it against a DB that already has the table is a
--   no-op.
--
-- State as of 2026-04-26:
--   dev  — table exists; one RLS policy: "authenticated can read team_members"
--           (SELECT, authenticated role, using (true))
--   prod — table exists; NO RLS policies (gap — see note below)
--
-- What this migration does:
--   1. Creates the table if it doesn't exist
--   2. Adds FK constraints if they don't exist
--   3. Enables RLS
--   4. Creates the SELECT policy for authenticated users (matches dev)
--
-- ⚠️  PROD GAP: prod is missing the SELECT policy. Apply this migration in the
--   prod SQL editor to bring it in line with dev. Until then, authenticated
--   users cannot read team_members in production, which will block Phase 4
--   auth flows.
--
-- Future (Phase 4):
--   Replace the SELECT using (true) with a scoped check, e.g.:
--     using (user_id = auth.uid())
--   And add INSERT / UPDATE / DELETE policies once the auth flow is wired up.

BEGIN;

-- ============================================================================
-- 1. Create the table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.team_members (
  id          SERIAL PRIMARY KEY,
  user_id     UUID        NOT NULL,
  team_id     INTEGER     NOT NULL,
  role        TEXT        NOT NULL DEFAULT 'parent',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. Foreign keys
-- ============================================================================
-- user_id → auth.users (Supabase manages this schema)
ALTER TABLE public.team_members
  DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;
ALTER TABLE public.team_members
  ADD CONSTRAINT team_members_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- team_id → teams
ALTER TABLE public.team_members
  DROP CONSTRAINT IF EXISTS team_members_team_id_fkey;
ALTER TABLE public.team_members
  ADD CONSTRAINT team_members_team_id_fkey
  FOREIGN KEY (team_id)
  REFERENCES public.teams(id)
  ON DELETE CASCADE;

-- ============================================================================
-- 3. Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS team_members_user_id_idx  ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS team_members_team_id_idx  ON public.team_members(team_id);

-- Unique: one membership row per (user, team)
CREATE UNIQUE INDEX IF NOT EXISTS team_members_user_team_uidx
  ON public.team_members(user_id, team_id);

-- ============================================================================
-- 4. RLS
-- ============================================================================
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated users can read the memberships table.
-- using (true) is intentionally wide for now — tighten to
-- using (user_id = auth.uid()) once the auth flow is tested end-to-end.
DROP POLICY IF EXISTS "authenticated can read team_members" ON public.team_members;
CREATE POLICY "authenticated can read team_members"
  ON public.team_members
  FOR SELECT
  TO authenticated
  USING (true);

COMMIT;

-- ============================================================================
-- Verification queries
-- ============================================================================
-- Confirm the table and constraints:
--   \d public.team_members
--
-- Confirm RLS policies:
--   SELECT policyname, cmd, roles, qual
--   FROM pg_policies
--   WHERE tablename = 'team_members';
--
-- Expected: one row — "authenticated can read team_members", SELECT
