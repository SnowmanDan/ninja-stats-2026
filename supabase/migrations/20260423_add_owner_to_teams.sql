-- Migration: Add owner_id to teams
-- Date: 2026-04-23
-- Purpose:
--   Track which user created/owns each team. The owner is distinct from
--   team_members — they're the one who can delete the team, manage billing,
--   and invite or remove other members.
--
--   Nullable for now because existing teams predate auth. When a new team is
--   created through the app after auth lands, owner_id gets set to the
--   creating user's auth.uid().
--
-- Safe to re-run:
--   Uses IF NOT EXISTS guard.

BEGIN;

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS owner_id UUID;  -- will reference auth.users.id

COMMIT;

-- Verification — copy and run this after the migration:
SELECT id, name, owner_id
FROM teams
ORDER BY id;
-- Expected: all rows present, owner_id NULL for existing teams (Ninjas, Inter Milan)
