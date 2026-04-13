/*
  App.jsx — root component with live Supabase data.
  ==================================================
  This file does three things:
    1. Fetches raw data from Supabase (players, games, game_stats)
    2. Transforms that raw data into the shapes each component expects
    3. Renders the page, passing the transformed data down as props

  The components (SeasonSummary, GameHistory, etc.) are unchanged —
  they still just accept props and render them. All the data logic
  lives here in one place, which makes it easy to find and change.
*/

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

import './index.css'

import Confetti      from './components/Confetti'
import GameHistory   from './components/GameHistory'
import GoalieStats   from './components/GoalieStats'
import PixelPlayers  from './components/PixelPlayers'
import Roster        from './components/Roster'
import SeasonSummary from './components/SeasonSummary'
import StatsTable    from './components/StatsTable'

/* ================================================================
   SUPABASE CLIENT
   ----------------------------------------------------------------
   createClient() sets up the connection to our Supabase project.
   The anon key is the public key — safe to include here because
   Supabase's Row Level Security (RLS) controls what it can access.
   Find both values in: Supabase Dashboard → Project Settings → API
================================================================ */
const SUPABASE_URL      = 'https://vzktoeqmnezrcrqtuvkx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6a3RvZXFtbmV6cmNycXR1dmt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxODI5MTgsImV4cCI6MjA5MDc1ODkxOH0.SO2yaLAQrmgRw_mIGK7mgQlQr5q5KCtvYvB5kzsKmPA'

/*
  createClient is called once, outside the component, so the same
  client instance is reused across renders instead of being recreated
  every time App re-renders.
*/
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

/* ================================================================
   APP COMPONENT
================================================================ */

