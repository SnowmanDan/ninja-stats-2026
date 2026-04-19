# Ninja Stats — Claude Code Guide

## Project Overview
A youth soccer team stats site for the **Ninjas** — Lindbergh School District Girls 1st Grade Soccer (Spring 2026). Displays roster, season summary, per-game stats, goalie stats, and game history. Being evolved into a mobile-first PWA for live sideline stat tracking with freemium productization as the long-term goal.

See `ninja-stats-project-plan.md` for the full phased roadmap. **Phase 0 (React migration) and Phase 1 (live game logger) are complete.** Current focus is polish, UX improvements, and sideline usability.

## Tech Stack
- **React 18** via **Vite 5** — JSX, ES modules, hot reload
- **Supabase** (`@supabase/supabase-js`) for the data layer (PostgreSQL backend)
- **Vanilla CSS** in a single `src/index.css` file (no Tailwind, no CSS-in-JS, no preprocessors)
- **Vercel** for deploy (auto-deploys from `main` on GitHub: `SnowmanDan/ninja-stats-2026`)
- **npm** for dependency management

## Design Principles
- **Mobile-first** — design for small screens first (parents on the sideline), then scale up
- **Clean and sporty** — bold typography, team colors, clear data layout
- **Touch-optimized** — big tap targets; swipe-left on game history rows to reveal Edit/Delete
- **Simple and well-commented** — this is a learning project; explain *what* and *why*
- **Offline-friendly mindset** — Phase 3 will add PWA + offline support; avoid patterns that assume reliable network

## Code Style
- Add comments that explain *what* and *why*, not just *what*
- Use semantic HTML elements (`<section>`, `<article>`, `<header>`, etc.)
- Keep CSS organized in `src/index.css` with clear section comments (e.g., `/* === ROSTER TABLE === */`)
- Prefer readable code over clever one-liners
- One component per file under `src/components/`, PascalCase filenames matching the component name
- Use React hooks (`useState`, `useEffect`) for state and data fetching — no class components
- Functional components with default exports
- Keep components small and focused; lift state up only when needed

## File Structure
```
soccer-stats/
├── index.html                    # Vite shell — mounts React at #root
├── src/
│   ├── main.jsx                  # React entry point (createRoot + StrictMode)
│   ├── App.jsx                   # Top-level component, owns shared state and data fetching
│   ├── index.css                 # All styles, mobile-first
│   └── components/
│       ├── Confetti.jsx          # Celebration effect on win
│       ├── GameHistory.jsx       # Past games list with swipe-to-edit/delete
│       ├── GameLogger.jsx        # Live in-game event capture
│       ├── GameSetup.jsx         # Pre-game date/opponent setup screen
│       ├── GoalieStats.jsx       # Per-player goalie minutes + goals allowed
│       ├── PixelPlayers.jsx      # Pixel-art player avatars (hidden in compact header)
│       ├── Roster.jsx            # Team roster table
│       ├── RosterEditor.jsx      # Add/edit/delete players (Manage Roster screen)
│       ├── SeasonSummary.jsx     # Aggregate season totals
│       └── StatsTable.jsx        # Per-player stat breakdown for a selected game
├── supabase/migrations/          # SQL migration files (run manually in Supabase SQL editor)
├── favicon.svg
├── robots.txt
├── vercel.json                   # SPA rewrite rule (/* → /index.html)
├── package.json
├── vite.config.js
├── ninja-stats-project-plan.md   # Phased roadmap
├── dist/                         # Build output (gitignored)
└── node_modules/                 # gitignored
```

## Data
- **Live data** comes from Supabase (PostgreSQL). Connection lives in the React app via `@supabase/supabase-js`.
- **Schema:**
  - `teams`: `id`, `name`, `slug`, `season` — multi-team support
  - `players`: `id` (int PK), `name` (text), `number` (int), `team_id` (FK)
  - `games`: `id` (int PK), `date`, `opponent`, `team_score`, `opponent_score`, `notes`, `team_id` (FK)
  - `game_stats`: `id` (int PK), `game_id` (FK), `player_id` (FK), `goals`, `assists`, `shots_on_goal`, `tackles`, `saves`, `minutes_in_goal` (default 0), `goals_allowed` (default 0)
- **Important:** Jersey `number` ≠ player `id`. Always join through `id` for relationships, display by `number` and `name`.
- **Roster:** 13 players (IDs 1–13). Team name is always "Ninjas." Notable spellings: **Hailey** (ID 8), **Eleanora** (ID 1), **Eliana** (formerly "Ellie").
- **RLS policies** are enabled. Migrations for INSERT/UPDATE/DELETE policies on `players`, `game_stats`, and `games` are in `supabase/migrations/`.
- **Migrations** are run manually in the Supabase SQL Editor — there is no CLI migration runner set up.

## Game Logger (Phase 1 — complete)
- **Event types:** Goal, Assist, Shot on Goal, Tackle, Save, Goal Allowed
- **Flow:** GameSetup (date + opponent) → GameLogger (log events) → Confirm screen (review + save)
- **New game:** events held in React state + localStorage draft for crash recovery
- **Edit game:** pre-populated from existing `game_stats`; no localStorage draft
- **Save:** INSERT or UPDATE `games` → DELETE + re-INSERT `game_stats`
- **Timer:** live MM:SS game clock on the logger screen with play/pause/reset controls
- **Game notes:** entered on the logging screen, saved to `games.notes`

## Dashboard UX
- **Game History rows:** swipe left to reveal Edit and Delete buttons
- **Tap a game row** to select it — Game Stats section updates to show that game's stats
- **Selected row** highlighted with dark red background + red left border
- **Season Totals table** shows: Goals, Assists, Shots, Tackles, Saves — horizontally scrollable on mobile
- **Game Stats table** shows the same columns for the selected game

## Header behavior
- **Dashboard:** full header with pixel player graphics and team switcher dropdown
- **Logger / GameSetup / RosterEditor:** compact header (smaller text, no pixel players, no team switcher) to maximize screen space for actions

## Environment Variables
Supabase credentials are read from environment variables — never hardcoded.

| File | Purpose | Committed? |
|------|---------|-----------|
| `.env.example` | Template showing required variable names | ✅ Yes |
| `.env.development` | Dev Supabase project credentials | ❌ Gitignored |
| `.env.production` | Prod Supabase project credentials | ❌ Gitignored |

**Variables:**
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Vite exposes these to the app via `import.meta.env.VITE_*`.

**Vercel dashboard** (Project Settings → Environment Variables):
- **Production** environment → prod Supabase URL + anon key
- **Preview** environment → dev Supabase URL + anon key

## Branch Strategy
- `main` → auto-deploys to Vercel Production (prod Supabase)
- `dev` → auto-deploys to Vercel Preview (dev Supabase)
- Feature work happens on `dev`, merged to `main` when ready to ship

## Common Commands
- `npm run dev` — start the local Vite dev server (uses `.env.development`)
- `npm run build` — production build into `dist/` (uses `.env.production`)
- `npm run preview` — preview the built site locally

## Accessibility
- Use `alt` text on images
- Ensure sufficient color contrast (test on a phone in sunlight — this app lives on soccer fields)
- Tables should have proper `<thead>` / `<tbody>` and `scope` attributes
- Touch targets at least 44x44px for the live logger UI
