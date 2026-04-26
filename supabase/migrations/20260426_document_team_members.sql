-- 20260426_document_team_members.sql
--
-- Purpose:
--   Add the FK from team_members.user_id → auth.users that was intentionally
--   omitted from 20260423_auth_prep.sql to keep that migration simple.
--
--   The team_members table itself was created by auth_prep. This migration
--   only adds the auth constraint and is safe to re-run (DROP IF EXISTS guard).
--
-- Applies to:
--   Both dev and prod. The table exists in both; neither has this FK yet.

ALTER TABLE public.team_members
  DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;

ALTER TABLE public.team_members
  ADD CONSTRAINT team_members_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;
