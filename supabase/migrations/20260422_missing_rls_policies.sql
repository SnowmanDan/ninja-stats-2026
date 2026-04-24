-- 20260422_missing_rls_policies.sql
--
-- Purpose:
--   Add missing RLS policies that were not included in earlier migrations.
--   These are required for the app to function correctly with RLS enabled.
--
-- What was missing:
--   - SELECT policies on all tables (RLS blocks reads without an explicit policy)
--   - INSERT policy on games (needed to create new games)
--   - INSERT, UPDATE, DELETE policies on game_stats (needed to save stats)
--   - RLS was not enabled on teams and game_stats tables

-- Enable RLS on tables that were missing it
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_stats ENABLE ROW LEVEL SECURITY;

-- SELECT policies — allow anyone to read all tables
CREATE POLICY "anon can read teams"       ON public.teams       FOR SELECT TO anon USING (true);
CREATE POLICY "anon can read players"     ON public.players     FOR SELECT TO anon USING (true);
CREATE POLICY "anon can read games"       ON public.games       FOR SELECT TO anon USING (true);
CREATE POLICY "anon can read game_stats"  ON public.game_stats  FOR SELECT TO anon USING (true);

-- Games write policies
CREATE POLICY "anon can insert games"     ON public.games       FOR INSERT TO anon WITH CHECK (true);

-- game_stats write policies
CREATE POLICY "anon can insert game_stats" ON public.game_stats FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon can update game_stats" ON public.game_stats FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon can delete game_stats" ON public.game_stats FOR DELETE TO anon USING (true);
