-- Migration: Tighten RLS — replace wide-open authenticated policies
-- Date: 2026-04-26
-- Purpose:
--   Replace every `using (true)` policy for the `authenticated` role with
--   real ownership checks against `team_members`. After this migration:
--     - Users can only read data for teams they belong to
--     - Users can only write (insert/update/delete) on teams where their
--       role is 'owner' or 'coach'
--     - The team dropdown automatically shows only their teams (no UI change)
--
-- Strategy:
--   DROP the existing wide-open authenticated policies, then CREATE new
--   ones with proper checks. anon policies are left untouched — they'll
--   be reviewed separately when we decide whether anon access is needed.
--
-- Note on game_stats:
--   game_stats has no team_id column. To check team membership we join
--   through games → team_members. This is slightly more expensive but
--   correct; a future optimization can add a team_id column to game_stats.
--
-- Safe to re-run:
--   DROP IF EXISTS guards prevent errors if policies don't exist.

BEGIN;

-- ============================================================================
-- 1. teams
-- ============================================================================

DROP POLICY IF EXISTS "authenticated can read teams"   ON teams;
DROP POLICY IF EXISTS "authenticated can insert teams"  ON teams;
DROP POLICY IF EXISTS "authenticated can update teams"  ON teams;
DROP POLICY IF EXISTS "authenticated can delete teams"  ON teams;

-- SELECT: only teams where the user has a team_members row
CREATE POLICY "authenticated can read teams"
  ON teams FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- INSERT: the user must set themselves as owner
CREATE POLICY "authenticated can insert teams"
  ON teams FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- UPDATE/DELETE: only the owner
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
-- 2. players
-- ============================================================================

DROP POLICY IF EXISTS "authenticated can read players"   ON players;
DROP POLICY IF EXISTS "authenticated can insert players"  ON players;
DROP POLICY IF EXISTS "authenticated can update players"  ON players;
DROP POLICY IF EXISTS "authenticated can delete players"  ON players;

-- SELECT: any member of the team can see the roster
CREATE POLICY "authenticated can read players"
  ON players FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE: coach or owner only
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
-- 3. games
-- ============================================================================

DROP POLICY IF EXISTS "authenticated can read games"   ON games;
DROP POLICY IF EXISTS "authenticated can insert games"  ON games;
DROP POLICY IF EXISTS "authenticated can update games"  ON games;
DROP POLICY IF EXISTS "authenticated can delete games"  ON games;

-- SELECT: any member of the team
CREATE POLICY "authenticated can read games"
  ON games FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE: coach or owner only
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
-- 4. game_stats
-- ============================================================================
-- No team_id on this table — check membership by joining through games.

DROP POLICY IF EXISTS "authenticated can read game_stats"   ON game_stats;
DROP POLICY IF EXISTS "authenticated can insert game_stats"  ON game_stats;
DROP POLICY IF EXISTS "authenticated can update game_stats"  ON game_stats;
DROP POLICY IF EXISTS "authenticated can delete game_stats"  ON game_stats;

-- SELECT: any member of the team that owns the game
CREATE POLICY "authenticated can read game_stats"
  ON game_stats FOR SELECT TO authenticated
  USING (
    game_id IN (
      SELECT g.id FROM games g
      JOIN team_members tm ON tm.team_id = g.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE: coach or owner of the game's team
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
-- 5. team_members
-- ============================================================================

DROP POLICY IF EXISTS "authenticated can read team_members" ON team_members;

-- SELECT: see members of any team you belong to
CREATE POLICY "authenticated can read team_members"
  ON team_members FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- INSERT: users can only add themselves (for TeamCreator flow).
-- The invite flow (Phase 4) will expand this when it lands.
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
-- Expected: no policy should have 'using (true)' for authenticated role
-- (check the Supabase policy editor UI to visually confirm the USING clauses)
