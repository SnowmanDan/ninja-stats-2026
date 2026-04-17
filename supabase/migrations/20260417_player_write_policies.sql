-- 20260417_player_write_policies.sql
--
-- Purpose:
--   Allow the RosterEditor to INSERT new players and UPDATE existing ones.
--   Without these, Supabase RLS blocks writes and returns a 401.
--
-- Scope:
--   Pre-auth app. Using (true) / with check (true) permits the anon role
--   unconditionally. Tighten to ownership checks when auth lands.

-- 1. Ensure RLS is on.
alter table public.players enable row level security;

-- 2. INSERT policy — allows adding new players with a team_id.
drop policy if exists "anon can insert players" on public.players;
create policy "anon can insert players"
  on public.players
  for insert
  to anon
  with check (true);

-- 3. UPDATE policy — allows editing name and number on existing players.
drop policy if exists "anon can update players" on public.players;
create policy "anon can update players"
  on public.players
  for update
  to anon
  using (true)
  with check (true);

-- 4. Verify.
--   Expect two rows for players: INSERT and UPDATE.
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where tablename = 'players'
order by policyname;
