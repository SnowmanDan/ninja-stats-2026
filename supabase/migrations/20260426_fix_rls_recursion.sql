-- Migration: Fix infinite recursion in RLS policies
-- Date: 2026-04-26
-- Purpose:
--   The previous migration (20260426_tighten_rls.sql) caused infinite recursion
--   because the team_members SELECT policy queries team_members to check itself:
--
--     USING (team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()))
--
--   Querying team_members fires the policy → policy queries team_members → infinite loop.
--   The same recursion happens in all other tables whose policies reference team_members.
--
-- Fix:
--   Create a SECURITY DEFINER function get_my_team_ids() that reads team_members
--   without triggering RLS (security definer functions bypass row-level security).
--   Replace every direct team_members subquery in policies with this function.
--
-- Safe to re-run:
--   CREATE OR REPLACE on the function; DROP IF EXISTS + CREATE on all policies.

BEGIN;

-- ============================================================================
-- 1. Helper function — bypasses RLS to get current user's team IDs
-- ============================================================================
CREATE OR REPLACE FUNCTION get_my_team_ids()
RETURNS SETOF integer
LANGUAGE sql
SECURITY DEFINER  -- runs as the function owner (postgres), not the calling user
STABLE            -- same result within a single query; allows caching
AS $$
  SELECT team_id FROM team_members WHERE user_id = auth.uid()
$$;

-- ============================================================================
-- 2. teams — rewrite policies to use the helper function
-- ============================================================================

DROP POLICY IF EXISTS "authenticated can read teams"   ON teams;
DROP POLICY IF EXISTS "authenticated can insert teams"  ON teams;
DROP POLICY IF EXISTS "authenticated can update teams"  ON teams;
DROP POLICY IF EXISTS "authenticated can delete teams"  ON teams;

CREATE POLICY "authenticated can read teams"
  ON teams FOR SELECT TO authenticated
  USING (
    id IN (SELECT get_my_team_ids())
    OR owner_id = auth.uid()  -- allows selecting a team you just created, before team_members row exists
  );

CREATE POLICY "authenticated can insert teams"
  ON teams FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "authenticated can update teams"
  ON teams FOR UPDATE TO authenticated
  USING (
    id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "authenticated can delete teams"
  ON teams FOR DELETE TO authenticated
  USING (
    id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================================================
-- 3. players
-- ============================================================================

DROP POLICY IF EXISTS "authenticated can read players"   ON players;
DROP POLICY IF EXISTS "authenticated can insert players"  ON players;
DROP POLICY IF EXISTS "authenticated can update players"  ON players;
DROP POLICY IF EXISTS "authenticated can delete players"  ON players;

CREATE POLICY "authenticated can read players"
  ON players FOR SELECT TO authenticated
  USING (team_id IN (SELECT get_my_team_ids()));

CREATE POLICY "authenticated can insert players"
  ON players FOR INSERT TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'coach')
    )
  );

CREATE POLICY "authenticated can update players"
  ON players FOR UPDATE TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'coach')
    )
  );

CREATE POLICY "authenticated can delete players"
  ON players FOR DELETE TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'coach')
    )
  );

-- ============================================================================
-- 4. games
-- ============================================================================

DROP POLICY IF EXISTS "authenticated can read games"   ON games;
DROP POLICY IF EXISTS "authenticated can insert games"  ON games;
DROP POLICY IF EXISTS "authenticated can update games"  ON games;
DROP POLICY IF EXISTS "authenticated can delete games"  ON games;

CREATE POLICY "authenticated can read games"
  ON games FOR SELECT TO authenticated
  USING (team_id IN (SELECT get_my_team_ids()));

CREATE POLICY "authenticated can insert games"
  ON games FOR INSERT TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'coach')
    )
  );

CREATE POLICY "authenticated can update games"
  ON games FOR UPDATE TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'coach')
    )
  );

CREATE POLICY "authenticated can delete games"
  ON games FOR DELETE TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'coach')
    )
  );

-- ============================================================================
-- 5. game_stats
-- ============================================================================

DROP POLICY IF EXISTS "authenticated can read game_stats"   ON game_stats;
DROP POLICY IF EXISTS "authenticated can insert game_stats"  ON game_stats;
DROP POLICY IF EXISTS "authenticated can update game_stats"  ON game_stats;
DROP POLICY IF EXISTS "authenticated can delete game_stats"  ON game_stats;

CREATE POLICY "authenticated can read game_stats"
  ON game_stats FOR SELECT TO authenticated
  USING (
    game_id IN (
      SELECT g.id FROM games g
      WHERE g.team_id IN (SELECT get_my_team_ids())
    )
  );

CREATE POLICY "authenticated can insert game_stats"
  ON game_stats FOR INSERT TO authenticated
  WITH CHECK (
    game_id IN (
      SELECT g.id FROM games g
      JOIN team_members tm ON tm.team_id = g.team_id
      WHERE tm.user_id = auth.uid() AND tm.role IN ('owner', 'coach')
    )
  );

CREATE POLICY "authenticated can update game_stats"
  ON game_stats FOR UPDATE TO authenticated
  USING (
    game_id IN (
      SELECT g.id FROM games g
      JOIN team_members tm ON tm.team_id = g.team_id
      WHERE tm.user_id = auth.uid() AND tm.role IN ('owner', 'coach')
    )
  );

CREATE POLICY "authenticated can delete game_stats"
  ON game_stats FOR DELETE TO authenticated
  USING (
    game_id IN (
      SELECT g.id FROM games g
      JOIN team_members tm ON tm.team_id = g.team_id
      WHERE tm.user_id = auth.uid() AND tm.role IN ('owner', 'coach')
    )
  );

-- ============================================================================
-- 6. team_members — use helper function to break the recursion
-- ============================================================================

DROP POLICY IF EXISTS "authenticated can read team_members"   ON team_members;
DROP POLICY IF EXISTS "authenticated can insert team_members" ON team_members;

-- SELECT: see members of any team you belong to (uses helper, no recursion)
CREATE POLICY "authenticated can read team_members"
  ON team_members FOR SELECT TO authenticated
  USING (team_id IN (SELECT get_my_team_ids()));

-- INSERT: users can only add themselves (TeamCreator flow)
CREATE POLICY "authenticated can insert team_members"
  ON team_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

COMMIT;

-- Verification — run after the migration:
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND 'authenticated' = ANY(roles)
ORDER BY tablename, cmd;
