/*
  App.jsx — root component with live Supabase data, scoped by team.
  ==================================================================
  This file does four things:
    1. Reads the team slug from the URL (e.g. "ninjas" from /ninjas)
    2. Looks up the team's id in the `teams` table
    3. Fetches that team's players, games, and game_stats from Supabase
    4. Transforms the raw data into the shapes each component expects

  The team scoping is what makes this multi-team. Every Supabase query
  filters by team_id so the Ninjas and Inter Milan see only their own
  data, even though they share the same database.
*/

import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import { SpeedInsights } from '@vercel/speed-insights/react'

import './index.css'

import Confetti      from './components/Confetti'
import GameHistory   from './components/GameHistory'
import GameLogger    from './components/GameLogger'
import GameSetup     from './components/GameSetup'
import GoalieStats   from './components/GoalieStats'
import PixelPlayers  from './components/PixelPlayers'
import Roster        from './components/Roster'
import RosterEditor  from './components/RosterEditor'
import SeasonSummary from './components/SeasonSummary'
import StatsTable    from './components/StatsTable'
import TeamSwitcher  from './components/TeamSwitcher'

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

  /* ---- Routing -------------------------------------------------- */

  /*
    useParams reads the dynamic segments from the URL pattern
    defined in main.jsx (path="/:teamSlug/*"). For /ninjas it
    returns { teamSlug: "ninjas" }.
  */
  const { teamSlug } = useParams()

  /* ---- State -------------------------------------------------- */

  // List of all teams in the database (used by the TeamSwitcher
  // dropdown and to look up the current team's id from its slug).
  const [teams, setTeams] = useState([])

  // The team object matching the current URL slug. Holds id, name,
  // slug, season. Null until teams have loaded.
  const [currentTeam, setCurrentTeam] = useState(null)

  // Are we still waiting for the database responses?
  const [loading, setLoading] = useState(true)

  // If a fetch fails, store the error message here to show to the user.
  const [error, setError] = useState(null)

  // Raw rows for the CURRENT team only — these are re-fetched
  // every time currentTeam changes.
  const [players,  setPlayers]  = useState([])
  const [games,    setGames]    = useState([])
  const [allStats, setAllStats] = useState([])

  /*
    View routing — which screen is active?
      'dashboard' — the normal stats page (default)
      'setup'     — GameSetup form to create a new game
      'logger'    — GameLogger UI for the active game

    These views remain state-based (not URL-based) for now to keep
    the routing simple. A future refactor can promote them to real
    routes (e.g. /ninjas/setup, /ninjas/logger/:gameId).
  */
  const [view,       setView]       = useState('dashboard')
  const [activeGame, setActiveGame] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Saved draft from a previous logger session (crash / accidental refresh)
  const [savedDraft, setSavedDraft] = useState(null)

  /* ---- Data fetching: teams (runs once on mount) ---------------- */

  /*
    Fetch the full list of teams a single time when the app mounts.
    Teams change rarely so we don't bother re-fetching on every
    navigation. The TeamSwitcher uses this list, and we use it to
    look up the current team's id from its slug.
  */
  useEffect(() => {
    async function fetchTeams() {
      const { data, error: teamsError } = await db
        .from('teams')
        .select('id, name, slug, season')
        .order('id')

      if (teamsError) {
        console.error('Supabase teams error:', teamsError)
        setError('Could not load teams. Check the browser console for details.')
        setLoading(false)
        return
      }

      setTeams(data)
    }

    fetchTeams()
  }, [])

  /* ---- Resolve the URL slug to a team object -------------------- */

  /*
    Whenever the teams list or the URL slug changes, look up the
    matching team. If the slug doesn't match any team, show an error
    so the user knows the URL is bad rather than seeing a blank page.
  */
  useEffect(() => {
    if (teams.length === 0) return  // teams not loaded yet

    const match = teams.find((t) => t.slug === teamSlug)
    if (!match) {
      setError(`No team found for "${teamSlug}".`)
      setLoading(false)
      return
    }

    setCurrentTeam(match)
    setError(null)

    // Switching teams should reset to the dashboard view so the user
    // doesn't end up logging stats for the wrong team.
    setView('dashboard')
    setActiveGame(null)

    // Check for an unsaved game draft left by a crash or accidental refresh
    try {
      const raw = localStorage.getItem(`ninja-stats-draft-${match.id}`)
      setSavedDraft(raw ? JSON.parse(raw) : null)
    } catch {
      setSavedDraft(null)
    }
  }, [teams, teamSlug])

  /* ---- Data fetching: team-scoped data -------------------------- */

  /*
    Fetch players, games, and stats for the current team.
    Re-runs whenever:
      - currentTeam changes (user switched teams)
      - refreshKey increments (returning from the logger after edits)

    All three queries filter by team_id where the column exists:
      - players.team_id  → only this team's roster
      - games.team_id    → only this team's games
      - game_stats has no team_id (it's reachable through game_id and
        player_id), so we use an inner-join filter via .in() on the
        game ids we just fetched.
  */
  useEffect(() => {
    if (!currentTeam) return

    async function fetchTeamData() {
      setLoading(true)

      // Players and games can be fetched in parallel — both filter
      // directly on team_id.
      const [playersRes, gamesRes] = await Promise.all([
        db.from('players')
          .select('id, name, number')
          .eq('team_id', currentTeam.id)
          .order('number'),

        db.from('games')
          .select('id, date, opponent, team_score, opponent_score')
          .eq('team_id', currentTeam.id)
          .order('date', { ascending: false }),
      ])

      const firstErr = playersRes.error || gamesRes.error
      if (firstErr) {
        console.error('Supabase error:', firstErr)
        setError('Could not load data. Check the browser console for details.')
        setLoading(false)
        return
      }

      // Now fetch stats for ONLY this team's games. We filter
      // game_stats by the game ids we just received, which keeps
      // the data team-scoped without needing a team_id column on
      // game_stats itself.
      const gameIds = gamesRes.data.map((g) => g.id)
      let statsData = []
      if (gameIds.length > 0) {
        const statsRes = await db
          .from('game_stats')
          .select('game_id, player_id, goals, assists, minutes_in_goal, goals_allowed')
          .in('game_id', gameIds)

        if (statsRes.error) {
          console.error('Supabase stats error:', statsRes.error)
          setError('Could not load stats. Check the browser console for details.')
          setLoading(false)
          return
        }
        statsData = statsRes.data
      }

      setPlayers(playersRes.data)
      setGames(gamesRes.data)
      setAllStats(statsData)
      setLoading(false)
    }

    fetchTeamData()
  }, [currentTeam, refreshKey])

  /* ---- View callbacks ----------------------------------------- */

  /*
    Called by GameSetup with the draft { date, opponent }.
    No Supabase write yet — the INSERT fires only when Save Game is tapped.
  */
  function handleGameCreated(newGame) {
    // Clear any saved draft so the logger starts fresh (not a resume)
    localStorage.removeItem(`ninja-stats-draft-${currentTeam.id}`)
    setSavedDraft(null)
    setActiveGame(newGame)
    setView('logger')
  }

  /*
    Called by GameLogger's "Back to Dashboard" button.
    Incrementing refreshKey causes the team-data useEffect to re-run
    so the dashboard shows the new game right away.
  */
  function handleBackToDashboard() {
    setView('dashboard')
    setRefreshKey((k) => k + 1)
  }

  /* ---- Non-dashboard views ------------------------------------ */

  /*
    Render setup/logger immediately — they don't need the fetched
    data, so we don't wait for loading to finish. GameLogger gets
    teamId so it can scope the games INSERT to the right team.
  */
  if (view === 'setup') {
    return (
      <div className="page-wrapper">
        <PageHeader team={currentTeam} teams={teams} />
        <GameSetup
          onGameCreated={handleGameCreated}
          onCancel={() => setView('dashboard')}
        />
      </div>
    )
  }

  if (view === 'logger') {
    return (
      <div className="page-wrapper">
        <PageHeader team={currentTeam} teams={teams} />
        <GameLogger game={activeGame} db={db} players={players} teamId={currentTeam.id} onBack={handleBackToDashboard} />
      </div>
    )
  }

  if (view === 'roster-editor') {
    return (
      <div className="page-wrapper">
        <PageHeader team={currentTeam} teams={teams} />
        <RosterEditor
          players={players}
          db={db}
          teamId={currentTeam.id}
          onBack={handleBackToDashboard}
        />
      </div>
    )
  }

  /* ---- Loading & error states --------------------------------- */

  if (loading) {
    return (
      <div className="page-wrapper">
        <Confetti active={false} />
        <PageHeader team={currentTeam} teams={teams} />
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
        <PageHeader team={currentTeam} teams={teams} />
        <div className="card" style={{ textAlign: 'center', color: '#e57373' }}>
          {error}
        </div>
      </div>
    )
  }

  /* ---- Data transformation ------------------------------------ */

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
    id:            g.id,
    date:          g.date,
    opponent:      g.opponent,
    teamScore:     g.team_score,
    opponentScore: g.opponent_score,
  }))

  // -- Per-game stats for the most recent game (games[0]) --
  const lastGame = games[0]
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

  // -- Goalie by game --
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
    .filter((g) => g.goalies.length > 0)

  /* ---- Render ------------------------------------------------- */

  const isLastGameWin = games.length > 0 && games[0].team_score > games[0].opponent_score

  return (
    <div className="page-wrapper">
      <Confetti active={isLastGameWin} />
      <PageHeader team={currentTeam} teams={teams} />

      {savedDraft && (
        <div className="card draft-recovery-card">
          <p className="draft-recovery-msg">
            Unsaved game vs. <strong>{savedDraft.game.opponent}</strong> — resume where you left off?
          </p>
          <div className="form-actions">
            <button
              className="btn btn-primary"
              onClick={() => {
                setActiveGame(savedDraft.game)
                setView('logger')
                setSavedDraft(null)
              }}
            >
              Resume
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                localStorage.removeItem(`ninja-stats-draft-${currentTeam.id}`)
                setSavedDraft(null)
              }}
            >
              Discard
            </button>
          </div>
        </div>
      )}

      <div className="new-game-bar">
        {players.length === 0 && (
          <button className="btn btn-primary" onClick={() => setView('roster-editor')}>
            + Add Roster
          </button>
        )}
        <button className="btn btn-primary" onClick={() => setView('setup')}>
          + New Game
        </button>
      </div>

      <SeasonSummary record={record} players={seasonPlayers} />
      <GameHistory   games={gameHistory} db={db} onDelete={(id) => setGames((prev) => prev.filter((g) => g.id !== id))} />
      {lastGame && <StatsTable game={{ date: lastGame.date, opponent: lastGame.opponent }} stats={lastGameStats} />}
      <Roster        players={players} />
      <button className="manage-roster-link" onClick={() => setView('roster-editor')}>
        Manage Roster
      </button>
      <GoalieStats   seasonTotals={goalieSeasonTotals} byGame={goalieByGame} />

      <footer>⚽ Go {currentTeam.name}! ⚽</footer>
      <SpeedInsights />
    </div>
  )
}

/* ================================================================
   PAGE HEADER
   ----------------------------------------------------------------
   Now team-aware: shows the current team's name and season, and
   includes the TeamSwitcher so the user can jump to a different
   team without typing a URL.

   Props:
     team  — the current team object ({ id, name, slug, season })
     teams — all teams (passed through to TeamSwitcher)
================================================================ */
function PageHeader({ team, teams }) {
  // Defensive: during the very first render before teams load,
  // team is null. Show a placeholder so the layout doesn't jump.
  const teamName  = team ? team.name   : '…'
  const season    = team ? team.season : ''

  return (
    <header>
      <div className="header-inner">
        <PixelPlayers />

        <div className="header-center">
          <h1 className="team-name">{teamName}</h1>
          {season && <p className="season-label">{season} Season</p>}
        </div>

        <PixelPlayers mirrored />
      </div>

      {/* Team switcher sits below the title so it doesn't crowd the
          pixel players. Hidden when there's only one team. */}
      <TeamSwitcher teams={teams} currentSlug={team ? team.slug : ''} />
    </header>
  )
}

export default App
