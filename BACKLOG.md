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
- Wire up `created_by` / `owner_id` — populate when user creates a game or team
- Team creation flow — let a new user create their own team instead of seeding in SQL
- Tighten RLS — replace wide-open `using (true)` with ownership checks against `team_members`
- **Invite by email** — coach enters an email, app sends a magic link that auto-adds the user to the team with a role (coach vs. viewer); needs an invites table, invite token, and role assignment on accept

### Other
- PWA offline support (Phase 3 — offline event queue, IndexedDB)
- Timestamps on game events (Phase 2 — `game_events` table)
- Substitution tracking
- Player position tracking
- Auto-capitalize opponent name field

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
