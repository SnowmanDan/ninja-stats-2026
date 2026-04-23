/*
  GameLogger.jsx
  --------------
  Live game logger — handles both new games and editing existing ones.

  New game flow (game.id is undefined):
    1. All events held in React state (+ localStorage draft for crash recovery)
    2. On save: INSERT games → INSERT game_stats
    3. Cancel clears the draft and calls onBack()

  Edit flow (game.id is set):
    1. game.initialEvents are pre-populated from existing game_stats
    2. game.initialNotes is pre-populated from the existing game row
    3. localStorage draft is NOT used — edits aren't crash-recovered
    4. On save: UPDATE games → preserve minutes_in_goal → DELETE game_stats → INSERT game_stats
    5. "Cancel" discards changes and calls onBack() (nothing to clean up in DB)

  Props:
    game    — { date, opponent, [id], [initialEvents], [initialNotes] }
    db      — Supabase client
    players — array of { id, name, number } from App state
    teamId  — the current team's id (needed for INSERT)
    onBack  — callback() called after saving or cancelling
*/

import { useState, useEffect, useRef } from 'react'

/* The six events a coach can log for a player */
const EVENT_TYPES = ['Goal', 'Assist', 'Shot on Goal', 'Tackle', 'Save', 'Goal Allowed']

/* Definitions shown in the collapsible Event Guide at the bottom of the screen */
const EVENT_DEFINITIONS = [
  { type: 'Goal',         def: 'The ball crosses the opponent\'s goal line. Credited to the player who kicked it in.' },
  { type: 'Assist',       def: 'A pass or touch that directly led to a goal. The player who set up the scorer gets the assist.' },
  { type: 'Shot on Goal', def: 'Any shot that would have gone in if the goalie hadn\'t stopped it. Does not include shots that miss wide or go over.' },
  { type: 'Tackle',       def: 'Successfully taking the ball away from an opponent. The defending player who wins the ball gets the tackle.' },
  { type: 'Save',         def: 'The goalie stops a shot that would have gone in. Only the goalie gets saves.' },
  { type: 'Goal Allowed', def: 'The opponent scores. Credited to the goalie who was in net when the goal happened.' },
]

/* ---- localStorage draft helpers --------------------------------
   Only used for new games — edits aren't drafted to localStorage.
----------------------------------------------------------------- */
function draftKey(teamId)   { return `ninja-stats-draft-${teamId}` }
function readDraft(teamId)  {
  try { const r = localStorage.getItem(draftKey(teamId)); return r ? JSON.parse(r) : null }
  catch { return null }
}
function clearDraft(teamId) { localStorage.removeItem(draftKey(teamId)) }

/*
  formatDate — "2026-04-16" → "April 16, 2026"
  T00:00:00 forces local midnight so US time zones show the right day.
*/
function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

