/*
  GameLogger.jsx
  --------------
  Live game logger. All events are held in React state until the
  user taps "Save Game", at which point we write to Supabase in one
  batch. Nothing is written mid-game.

  Flow:
    'logging' phase — score + player grid + event buttons + event log
    'confirm' phase — final score + notes textarea + Save / Keep Logging

  Props:
    game    — Supabase games row { id, date, opponent, ... }
    db      — Supabase client (used only on save)
    players — array of { id, name, number } from App state
    onBack  — callback() called after saving (or if user navigates away)
*/

import { useState, useRef } from 'react'

/* The five things a coach can log for a player */
const EVENT_TYPES = ['Goal', 'Assist', 'Shot on Goal', 'Save', 'Goal Allowed']

/*
  formatDate — "2026-04-12" → "April 12, 2026"
  T00:00:00 forces local midnight so US time zones show the right day.
*/
function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

export default function GameLogger({ game, db, players, onBack }) {

  /* ---- Logging state ------------------------------------------ */

  /*
    events — chronological list of everything logged this game.
    Each entry: { id (unique int), player { id, name, number }, type (string) }
    We use a ref for the next id so it increments without causing re-renders.
  */
  const [events,         setEvents]         = useState([])
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const nextId = useRef(0)

  /* ---- Phase / save state ------------------------------------- */

  /*
    phase: 'logging' = main game view  |  'confirm' = end-game confirmation
  */
  const [phase,     setPhase]     = useState('logging')
  const [notes,     setNotes]     = useState('')
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState(null)

  /* ---- Derived scores ----------------------------------------- */

  /*
    Ninjas score = total Goal events logged.
    Opponent score = total Goal Allowed events logged.
    These update live as events are added or removed.
  */
  const ninjasScore   = events.filter((e) => e.type === 'Goal').length
  const opponentScore = events.filter((e) => e.type === 'Goal Allowed').length

  /* ---- Handlers ----------------------------------------------- */

  function handlePlayerSelect(player) {
    /* Tap the already-selected player to deselect */
    setSelectedPlayer((prev) => (prev?.id === player.id ? null : player))
  }

  function handleEvent(type) {
    const id = nextId.current++
    setEvents((prev) => [...prev, { id, player: selectedPlayer, type }])
    /* Deselect after logging so the coach picks the next player */
    setSelectedPlayer(null)
  }

  function handleRemoveEvent(id) {
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }

  /*
    handleSave — aggregate events → write to Supabase → return to dashboard.

    Steps:
      1. Build one stats object per player (goals, assists, etc.)
      2. INSERT those rows into game_stats
      3. UPDATE the games row with final scores + notes
      4. Call onBack() so App re-fetches and shows the updated dashboard
  */
  async function handleSave() {
    setSaving(true)
    setSaveError(null)

    /* Step 1: aggregate events by player_id */
    const statsByPlayer = {}
    events.forEach(({ player, type }) => {
      if (!statsByPlayer[player.id]) {
        statsByPlayer[player.id] = {
          goals: 0, assists: 0, shots_on_goal: 0, saves: 0, goals_allowed: 0,
        }
      }
      if (type === 'Goal')         statsByPlayer[player.id].goals++
      if (type === 'Assist')       statsByPlayer[player.id].assists++
      if (type === 'Shot on Goal') statsByPlayer[player.id].shots_on_goal++
      if (type === 'Save')         statsByPlayer[player.id].saves++
      if (type === 'Goal Allowed') statsByPlayer[player.id].goals_allowed++
    })

    /* Build the rows array (one per player who had any event) */
    const statsRows = Object.entries(statsByPlayer).map(([player_id, stats]) => ({
      game_id:   game.id,
      player_id: Number(player_id),
      ...stats,
    }))

    /* Step 2 + 3: run both writes in parallel for speed */
    const writes = []

    if (statsRows.length > 0) {
      writes.push(db.from('game_stats').insert(statsRows))
    }

    writes.push(
      db.from('games')
        .update({
          team_score:     ninjasScore,
          opponent_score: opponentScore,
          notes:          notes.trim() || null,
        })
        .eq('id', game.id)
    )

    const results = await Promise.all(writes)
    const firstErr = results.find((r) => r.error)?.error
    if (firstErr) {
      console.error('Supabase save error:', firstErr)
      setSaveError('Could not save game. Check the browser console for details.')
      setSaving(false)
      return
    }

    /* Success — App.jsx will refetch the dashboard */
    onBack()
  }

  /* ---- Confirm phase ------------------------------------------ */

  if (phase === 'confirm') {
    const resultLabel =
      ninjasScore > opponentScore ? 'Win'
      : ninjasScore < opponentScore ? 'Loss'
      : 'Tie'

    const resultClass =
      ninjasScore > opponentScore ? 'win'
      : ninjasScore < opponentScore ? 'loss'
      : 'tie'

    return (
      <div>
        {/* Score banner */}
        <div className="logger-scoreboard">
          <span className="logger-score-team">Ninjas</span>
          <span className="logger-score-num ninjas-score">{ninjasScore}</span>
          <span className="logger-score-sep">–</span>
          <span className="logger-score-num opp-score">{opponentScore}</span>
          <span className="logger-score-team">{game.opponent}</span>
        </div>

        <div className="card">
          <h2 className="section-title">End Game</h2>

          {/* Final score + result badge */}
          <div className="confirm-summary">
            <span className="confirm-score-text">
              Ninjas {ninjasScore} – {opponentScore} {game.opponent}
            </span>
            <span className={`result-badge ${resultClass}`}>{resultLabel}</span>
          </div>

          <p className="confirm-event-count">
            {events.length} event{events.length !== 1 ? 's' : ''} logged
          </p>

          {/* Optional notes */}
          <div className="form-group">
            <label className="form-label" htmlFor="game-notes">
              Game Notes (optional)
            </label>
            <textarea
              id="game-notes"
              className="form-input form-textarea"
              placeholder="Great defensive game, Eleanora had two saves…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {saveError && <p className="form-error">{saveError}</p>}

          <div className="form-actions">
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save Game'}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => { setPhase('logging'); setSaveError(null) }}
              disabled={saving}
            >
              Keep Logging
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ---- Logging phase ------------------------------------------ */

  return (
    <div>

      {/* ── Live scoreboard ──────────────────────────────────────── */}
      <div className="logger-scoreboard">
        <span className="logger-score-team">Ninjas</span>
        <span className="logger-score-num ninjas-score">{ninjasScore}</span>
        <span className="logger-score-sep">–</span>
        <span className="logger-score-num opp-score">{opponentScore}</span>
        <span className="logger-score-team">{game.opponent}</span>
      </div>

      <p className="logger-game-date">{formatDate(game.date)}</p>

      {/* ── Player selector ──────────────────────────────────────── */}
      <div className="card">
        <h2 className="section-title">
          {selectedPlayer ? `Selected: ${selectedPlayer.name}` : 'Select Player'}
        </h2>

        <div className="player-grid">
          {[...players]
            .sort((a, b) => a.number - b.number)
            .map((p) => (
              <button
                key={p.id}
                className={`player-btn${selectedPlayer?.id === p.id ? ' selected' : ''}`}
                onClick={() => handlePlayerSelect(p)}
              >
                {/* Jersey number on top, first name below */}
                <span className="player-btn-num">#{p.number}</span>
                <span className="player-btn-name">{p.name.split(' ')[0]}</span>
              </button>
            ))}
        </div>
      </div>

      {/* ── Event buttons (only shown when a player is selected) ─── */}
      {selectedPlayer && (
        <div className="card">
          <h2 className="section-title">Log Event — {selectedPlayer.name}</h2>
          <div className="event-btn-grid">
            {EVENT_TYPES.map((type) => (
              <button
                key={type}
                className="btn btn-event"
                onClick={() => handleEvent(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Event log ────────────────────────────────────────────── */}
      {events.length > 0 && (
        <div className="card">
          <h2 className="section-title">
            Event Log
            <span className="event-log-count">{events.length}</span>
          </h2>
          {/*
            Reverse so the most recent event appears at the top —
            easier to see what you just tapped without scrolling.
            We spread to avoid mutating the state array.
          */}
          <ul className="event-log">
            {[...events].reverse().map((e) => (
              <li key={e.id} className="event-log-item">
                <span className="event-log-text">
                  <span className="event-log-player">{e.player.name}</span>
                  <span className="event-log-sep"> — </span>
                  <span className={`event-log-type type-${e.type.replace(/\s+/g, '-').toLowerCase()}`}>
                    {e.type}
                  </span>
                </span>
                <button
                  className="event-log-remove"
                  onClick={() => handleRemoveEvent(e.id)}
                  aria-label={`Remove: ${e.player.name} ${e.type}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── End game ─────────────────────────────────────────────── */}
      <div className="logger-end-bar">
        <button
          className="btn btn-end-game"
          onClick={() => setPhase('confirm')}
        >
          End Game
        </button>
      </div>

    </div>
  )
}
