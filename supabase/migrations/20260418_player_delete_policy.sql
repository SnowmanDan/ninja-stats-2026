-- 20260418_player_delete_policy.sql
--
-- Purpose:
--   Allow the anon role to DELETE from the players table so the
--   Roster Editor's remove-player flow can reach Supabase.
--
--   Note: the DB-level FK (game_stats.player_id ON DELETE RESTRICT)
--   is still in place — it will block deletion of any player who has
--   existing game_stats rows and return a foreign-key error (code 23503).
--   The app surfaces this to the coach with a friendly message.

alter table public.players enable row level security;

drop policy if exists "anon can delete players" on public.players;
create policy "anon can delete players"
  on public.players
  for delete
  to anon
  using (true);

-- Verify
select policyname, cmd
from pg_policies
where tablename = 'players'
order by cmd, policyname;
