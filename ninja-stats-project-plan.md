# Ninja Stats — Product Roadmap & Project Plan

## The Vision

Evolve **ninja-stats-2026** from a single-file HTML stats site into a **mobile-first Progressive Web App (PWA)** for live youth soccer stat tracking. Built incrementally as a learning project with freemium productization as the north star.

**Stack:** React (Vite) → Supabase → Vercel
**Repo:** github.com/SnowmanDan/ninja-stats-2026

---

## The Roadmap at a Glance

| Phase | What | Key Learning | Status |
|-------|------|-------------|--------|
| **0** | React migration | Vite, components, props, state | ⬜ Up next |
| **1** | Live game logger MVP | Touch UI, event capture, state mgmt | ⬜ |
| **2** | Post-game review + schema evolution | Schema design, migrations, CRUD | ⬜ |
| **3** | PWA + offline support | Service workers, caching, IndexedDB | ⬜ |
| **4** | Multi-team + auth | Supabase Auth, RLS, multi-tenancy | ⬜ |
| **5** | Productization | Stripe, analytics, onboarding, leaderboards | ⬜ |

**Phases 0–3** = a usable product for the Ninjas.
**Phases 4–5** = turn it into a product anyone can use.

---

## Phase 0: React Migration (Current Focus)

**Goal:** Replace the single `index.html` with a Vite + React app that looks and works identically. Parents won't notice. You'll notice everything.

### Session 1 — Scaffold & Deploy

**What you do:**
- Initialize a Vite + React project inside the existing repo
- Get a blank "Hello Ninjas" page deploying to Vercel from the new structure
- Verify the deploy pipeline works before moving real code

**What you learn:**
- How Vite's project structure works (`src/`, `public/`, `package.json`, `vite.config.js`)
- How `npm` manages dependencies
- How Vercel auto-detects a Vite project vs. a static HTML file

**Definition of done:**
- [ ] `npm run dev` serves a local React page
- [ ] Vercel deploys the new structure successfully
- [ ] You can explain what `main.jsx` and `App.jsx` do

---

### Session 2 — Component Decomposition

**What you do:**
- Break the current page into React components
- Target components: `App`, `SeasonSummary`, `LastGame`, `StatsTable`, `Roster`, `GoalieStats`
- Each component lives in its own file under `src/components/`
- Use hardcoded data initially (no Supabase yet)

**What you learn:**
- Components as reusable building blocks
- Props (passing data from parent to child)
- JSX syntax (HTML inside JavaScript)
- `import` / `export` patterns

**Definition of done:**
- [ ] 6+ component files in `src/components/`
- [ ] App renders all sections with hardcoded data
- [ ] You can explain the difference between a component and an HTML element

---

### Session 3 — Data Fetching Layer

**What you do:**
- Reconnect Supabase using `useState` and `useEffect`
- Replace hardcoded data with live database queries
- Add loading states and error handling

**What you learn:**
- React hooks (`useState`, `useEffect`)
- Async data fetching in React
- The React rendering lifecycle (why `useEffect` exists)
- Declarative rendering vs. manual DOM manipulation

**Definition of done:**
- [ ] All data pulls from Supabase
- [ ] Loading states display while data fetches
- [ ] No vanilla JavaScript DOM manipulation remains

---

### Session 4 — Styling, Testing & Cutover

**What you do:**
- Match the visual design of the current site
- Test on mobile (your phone, not just a browser resize)
- Retire the old `index.html`
- Push to production

**What you learn:**
- CSS in React (CSS modules or inline styles)
- Mobile-first responsive design patterns
- Git workflow for a major migration

**Definition of done:**
- [ ] Visually identical to current site
- [ ] Works on your phone
- [ ] Old `index.html` is removed from the repo
- [ ] Live on ninja-stats-2026.vercel.app

---

## Phase 1: Live Game Logger MVP

**Goal:** A mobile-first UI where someone taps to log game events in real time.

**Key decisions:**
- Single logger per game (no multi-user for v1)
- Events captured: goals, assists, goalie saves, goals allowed, shots on goal
- Big-button touch UI optimized for a parent on the sideline