function App() {

  /* ---- State -------------------------------------------------- */

  /*
    useState gives a component "memory" — a value that persists between
    renders and triggers a re-render when it changes.

    Pattern: const [value, setValue] = useState(initialValue)
      value    → current value
      setValue → function to update it (React re-renders when called)
  */

  // Are we still waiting for the database responses?
  const [loading, setLoading] = useState(true)

  // If a fetch fails, store the error message here to show to the user.
  const [error, setError] = useState(null)

  // Raw rows from each Supabase table — stored separately so the
  // transformation logic below can combine them in different ways.
  const [players,  setPlayers]  = useState([])
  const [games,    setGames]    = useState([])
  const [allStats, setAllStats] = useState([])

  /* ---- Data fetching ------------------------------------------ */

  /*
    useEffect runs a side effect after the component renders.
    The empty array [] as the second argument means "run this only
    once, when the component first mounts" — equivalent to
    componentDidMount in older React class components.

    We fetch all three tables in parallel with Promise.all so the
    page doesn't wait for one query before starting the next.
  */
  useEffect(() => {
    async function fetchAll() {
      const [playersRes, gamesRes, statsRes] = await Promise.all([

        // All players, sorted by jersey number
        db.from('players')
          .select('id, name, number')
          .order('number'),

        // All games, newest first (games[0] = most recent)
        db.from('games')
          .select('id, date, opponent, team_score, opponent_score')
          .order('date', { ascending: false }),

        // All game stats across every game
        db.from('game_stats')
          .select('game_id, player_id, goals, assists, minutes_in_goal, goals_allowed'),

      ])

      // If any query failed, surface the first error and stop
      const err = playersRes.error || gamesRes.error || statsRes.error
      if (err) {
        console.error('Supabase error:', err)
        setError('Could not load data. Check the browser console for details.')
        setLoading(false)
        return
      }

      setPlayers(playersRes.data)
      setGames(gamesRes.data)
      setAllStats(statsRes.data)
      setLoading(false)
    }

    fetchAll()
  }, []) // [] = run once on mount, never again

  /* ---- Loading & error states --------------------------------- */

  /*
    Early returns — if we're not ready to show data yet, render a
    simple message instead of the full page. The header always shows
    so the page doesn't look completely blank.
  */
  if (loading) {
    return (
      <div className="page-wrapper">
        <Confetti active={false} />
        <PageHeader />
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Loading season data…
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-wrapper">
        <Confetti active={false} />
        <PageHeader />
        <div className="card" style={{ textAlign: 'center', color: '#e57373' }}>
          {error}
        </div>
      </div>
    )
  }

  /* ---- Data transformation ------------------------------------ */

  /*
    Everything below runs only after data has loaded (the early returns
    above prevent reaching this point while loading === true).

    We transform the raw Supabase rows into the exact shapes that each
    component's props expect. The DB uses snake_case column names
    (team_score, opponent_score) so we convert to camelCase here.
  */

  // -- Season record (W/L/T + goals for/against) --
  let wins = 0, losses = 0, ties = 0, goalsFor = 0, goalsAgainst = 0
  games.forEach((g) => {
    if      (g.team_score > g.opponent_score) wins++
    else if (g.team_score < g.opponent_score) losses++
    else                                      ties++
    goalsFor     += g.team_score
    goalsAgainst += g.opponent_score
  })
  const record = { wins, losses, ties, goalsFor, goalsAgainst }

  // -- Player lookup map: id → { name, number, goals, assists } --
  // Built once and reused by both the season totals and per-game stats.
  const playerMap = {}
  players.forEach((p) => {
    playerMap[p.id] = { name: p.name, number: p.number, goals: 0, assists: 0 }
  })

  // -- Season totals: accumulate goals + assists across all games --
  allStats.forEach((s) => {
    if (playerMap[s.player_id]) {
      playerMap[s.player_id].goals   += s.goals
      playerMap[s.player_id].assists += s.assists
    }
  })

  // Only show players who scored or assisted at least once,
  // sorted: most goals → most assists → lowest jersey number
  const seasonPlayers = Object.values(playerMap)
    .filter((p) => p.goals > 0 || p.assists > 0)
    .sort((a, b) => {
      if (b.goals   !== a.goals)   return b.goals   - a.goals
      if (b.assists !== a.assists) return b.assists - a.assists
      return a.number - b.number
    })

  // -- Game history: rename snake_case keys to camelCase --
  const gameHistory = games.map((g) => ({
    date:          g.date,
    opponent:      g.opponent,
    teamScore:     g.team_score,
    opponentScore: g.opponent_score,
  }))

  // -- Per-game stats for the most recent game (games[0]) --
  const lastGame = games[0]  // already newest-first from the query
  const lastGameStats = lastGame
    ? allStats
        .filter((s) => s.game_id === lastGame.id)
        .map((s) => {
          const player = playerMap[s.player_id] || { name: 'Unknown', number: '?' }
          return { number: player.number, name: player.name, goals: s.goals, assists: s.assists }
        })
        .sort((a, b) => a.number - b.number)
    : []

  // -- Goalie season totals --
  const goalieMap = {}
  allStats.forEach((s) => {
    if (!s.minutes_in_goal || s.minutes_in_goal <= 0) return

    if (!goalieMap[s.player_id]) {
      const p = playerMap[s.player_id] || { name: 'Unknown' }
      goalieMap[s.player_id] = { name: p.name, gamesInGoal: 0, minutes: 0, goalsAllowed: 0 }
    }

    goalieMap[s.player_id].gamesInGoal  += 1
    goalieMap[s.player_id].minutes      += s.minutes_in_goal
    goalieMap[s.player_id].goalsAllowed += (s.goals_allowed || 0)
  })

  const goalieSeasonTotals = Object.values(goalieMap)
    .sort((a, b) => b.minutes - a.minutes)

  // -- Goalie by game: one entry per game that had goalie data --
  const goalieByGame = games
    .map((g) => {
      const goalies = allStats
        .filter((s) => s.game_id === g.id && s.minutes_in_goal > 0)
        .map((s) => {
          const p = playerMap[s.player_id] || { name: 'Unknown' }
          return { name: p.name, minutes: s.minutes_in_goal, goalsAllowed: s.goals_allowed || 0 }
        })
        .sort((a, b) => b.minutes - a.minutes)

      return { date: g.date, opponent: g.opponent, goalies }
    })
    .filter((g) => g.goalies.length > 0) // skip games with no goalie data

  /* ---- Render ------------------------------------------------- */

  /*
    Confetti fires on first session load when the most recent game
    was a win. games[0] is the newest game (ordered desc by date).
  */
  const isLastGameWin = games.length > 0 && games[0].team_score > games[0].opponent_score

  return (
    <div className="page-wrapper">
      <Confetti active={isLastGameWin} />
      <PageHeader />

      <SeasonSummary record={record} players={seasonPlayers} />
      <GameHistory   games={gameHistory} />
      {lastGame && <StatsTable game={{ date: lastGame.date, opponent: lastGame.opponent }} stats={lastGameStats} />}
      <Roster        players={players} />
      <GoalieStats   seasonTotals={goalieSeasonTotals} byGame={goalieByGame} />

      <footer>⚽ Go Ninjas! ⚽</footer>
    </div>
  )
}

/* ================================================================
   PAGE HEADER
   ----------------------------------------------------------------
   Extracted into its own small component so the loading and error
   states above can render the header without duplicating the JSX.
   This is an example of a "presentational" component — no props,
   no state, just markup.
================================================================ */
/*
  PageHeader uses PixelPlayers to flank the title text with two
  animated pixel-art soccer players. Each instance renders one
  canvas and runs its own animation loop independently.
*/
function PageHeader() {
  return (
    <header>
      <div className="header-inner">
        {/* Left player — faces right (toward the title) */}
        <PixelPlayers />

        <div className="header-center">
          <h1 className="team-name">Ninjas</h1>
          <p className="season-label">Spring 2026 Season</p>
          <p className="district-label">Lindbergh School District · Girls 1st Grade</p>
        </div>

        {/* Right player — mirrored so it faces left (toward the title) */}
        <PixelPlayers mirrored />
      </div>
    </header>
  )
}

export default App
