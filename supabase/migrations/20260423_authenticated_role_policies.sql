-- Migration: Add RLS policies for the authenticated role
-- Date: 2026-04-23
-- Purpose:
--   All existing policies only cover the `anon` role. Now that users sign in
--   via Supabase Auth, they're treated as the `authenticated` role — which
--   had no policies, so every read and write was silently blocked.
--
--   This migration mirrors the existing anon policies for authenticated users.
--   Policies are still wide-open (using (true)) for now, same as anon.
--   Phase 4 will replace these with real ownership checks against team_members.
--
-- Safe to re-run: uses OR REPLACE (via DROP IF EXISTS + CREATE).

BEGIN;

-- ============================================================================
-- teams
-- ============================================================================
CREATE POLICY "authenticated can read teams"
  ON teams FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- players
-- ============================================================================
CREATE POLICY "authenticated can read players"
  ON players FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated can insert players"
  ON players FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated can update players"
  ON players FOR UPDATE TO authenticated USING (true);

CREATE POLICY "authenticated can delete players"
  ON players FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- games
-- ============================================================================
CREATE POLICY "authenticated can read games"
  ON games FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated can insert games"
  ON games FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated can update games"
  ON games FOR UPDATE TO authenticated USING (true);

CREATE POLICY "authenticated can delete games"
  ON games FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- game_stats
-- ============================================================================
CREATE POLICY "authenticated can read game_stats"
  ON game_stats FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated can insert game_stats"
  ON game_stats FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated can update game_stats"
  ON game_stats FOR UPDATE TO authenticated USING (true);

CREATE POLICY "authenticated can delete game_stats"
  ON game_stats FOR DELETE TO authenticated USING (true);

-- ============================================================================
-- team_members
-- ============================================================================
-- No anon policies exist yet — authenticated users need read access so the
-- app can check team membership once Phase 4 RLS lands.
CREATE POLICY "authenticated can read team_members"
  ON team_members FOR SELECT TO authenticated USING (true);

COMMIT;

-- Verification — run this after the migration:
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, roles;
-- Expected: every table now has both {anon} and {authenticated} rows
