-- 20260418_game_edit_policies.sql
--
-- Purpose:
--   Allow the game edit flow in GameLogger to UPDATE existing game rows.
--   The edit flow does: UPDATE games + DELETE game_stats + INSERT game_stats.
--   DELETE on game_stats and INSERT on game_stats already work (existing policies).
--   Only UPDATE on games is missing.

alter table public.games enable row level security;

drop policy if exists "anon can update games" on public.games;
create policy "anon can update games"
  on public.games
  for update
  to anon
  using (true)
  with check (true);

-- Verify
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where tablename = 'games'
order by policyname;