**New concepts:** Event-driven architecture (log timestamped events, not stats directly), React state management for live data, touch-optimized UX design.

**Schema addition:** A new `game_events` table storing raw timestamped events (e.g., "Goal by Player 7, assisted by Player 3, minute 12").

---

## Phase 2: Post-Game Review + Schema Evolution

**Goal:** A simple edit screen to review, correct, and finalize game events into formal stats.

**Key features:**
- Review screen showing all logged events for a game
- Edit/delete accidental taps
- "Finalize" button that crunches events into the existing `game_stats` table
- No formal approval workflow (keep it simple)

**New concepts:** Database migrations, data transformation pipelines, CRUD operations on the events table.

---

## Phase 3: PWA + Offline Support

**Goal:** The app works without cell service on a soccer field and syncs when back online.

**Key features:**
- `manifest.json` (app icon, name, standalone mode)
- Service worker for caching and offline support
- Offline event queue (log events locally, sync to Supabase when online)
- "Add to Home Screen" prompt

**New concepts:** Service workers, the Cache API, IndexedDB for offline storage, background sync patterns.

**Why this matters:** Soccer fields have terrible cell service. This is non-negotiable for a sideline app.

---

## Phase 4: Multi-Team + Auth

**Goal:** Stop being "the Ninjas' website" and start being "an app anyone can use."

**Key features:**
- Supabase Auth (email/password or magic link)
- Team creation and management
- Role-based access (coach vs. parent vs. viewer)
- Row Level Security so teams only see their own data

**New concepts:** Authentication flows, authorization patterns, multi-tenant database design, Supabase RLS policies.

---

## Phase 5: Productization

**Goal:** Turn the app into a freemium business.

**Key features:**
- Free tier: single team, basic logging, season stats
- Paid tier ($5–8/month): multi-season history, exports, advanced stats
- Premium tier ($15–20/month): leaderboards, tournament mode, league admin
- Stripe integration for payments
- Onboarding flow (progressive disclosure, commitment escalation)
- Analytics to understand user behavior

**New concepts:** Payment processing (Stripe), product analytics, onboarding design, conversion optimization.

**Distribution:** PWA means no App Store needed. Primary channels are coach-to-parent sharing (group chat links), SEO, and social content. Can wrap in native shell later via PWABuilder if needed.

---

## Competitive Landscape (as of April 2026)

| App | Model | Strength | Weakness |
|-----|-------|----------|----------|
| GameChanger | Free for coaches, $3.33+/mo parents | Dominant in baseball, expanding to soccer | Overkill for casual youth teams |
| TeamSnap | Free to Ultra tiers | Team management + scheduling | Stats are secondary, not core |
| Soccer Simple Stats | Free + Pro plan | Dead-simple one-screen design | Individual player focus, not team |
| Scorebook+ | Free basic + Advanced subscription | Detailed stat tracking | Buggy exports, missing goalie stats |
| Ollie | Freemium | Youth development culture focus | "Cumbersome" per user reviews |
| Soccer Teammate | One-time purchase | No subscription, no ads | Native only, no web presence |

**Your potential differentiation:** Simplicity + team-level stats + zero install friction (PWA) + behavioral science-informed onboarding and engagement.

---

## Architecture Notes

- **Database:** Supabase (PostgreSQL). Current schema: `games`, `players`, `game_stats`. Will add `game_events` in Phase 2 and auth/team tables in Phase 4.
- **Frontend:** React via Vite. Deploy to Vercel from GitHub.
- **Payments (future):** Stripe, integrated directly (no App Store fees).
- **Offline (future):** Service worker + IndexedDB for offline event queue.

---

## Supabase Schema Reference

```
players: id (int PK), name (text), number (int)
games: id (int PK), date, opponent, team_score, opponent_score
game_stats: id (int PK), game_id (FK), player_id (FK), goals, assists, minutes_in_goal (default 0), goals_allowed (default 0)
```

13 players (IDs 1–13). Jersey `number` ≠ `id`. Team is always "Ninjas."
Notable spellings: Hailey (ID 8), Eleanora (ID 1), Eliana (formerly "Ellie").

---

*Last updated: April 12, 2026*
