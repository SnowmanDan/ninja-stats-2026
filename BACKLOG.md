# Ninja Stats — Backlog

## In Progress

### Dev/Prod Supabase Environment Setup
Set up separate Supabase projects for dev and production so changes can be tested safely before going live.
- [x] Move Supabase credentials out of App.jsx into environment variables
- [x] Add .env.development and .env.production to .gitignore
- [x] Create .env.example template committed to git
- [x] Update App.jsx to read from import.meta.env
- [x] Update CLAUDE.md to document the workflow
- [ ] Create dev Supabase project at supabase.com
- [ ] Fill in .env.development with dev project credentials
- [ ] Set Vercel environment variables for Production and Preview
- [ ] Run migrations on dev Supabase project to match prod schema
- [ ] Create `dev` git branch for ongoing development

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
- PWA / offline support (Phase 3)
- Timestamps on game events (Phase 2 — `game_events` table)
- Substitution tracking
- Player position tracking

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
