-- 20260426_games_delete_policy.sql
--
-- Purpose:
--   Add the missing DELETE policy on games so coaches can remove games
--   from the Game History screen.
--
-- Note:
--   using (true) is intentionally wide for the pre-auth app (anon role).
--   Tighten to a team_members ownership check in Phase 4 alongside the
--   other RLS rewrites.

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon can delete games" ON public.games;
CREATE POLICY "anon can delete games"
  ON public.games
  FOR DELETE
  TO anon
  USING (true);
