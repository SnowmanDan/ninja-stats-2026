-- Migration: Create invites table for Phase 4 email invite flow
-- Date: 2026-04-27
--
-- Flow:
--   1. Owner/coach INSERTs an invite row (auto-generates token + expiry)
--   2. App calls signInWithOtp with emailRedirectTo pointing to /accept-invite?token=...
--   3. Invitee clicks the magic link → authenticated + token in URL
--   4. AcceptInvite component looks up the invite, INSERTs team_members, marks accepted
--
-- RLS summary:
--   SELECT  — team members (to see pending invites) OR email matches current user (for acceptance)
--   INSERT  — owners and coaches only
--   UPDATE  — invitee only (to mark accepted_at)
--   DELETE  — owners and coaches only (to cancel pending invites)

BEGIN;

CREATE TABLE IF NOT EXISTS invites (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     integer     NOT NULL REFERENCES teams(id),
  email       text        NOT NULL,
  role        text        NOT NULL DEFAULT 'parent',
  token       uuid        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  invited_by  uuid        NOT NULL REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,                                          -- null = still pending
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '7 days'),

  CONSTRAINT invites_role_check CHECK (role IN ('coach', 'parent', 'viewer'))
);

-- One pending invite per email per team (case-insensitive email match)
CREATE UNIQUE INDEX IF NOT EXISTS invites_team_email_pending
  ON invites (team_id, lower(email))
  WHERE accepted_at IS NULL;

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Team members can see pending invites for their teams;
-- invitees can read their own invite (needed for the acceptance lookup by token)
CREATE POLICY "read invites"
  ON invites FOR SELECT TO authenticated
  USING (
    team_id IN (SELECT get_my_team_ids())
    OR lower(email) = lower(auth.jwt() ->> 'email')
  );

-- Owners and coaches can send invites
CREATE POLICY "owners and coaches can insert invites"
  ON invites FOR INSERT TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'coach')
    )
  );

-- Invitees can mark their own invite as accepted
CREATE POLICY "invitees can accept"
  ON invites FOR UPDATE TO authenticated
  USING  (lower(email) = lower(auth.jwt() ->> 'email'))
  WITH CHECK (lower(email) = lower(auth.jwt() ->> 'email'));

-- Owners and coaches can cancel (delete) pending invites
CREATE POLICY "owners and coaches can delete invites"
  ON invites FOR DELETE TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'coach')
    )
  );

COMMIT;

-- Verification:
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'invites'
ORDER BY cmd;
