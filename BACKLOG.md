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
- **SS-15** — Add place for photo of field or team from the day
- **SS-16** — Increase brightness of name font in event logger
- **SS-17** — Make timer a countdown where you can enter length (e.g. 50 min)
- **SS-18** — Maybe select which players are present before logging starts

### Other
- **Public view link** — shareable read-only URL for a team's stats page, no login required. Signed token stored on the team record (revocable by the owner). Prerequisite: Phase 4 auth + RLS.
- PWA offline support (Phase 3 — offline event queue, IndexedDB)
- Timestamps on game events (Phase 2 — `game_events` table)
- Substitution tracking
- Player position tracking
- Add photo to game logger (Supabase Storage bucket, `photo_url` on `games` table, camera capture on mobile, display in game history)

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
