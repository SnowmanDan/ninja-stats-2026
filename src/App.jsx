/*
  App.jsx — the root component.
  ==============================
  Holds all placeholder data and passes it down to each section component.
  When we connect to Supabase, this is the only file that needs to change —
  we replace the placeholder constants with real fetched data, but the
  components themselves stay the same.

  Import order: CSS first, then components alphabetically.
*/

import './index.css'

import GameHistory    from './components/GameHistory'
import GoalieStats    from './components/GoalieStats'
import Roster         from './components/Roster'
import SeasonSummary  from './components/SeasonSummary'
import StatsTable     from './components/StatsTable'

/* ================================================================
   PLACEHOLDER DATA
   ----------------------------------------------------------------
   Shaped to match what Supabase will return, so the components are
   already wired correctly — we just swap this out for live data later.
   Defined outside App() so it isn't re-created on every render.
================================================================ */

const record = {
  wins: 3,
  losses: 1,
  ties: 1,
  goalsFor: 14,
  goalsAgainst: 6,
}

const seasonPlayers = [
  { number:  7, name: 'Olivia',   goals: 5, assists: 3 },
  { number: 11, name: 'Sofia',    goals: 4, assists: 2 },
  { number:  3, name: 'Mia',      goals: 3, assists: 4 },
  { number: 14, name: 'Isabella', goals: 2, assists: 1 },
  { number:  9, name: 'Emma',     goals: 0, assists: 2 },
]

/*
  games — all games, newest first.
  The most recent entry (games[0]) also drives the StatsTable heading.
*/
const games = [
  { date: '2026-04-10', opponent: 'Storm',   teamScore: 4, opponentScore: 1 },
  { date: '2026-04-03', opponent: 'Tocco',   teamScore: 1, opponentScore: 3 },
  { date: '2026-03-27', opponent: 'Thunder', teamScore: 2, opponentScore: 2 },
]

/*
  lastGameStats — per-player goals + assists for the most recent game,
  sorted by jersey number. Driven by games[0] above.
*/
const lastGameStats = [
  { number:  3, name: 'Mia',      goals: 2, assists: 1 },
  { number:  7, name: 'Olivia',   goals: 1, assists: 0 },
  { number:  9, name: 'Emma',     goals: 0, assists: 1 },
  { number: 11, name: 'Sofia',    goals: 1, assists: 1 },
  { number: 14, name: 'Isabella', goals: 0, assists: 0 },
]

const roster = [
  { number:  1, name: 'Lily' },
  { number:  3, name: 'Mia' },
  { number:  5, name: 'Ava' },
  { number:  7, name: 'Olivia' },
  { number:  9, name: 'Emma' },
  { number: 11, name: 'Sofia' },
  { number: 13, name: 'Chloe' },
  { number: 14, name: 'Isabella' },
  { number: 16, name: 'Grace' },
  { number: 18, name: 'Zoe' },
]

const goalieSeasonTotals = [
  { name: 'Lily',  gamesInGoal: 4, minutes: 60, goalsAllowed: 4 },
  { name: 'Chloe', gamesInGoal: 2, minutes: 20, goalsAllowed: 2 },
]

const goalieByGame = [
  {
    date: '2026-04-10',
    opponent: 'Storm',
    goalies: [
      { name: 'Lily',  minutes: 15, goalsAllowed: 1 },
      { name: 'Chloe', minutes: 5,  goalsAllowed: 0 },
    ],
  },
  {
    date: '2026-04-03',
    opponent: 'Tocco',
    goalies: [
      { name: 'Lily', minutes: 20, goalsAllowed: 3 },
    ],
  },
  {
    date: '2026-03-27',
    opponent: 'Thunder',
    goalies: [
      { name: 'Chloe', minutes: 10, goalsAllowed: 1 },
      { name: 'Lily',  minutes: 10, goalsAllowed: 1 },
    ],
  },
]

/* ================================================================
   APP COMPONENT
   ----------------------------------------------------------------
   Section order matches legacy.html:
     1. Season Totals
     2. Game History
     3. Game Stats (most recent game)
     4. Roster
     5. Goalie Stats
================================================================ */

function App() {
  return (
    <div className="page-wrapper">

      <header>
        <div className="header-inner">
          <div className="header-center">
            <h1 className="team-name">Ninjas</h1>
            <p className="season-label">Spring 2026 Season</p>
            <p className="district-label">Lindbergh School District · Girls 1st Grade</p>
          </div>
        </div>
      </header>

      <SeasonSummary record={record} players={seasonPlayers} />
      <GameHistory   games={games} />
      {/*
        StatsTable shows stats for the most recent game.
        games[0] is newest-first, so it drives the heading date.
      */}
      <StatsTable    game={games[0]} stats={lastGameStats} />
      <Roster        players={roster} />
      <GoalieStats   seasonTotals={goalieSeasonTotals} byGame={goalieByGame} />

      <footer>⚽ Go Ninjas! ⚽</footer>

    </div>
  )
}

export default App
