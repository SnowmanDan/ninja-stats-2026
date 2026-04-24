# Ninja Stats — Backlog

## In Progress

### Dev/Prod Supabase Environment Setup
Set up separate Supabase projects for dev and production so changes can be tested safely before going live.
- [x] Move Supabase credentials out of App.jsx into environment variables
- [x] Add .env.development and .env.production to .gitignore
- [x] Create .env.example template committed to git
- [x] Update App.jsx to read from import.meta.env
- [x] Update CLAUDE.md to document the workflow
- [x] Create dev Supabase project at supabase.com
- [x] Fill in .env.development with dev project credentials
- [x] Set Vercel environment variables for Production and Preview
- [x] Run migrations on dev Supabase project to match prod schema
- [x] Create `dev` git branch for ongoing development

---

## Up Next

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
