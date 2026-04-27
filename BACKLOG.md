# Ninja Stats — Backlog

## In Progress

_Nothing in progress — pick something from Up Next!_

---

## Up Next

### From Jira (SS-2 through SS-18)
- **SS-2** — Add metadata field to differentiate between seasons
- **SS-3** — Skins: ESPN, Popcorn, Mario, KPOP (theme switcher)
- **SS-9** — When player name selected on logging screen, auto scroll down to event buttons
- **SS-10** — Add guide for event logging
- **SS-11** — Add welcome guide for new users
- **SS-12** — Move back to previous screen after selecting event; move to score
- **SS-16** — Increase brightness of name font in event logger
- **SS-18** — Maybe select which players are present before logging starts

### Phase 4 — Auth (in progress)
- **Invite by email** — coach enters an email, app sends a magic link that auto-adds the user to the team with a role (coach vs. viewer); needs an invites table, invite token, and role assignment on accept

### Other
- **iPhone email autofill** — add `autocomplete="email"` to all email inputs (Login, invite form) so iOS can prefill from saved contacts/keychain
- PWA offline support (Phase 3 — offline event queue, IndexedDB)
- Timestamps on game events (Phase 2 — `game_events` table)
- Substitution tracking
- Player position tracking
- **Cookie-based session storage** — switch Supabase client's session storage from localStorage to cookies so magic link auth works when opening the app from the iOS home screen (PWA standalone mode); localStorage is not shared between Safari and the installed PWA, cookies are

---

## Done

- React migration (Phase 0)
- Live game logger with event tracking (Phase 1)
- Multi-team support
- Roster management (add / edit / delete players)
- Swipe-to-edit/delete on game history rows
- Tap game row to view that game's stats
- Season Totals: Goals, Assists, Shots, Tackles, Saves (horizontally scrollable)
- Game timer with play/pause/reset
- Compact header on logger and roster screens
- Game notes on logging screen
- Dev/prod Supabase environment setup (separate projects, env vars, Vercel Preview vs Production)
- PWA — installable via "Add to Home Screen", service worker caching, app icon
- Cloud dev workflow: edit on GitHub with Copilot → push to `dev` → test Preview URL → merge to `main`
- Countdown timer with configurable half length (replaces count-up)
- Collapsible Event Guide on logger screen
- Auto-capitalize opponent name field
- Game photo — upload from mobile, SVG camera icon in Game History, tap to view modal (SS-15)
- Supabase storage RLS scoped to game-photos bucket only
- Auth prep — created_at on all tables, team_members table, created_by/owner_id columns
- Magic link sign-in (Phase 4 start) — Login screen, auth gate, sign-out button, authenticated RLS policies
- Wire up `created_by` / `owner_id` — new games and players stamped with creating user's ID; existing teams backfilled via SQL
- Team creation flow — new users create their own team via UI; added to team_members as owner
- Tighten RLS — ownership checks via get_my_team_ids() security definer function; coaches/owners write, parents/viewers read-only
- Team Settings screen — edit team name/season (owners + coaches); delete team with type-to-confirm cascade delete (owners only)
- "+ New Team" option in TeamSwitcher dropdown for existing users
- Resend SMTP — custom email provider wired into prod + dev Supabase; eliminates magic link rate limits
- Implicit auth flow — switched from PKCE to implicit so magic links work across browser contexts (Safari vs PWA vs Chrome)
- Service worker auto-update — skipWaiting + clientsClaim so new deploys activate immediately without manual cache clearing
