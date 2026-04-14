# Ninja Stats — Claude Code Guide

## Project Overview
A youth soccer team stats site for the **Ninjas** — Lindbergh School District Girls 1st Grade Soccer (Spring 2026). Displays roster, season summary, per-game stats, goalie stats, and game history. Being evolved into a mobile-first PWA for live sideline stat tracking with freemium productization as the long-term goal.

See `ninja-stats-project-plan.md` for the full phased roadmap. Current focus: **Phase 0 — React migration** (Sessions 2–3). Phase 1 (live game logger) work has already started in `GameLogger.jsx` / `GameSetup.jsx`.

## Tech Stack
- **React 18** via **Vite 5** — JSX, ES modules, hot reload
- **Supabase** (`@supabase/supabase-js`) for the data layer (PostgreSQL backend)
- **Vanilla CSS** in a single `src/index.css` file (no Tailwind, no CSS-in-JS, no preprocessors)
- **Vercel** for deploy (auto-deploys from `main` on GitHub: `SnowmanDan/ninja-stats-2026`)
- **npm** for dependency management

## Design Principles
- **Mobile-first** — design for small screens first (parents on the sideline), then scale up
- **Clean and sporty** — bold typography, team colors, clear data layout
- **Touch-optimized** — big tap targets for the upcoming live game logger
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
│       ├── Confetti.jsx          # Celebration effect
│       ├── GameHistory.jsx       # Past games list
│       ├── GameLogger.jsx        # Live in-game event capture (Phase 1)
│       ├── GameSetup.jsx         # Pre-game setup screen (Phase 1)
│       ├── GoalieStats.jsx       # Per-player goalie minutes + goals allowed
│       ├── PixelPlayers.jsx      # Pixel-art player avatars
│       ├── Roster.jsx            # Team roster table
│       ├── SeasonSummary.jsx     # Aggregate season totals
│       └── StatsTable.jsx        # Per-player stat breakdown
├── favicon.svg
├── robots.txt
├── package.json                  # Dependencies + scripts (dev/build/preview)
├── vite.config.js                # Vite config
├── ninja-stats-project-plan.md   # Phased roadmap (read this for context)
├── dist/                         # Build output (gitignored)
└── node_modules/                 # gitignored
```

## Data
- **Live data** comes from Supabase (PostgreSQL). Connection lives in the React app via `@supabase/supabase-js`.
- **Schema:**
  - `players`: `id` (int PK), `name` (text), `number` (int)
  - `games`: `id` (int PK), `date`, `opponent`, `team_score`, `opponent_score`
  - `game_stats`: `id` (int PK), `game_id` (FK), `player_id` (FK), `goals`, `assists`, `minutes_in_goal` (default 0), `goals_allowed` (default 0)
- **Important:** Jersey `number` ≠ player `id`. Always join through `id` for relationships, display by `number` and `name`.
- **Roster:** 13 players (IDs 1–13). Team name is always "Ninjas." Notable spellings: **Hailey** (ID 8), **Eleanora** (ID 1), **Eliana** (formerly "Ellie").
- **Future schema:** `game_events` table coming in Phase 2 (raw timestamped events from the live logger).

## Common Commands
- `npm run dev` — start the local Vite dev server
- `npm run build` — production build into `dist/`
- `npm run preview` — preview the built site locally

## Accessibility
- Use `alt` text on images
- Ensure sufficient color contrast (test on a phone in sunlight — this app lives on soccer fields)
- Tables should have proper `<thead>` / `<tbody>` and `scope` attributes
- Touch targets at least 44x44px for the live logger UI
