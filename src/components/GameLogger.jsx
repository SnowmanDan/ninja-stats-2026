/*
  GameLogger.jsx
  --------------
  Live game logger. All events and game data are held in React state
  until the coach taps "Save Game". Only then is anything written to
  Supabase — one INSERT for the game row, one INSERT for the stats.

  This means Cancel is a free local reset: nothing has been written,
  so there is nothing to delete or clean up.

  Save flow:
    1. INSERT into games (date, opponent, final scores, notes, team_id)
       → Supabase returns the new row including its auto-generated id
    2. INSERT into game_stats (one row per player who had any events),
       using the id from step 1
    3. Call onBack() so App re-fetches and shows the updated dashboard

  Props:
    game    — draft game data { date, opponent } from GameSetup
    db      — Supabase client (used only on save)
    players — array of { id, name, number } from App state
    teamId  — the current team's id (needed for the games INSERT)
    onBack  — callback() called after saving or cancelling
*/

import { useState, useEffect, useRef } from 'react'

/* The five things a coach can log for a player */
const EVENT_TYPES = ['Goal', 'Assist', 'Shot on Goal', 'Save', 'Goal Allowed']

/* ---- localStorage draft helpers --------------------------------
   Key is scoped to the team so a Ninjas draft never bleeds into
   a different team's logger on the same device.
----------------------------------------------------------------- */
function draftKey(teamId)    { return `ninja-stats-draft-${teamId}` }
function readDraft(teamId)   {
  try { const r = localStorage.getItem(draftKey(teamId)); return r ? JSON.parse(r) : null }
  catch { return null }
}
function clearDraft(teamId)  { localStorage.removeItem(draftKey(teamId)) }

/*
  formatDate — "2026-04-16" → "April 16, 2026"
  T00:00:00 forces local midnight so US time zones show the right day.
*/
function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

export default function GameLogger({ game, db, players, teamId, onBack }) {

  /* ---- Logging state ------------------------------------------ */

  /*
    events, phase, and notes are restored from localStorage on mount
    so a refresh or crash doesn't lose in-progress work.
    Each entry: { id (unique int), player { id, name, number }, type (string) }
    nextId starts above the highest saved id to avoid collisions.
  */
  const [events,         setEvents]         = useState(() => readDraft(teamId)?.events ?? [])
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const nextId = useRef((() => {
    const ids = readDraft(teamId)?.events?.map((e) => e.id) ?? []
    return ids.length ? Math.max(...ids) + 1 : 0
  })())

  /* ---- Phase / save state ------------------------------------- */

  /*
    phase: 'logging' = main game view  |  'confirm' = end-game confirmation
  */
  const [phase,     setPhase]     = useState(() => readDraft(teamId)?.phase ?? 'logging')
  const [notes,     setNotes]     = useState(() => readDraft(teamId)?.notes ?? '')
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState(null)

  /* ---- Draft persistence -------------------------------------- */

  /*
    Write the current session to localStorage after every change so
    a crash or refresh can be recovered. The draft is cleared on a
    successful save or a deliberate cancel — not on every unmount,
    because an accidental navigation IS what we want to recover from.
  */
  useEffect(() => {
    try {
      localStorage.setItem(draftKey(teamId), JSON.stringify({ teamId, game, events, notes, phase }))
    } catch (err) {
      console.warn('Could not persist game draft:', err)
    }
  }, [events, notes, phase])

  /* ---- Cancel state ------------------------------------------- */

  /*
    No async work needed — cancelling just calls onBack().
    showCancelConfirm controls the "Are you sure?" prompt.
  */
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  /* ---- Derived scores ----------------------------------------- */

  /*
    Ninjas score = total Goal events logged.
    Opponent score = total Goal Allowed events logged.
    These update live as events are added or removed.
  */
  const ninjasScore   = events.filter((e) => e.type === 'Goal').length
  const opponentScore = events.filter((e) => e.type === 'Goal Allowed').length

  /* ---- Event handlers ----------------------------------------- */

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
    handleSave — write everything to Supabase in two sequential steps,
    then return to the dashboard.

    Step 1: INSERT the game row with final scores and notes.
            We do this here (not in GameSetup) so a cancelled game
            never touches the database.

    Step 2: INSERT one game_stats row per player who had any events,
            using the game id returned by step 1.
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

    /* Step 2: INSERT the game row — final scores are known now */
    const { data: savedGame, error: gameError } = await db
      .from('games')
      .insert({
        date:           game.date,
        opponent:       game.opponent,
        team_score:     ninjasScore,
        opponent_score: opponentScore,
        notes:          notes.trim() || null,
        team_id:        teamId,
      })
      .select()
      .single()

    if (gameError) {
      console.error('Supabase game insert error:', gameError)
      setSaveError('Could not save game. Check the browser console for details.')
      setSaving(false)
      return
    }

    /* Step 3: INSERT game_stats rows (skip if no events were logged) */
    const statsRows = Object.entries(statsByPlayer).map(([player_id, stats]) => ({
      game_id:   savedGame.id, /* id came back from step 2 */
      player_id: Number(player_id),
      ...stats,
    }))

    if (statsRows.length > 0) {
      const { error: statsError } = await db.from('game_stats').insert(statsRows)

      if (statsError) {
        console.error('Supabase stats insert error:', statsError)
        /*
          The game row was already saved. Stats failed, but don't leave
          the coach stranded — show a specific message so they know what
          happened and can check the console.
        */
        setSaveError('Game saved but stats could not be written. Check the browser console.')
        setSaving(false)
        return
      }
    }

    /* Both writes succeeded — clear the draft and return to dashboard */
    clearDraft(teamId)
    onBack()
  }

  /* ---- Confirm (end-game) phase ------------------------------- */

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

          <div className="confirm-summary">
            <span className="confirm-score-text">
              Ninjas {ninjasScore} – {opponentScore} {game.opponent}
            </span>
            <span className={`result-badge ${resultClass}`}>{resultLabel}</span>
          </div>

          <p className="confirm-event-count">
            {events.length} event{events.length !== 1 ? 's' : ''} logged
          </p>

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

      {/* ── Cancel confirmation ──────────────────────────────────── */}
      {showCancelConfirm && (
        <div className="card cancel-confirm-card">
          <p className="cancel-confirm-question">Cancel this game?</p>
          <p className="cancel-confirm-detail">
            No data has been saved yet. All logged events will be discarded.
          </p>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={() => { clearDraft(teamId); onBack() }}>
              Yes, Cancel Game
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => setShowCancelConfirm(false)}
            >
              No, Keep Playing
            </button>
          </div>
        </div>
      )}

      {/* ── End game / Cancel bar ────────────────────────────────── */}
      <div className="logger-end-bar">
        <button
          className="btn btn-end-game"
          onClick={() => setPhase('confirm')}
        >
          End Game
        </button>
        <button
          className="btn btn-cancel-game"
          onClick={() => { setShowCancelConfirm(true); setSelectedPlayer(null) }}
        >
          Cancel Game
        </button>
      </div>

    </div>
  )
}