/* formatTime — turns a number of seconds into "MM:SS" */
function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function GameLogger({ game, db, players, teamId, onBack }) {

  const isEditMode = !!game.id

  /* ---- Timer state -------------------------------------------- */

  const [halfLength,   setHalfLength]   = useState(25)   // minutes per half
  const [timerSeconds, setTimerSeconds] = useState(25*60) // counts down
  const [timerRunning, setTimerRunning] = useState(false)
  const [half,         setHalf]         = useState(1)     // 1 or 2
  const [isHalftime,   setIsHalftime]   = useState(false)
  const [gameStarted,  setGameStarted]  = useState(false) // locks the half-length picker

  const timerRef = useRef(null)
  const halfRef  = useRef(1) // ref so the interval callback always sees the current half

  /* Refs used for auto-scrolling between player grid and event buttons */
  const playerSectionRef = useRef(null)
  const eventSectionRef  = useRef(null)

  /* When the coach changes the half length before the game starts, reset the clock */
  useEffect(() => {
    if (!gameStarted) setTimerSeconds(halfLength * 60)
  }, [halfLength])

  /* Clean up the interval if the component unmounts mid-game */
  useEffect(() => {
    return () => clearInterval(timerRef.current)
  }, [])

  function startTimer() {
    if (timerRunning) return
    setTimerRunning(true)
    setGameStarted(true)
    timerRef.current = setInterval(() => {
      setTimerSeconds((s) => {
        if (s <= 1) {
          /* Time is up for this half — pause and show halftime if 1st half */
          clearInterval(timerRef.current)
          setTimerRunning(false)
          if (halfRef.current === 1) setIsHalftime(true)
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

  function pauseTimer() {
    clearInterval(timerRef.current)
    setTimerRunning(false)
  }

  function resetTimer() {
    clearInterval(timerRef.current)
    setTimerRunning(false)
    setTimerSeconds(halfLength * 60)
    setHalf(1)
    halfRef.current = 1
    setIsHalftime(false)
    setGameStarted(false)
  }

  /* Called when the coach taps "Start 2nd Half" — resets clock for half 2 */
  function startSecondHalf() {
    setIsHalftime(false)
    setHalf(2)
    halfRef.current = 2
    setTimerSeconds(halfLength * 60)
  }

  /* ---- Logging state ------------------------------------------ */

  /*
    In edit mode: start from game.initialEvents (reconstructed from DB).
    In new game mode: restore from localStorage draft if available.
    nextId starts above the highest existing event id to avoid collisions.
  */
  const [events, setEvents] = useState(() =>
    isEditMode
      ? (game.initialEvents ?? [])
      : (readDraft(teamId)?.events ?? [])
  )
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const nextId = useRef((() => {
    const src = isEditMode ? (game.initialEvents ?? []) : (readDraft(teamId)?.events ?? [])
    const ids  = src.map((e) => e.id)
    return ids.length ? Math.max(...ids) + 1 : 0
  })())

  /* ---- Phase / save state ------------------------------------- */

  const [phase,     setPhase]     = useState(() =>
    isEditMode ? 'logging' : (readDraft(teamId)?.phase ?? 'logging')
  )
  const [notes,     setNotes]     = useState(() =>
    isEditMode ? (game.initialNotes ?? '') : (readDraft(teamId)?.notes ?? '')
  )
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState(null)

  /* ---- Draft persistence (new games only) --------------------- */

  /*
    Write to localStorage on every change so a crash can be recovered.
    Skipped in edit mode — the original game is safe in Supabase; we
    don't want a partial edit overwriting the new-game draft slot.
  */
  useEffect(() => {
    if (isEditMode) return
    try {
      localStorage.setItem(draftKey(teamId), JSON.stringify({ teamId, game, events, notes, phase }))
    } catch (err) {
      console.warn('Could not persist game draft:', err)
    }
  }, [events, notes, phase])

  /* ---- Cancel state ------------------------------------------- */

  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showEventGuide,   setShowEventGuide]   = useState(false)

  /* ---- Derived scores ----------------------------------------- */

  const ninjasScore   = events.filter((e) => e.type === 'Goal').length
  const opponentScore = events.filter((e) => e.type === 'Goal Allowed').length

  /* ---- Event handlers ----------------------------------------- */

  function handlePlayerSelect(player) {
    const isDeselecting = selectedPlayer?.id === player.id
    setSelectedPlayer(isDeselecting ? null : player)
    /* Scroll down to the event buttons so the coach can tap right away */
    if (!isDeselecting) {
      setTimeout(() => {
        eventSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 0)
    }
  }

  function handleEvent(type) {
    const id = nextId.current++
    setEvents((prev) => [...prev, { id, player: selectedPlayer, type }])
    setSelectedPlayer(null)
    /* Scroll back up to the player grid so the next player can be selected */
    setTimeout(() => {
      playerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  function handleRemoveEvent(id) {
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }

  /* ---- Save --------------------------------------------------- */

  async function handleSave() {
    setSaving(true)
    setSaveError(null)

    /* Aggregate events by player_id — same for both modes */
    const statsByPlayer = {}
    events.forEach(({ player, type }) => {
      if (!statsByPlayer[player.id]) {
        statsByPlayer[player.id] = { goals: 0, assists: 0, shots_on_goal: 0, tackles: 0, saves: 0, goals_allowed: 0 }
      }
      if (type === 'Goal')         statsByPlayer[player.id].goals++
      if (type === 'Assist')       statsByPlayer[player.id].assists++
      if (type === 'Shot on Goal') statsByPlayer[player.id].shots_on_goal++
      if (type === 'Tackle')       statsByPlayer[player.id].tackles++
      if (type === 'Save')         statsByPlayer[player.id].saves++
      if (type === 'Goal Allowed') statsByPlayer[player.id].goals_allowed++
    })

    if (isEditMode) {
      /* ---- Edit mode: UPDATE game + replace stats ---- */

      const { error: updateError } = await db
        .from('games')
        .update({
          date:           game.date,
          opponent:       game.opponent,
          team_score:     ninjasScore,
          opponent_score: opponentScore,
          notes:          notes.trim() || null,
        })
        .eq('id', game.id)

      if (updateError) {
        console.error('Game update error:', updateError)
        setSaveError('Could not update game. Check the browser console for details.')
        setSaving(false)
        return
      }

      /*
        Preserve minutes_in_goal — the logger doesn't track it through events,
        so we fetch the existing values before wiping the stats rows and
        carry them forward into the new INSERT.
      */
      const { data: existingStats } = await db
        .from('game_stats')
        .select('player_id, minutes_in_goal')
        .eq('game_id', game.id)

      const minutesMap = {}
      existingStats?.forEach((s) => { minutesMap[s.player_id] = s.minutes_in_goal || 0 })

      /* DELETE all existing stats for this game */
      const { error: deleteError } = await db
        .from('game_stats')
        .delete()
        .eq('game_id', game.id)

      if (deleteError) {
        console.error('Stats delete error:', deleteError)
        setSaveError('Could not replace stats. Check the browser console for details.')
        setSaving(false)
        return
      }

      /* INSERT updated stats, restoring any goalie minutes */
      const statsRows = Object.entries(statsByPlayer).map(([player_id, stats]) => ({
        game_id:         game.id,
        player_id:       Number(player_id),
        minutes_in_goal: minutesMap[Number(player_id)] || 0,
        ...stats,
      }))

      if (statsRows.length > 0) {
        const { error: insertError } = await db.from('game_stats').insert(statsRows)
        if (insertError) {
          console.error('Stats insert error:', insertError)
          setSaveError(`Stats save failed: ${insertError.message || insertError.code || 'unknown error'}`)
          setSaving(false)
          return
        }
      }

    } else {
      /* ---- New game mode: INSERT game → INSERT stats ---- */

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

      const statsRows = Object.entries(statsByPlayer).map(([player_id, stats]) => ({
        game_id:   savedGame.id,
        player_id: Number(player_id),
        ...stats,
      }))

      if (statsRows.length > 0) {
        const { error: statsError } = await db.from('game_stats').insert(statsRows)
        if (statsError) {
          console.error('Supabase stats insert error:', statsError)
          setSaveError('Game saved but stats could not be written. Check the browser console.')
          setSaving(false)
          return
        }
      }
    }

    clearDraft(teamId)
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
        <div className="logger-scoreboard">
          <span className="logger-score-team">Ninjas</span>
          <span className="logger-score-num ninjas-score">{ninjasScore}</span>
          <span className="logger-score-sep">–</span>
          <span className="logger-score-num opp-score">{opponentScore}</span>
          <span className="logger-score-team">{game.opponent}</span>
        </div>

        <div className="card">
          <h2 className="section-title">{isEditMode ? 'Review Changes' : 'End Game'}</h2>

          <div className="confirm-summary">
            <span className="confirm-score-text">
              Ninjas {ninjasScore} – {opponentScore} {game.opponent}
            </span>
            <span className={`result-badge ${resultClass}`}>{resultLabel}</span>
          </div>

          <p className="confirm-event-count">
            {events.length} event{events.length !== 1 ? 's' : ''} logged
          </p>

          {saveError && <p className="form-error">{saveError}</p>}

          <div className="form-actions">
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : isEditMode ? 'Save Changes' : 'Save Game'}
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

      {/* ── Game timer ───────────────────────────────────────────── */}
      <div className="card timer-card">

        {/* Main row: half label + clock + controls */}
        <div className="timer-main-row">
          <span className={`timer-half-label${isHalftime ? ' halftime' : ''}`}>
            {isHalftime ? 'HALF TIME!' : `${half === 1 ? '1st' : '2nd'} Half`}
          </span>
          <span className="timer-display">{formatTime(timerSeconds)}</span>
          {isHalftime ? (
            /* Halftime: single button to start 2nd half */
            <button className="timer-btn timer-btn-second-half" onClick={startSecondHalf}>
              2nd Half
            </button>
          ) : (
            <div className="timer-controls">
              {!timerRunning ? (
                <button className="timer-btn timer-btn-play" onClick={startTimer} aria-label="Play">▶</button>
              ) : (
                <button className="timer-btn timer-btn-pause" onClick={pauseTimer} aria-label="Pause">⏸</button>
              )}
              <button className="timer-btn timer-btn-reset" onClick={resetTimer} aria-label="Reset">↺</button>
            </div>
          )}
        </div>

        {/* Half-length picker — only visible before the game starts */}
        {!gameStarted && (
          <div className="timer-half-picker">
            <span className="timer-half-picker-label">Half length:</span>
            {[15, 20, 25, 30, 35, 40, 45].map((min) => (
              <button
                key={min}
                className={`timer-half-opt${halfLength === min ? ' selected' : ''}`}
                onClick={() => setHalfLength(min)}
              >
                {min}
              </button>
            ))}
          </div>
        )}

      </div>

      {/* ── Player selector ──────────────────────────────────────── */}
      <div className="card" ref={playerSectionRef}>
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
        <div className="card" ref={eventSectionRef}>
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

      {/* ── Game notes ───────────────────────────────────────────── */}
      <div className="card">
        <label className="form-label" htmlFor="game-notes">Game Notes (optional)</label>
        <textarea
          id="game-notes"
          className="form-input form-textarea"
          placeholder="Great defensive game, Eleanora had two saves…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      {/* ── Event guide ──────────────────────────────────────────── */}
      <div className="card event-guide-card">
        <button
          className="event-guide-toggle"
          onClick={() => setShowEventGuide((v) => !v)}
        >
          <span>Event Guide</span>
          <span className="event-guide-chevron">{showEventGuide ? '▲' : '▼'}</span>
        </button>
        {showEventGuide && (
          <dl className="event-guide-list">
            {EVENT_DEFINITIONS.map(({ type, def }) => (
              <div key={type} className="event-guide-item">
                <dt className="event-guide-term">{type}</dt>
                <dd className="event-guide-def">{def}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* ── Cancel / Discard confirmation ────────────────────────── */}
      {showCancelConfirm && (
        <div className="card cancel-confirm-card">
          <p className="cancel-confirm-question">
            {isEditMode ? 'Discard changes?' : 'Cancel this game?'}
          </p>
          <p className="cancel-confirm-detail">
            {isEditMode
              ? 'Your changes will not be saved. The original game data will be kept.'
              : 'No data has been saved yet. All logged events will be discarded.'}
          </p>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={() => { clearDraft(teamId); onBack() }}>
              {isEditMode ? 'Yes, Discard' : 'Yes, Cancel Game'}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => setShowCancelConfirm(false)}
            >
              {isEditMode ? 'Keep Editing' : 'No, Keep Playing'}
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
          {isEditMode ? 'Review Changes' : 'End Game'}
        </button>
        <button
          className="btn btn-cancel-game"
          onClick={() => { setShowCancelConfirm(true); setSelectedPlayer(null) }}
        >
          {isEditMode ? 'Discard' : 'Cancel Game'}
        </button>
      </div>

    </div>
  )
}
