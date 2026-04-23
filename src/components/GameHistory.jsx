/*
  GameHistory.jsx
  ===============
  A list of every game played this season, newest first.
  Supports swipe-left on each row to reveal a red Delete button.

  Why a <ul> instead of a <table>?
  ---------------------------------
  CSS transform (translateX) doesn't work reliably on <tr> elements —
  they're table-internal elements with limited layout control. A flex
  list gives us full control over the sliding animation.

  Swipe behavior:
    - Touch + drag left > THRESHOLD px → row snaps open, Delete button visible
    - Touch + drag left < THRESHOLD px → row snaps back (accidental swipe)
    - Touch + drag right on open row   → row snaps closed
    - Tap anywhere in the section      → closes any open row
    - Only one row can be open at a time

  Delete flow:
    1. Tap Delete button → confirmation modal
    2. Confirm → Supabase DELETE → filter game out of local state
    3. No parent refetch — ON DELETE CASCADE handles game_stats cleanup

  Props
  -----
  games  — sorted newest-first: [{ id, date, opponent, teamScore, opponentScore }, …]
  db     — Supabase client (used for DELETE)
*/

import { useState, useRef } from 'react'

const OPEN_OFFSET = 160  /* px the row slides left to reveal edit + delete buttons */
const THRESHOLD   = 80   /* minimum px swipe before we snap-open instead of snap-back */

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })
}

export default function GameHistory({ games: gamesProp, db, onDelete, onEdit, onSelectGame, selectedGameId }) {
  /*
    localGames — initialized from the prop once at mount.
    We manage it locally so a successful delete removes the row instantly
    without waiting for the parent to refetch.

    Note: we intentionally don't sync from the prop via useEffect because
    syncing would overwrite local deletions whenever App re-renders.
  */
  const [localGames,   setLocalGames]   = useState(gamesProp)
  const [openId,       setOpenIdState]  = useState(null)   /* id of the currently swiped-open row */
  const openIdRef = useRef(null)  /* mirrors openId but readable synchronously in click handlers */

  function setOpenId(id) {
    openIdRef.current = id
    setOpenIdState(id)
  }
  const [confirmGame,  setConfirmGame]  = useState(null)   /* game pending delete confirmation */
  const [deleting,     setDeleting]     = useState(false)
  const [deleteError,  setDeleteError]  = useState(null)
  const [photoGame,    setPhotoGame]    = useState(null)   /* game whose photo is shown in the modal */

  /*
    rowRefs — direct DOM references to each sliding row element.
    We manipulate el.style.transform directly during swipe (no re-renders per frame).
  */
  const rowRefs = useRef({})  /* { [gameId]: HTMLElement } */

  /* Touch state tracked in refs — these change every frame but don't need re-renders */
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const isScrolling = useRef(false) /* true once we detect vertical scroll intent */
  const wasSwiping  = useRef(false) /* true if the touch moved enough to count as a swipe */

  /* ---- Row helpers -------------------------------------------- */

  function closeRow(id) {
    const el = rowRefs.current[id]
    if (el) {
      el.style.transition = 'transform 0.2s ease-out'
      el.style.transform  = 'translateX(0)'
    }
    setOpenId(null)
  }

  function openRow(id) {
    const el = rowRefs.current[id]
    if (el) {
      el.style.transition = 'transform 0.2s ease-out'
      el.style.transform  = `translateX(-${OPEN_OFFSET}px)`
    }
    setOpenId(id)
  }

  /* ---- Touch handlers ----------------------------------------- */

  function handleTouchStart(e, id) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    isScrolling.current = false
    wasSwiping.current  = false

    /* Close any previously open row before this swipe begins */
    if (openId !== null && openId !== id) {
      closeRow(openId)
    }
  }

  function handleTouchMove(e, id) {
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = e.touches[0].clientY - touchStartY.current

    /* Mark as a swipe once the finger moves enough — prevents tap from
       accidentally triggering a row select when the finger barely moves */
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) wasSwiping.current = true

    /*
      Detect vertical scroll intent on the first meaningful movement.
      Once detected, ignore the rest of this touch sequence so we don't
      interfere with the page scroll.
    */
    if (!isScrolling.current && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 5) {
      isScrolling.current = true
      return
    }
    if (isScrolling.current) return

    /* Row starts at 0 (closed) or -OPEN_OFFSET (open) */
    const baseOffset = openId === id ? -OPEN_OFFSET : 0
    const rawOffset  = baseOffset + dx

    /* Clamp: can't drag right of closed (0) or left of fully open (-OPEN_OFFSET) */
    const clamped = Math.min(0, Math.max(-OPEN_OFFSET, rawOffset))

    const el = rowRefs.current[id]
    if (el) {
      el.style.transition = 'none'  /* remove easing while finger is actively dragging */
      el.style.transform  = `translateX(${clamped}px)`
    }
  }

  function handleTouchEnd(e, id) {
    if (isScrolling.current) return

    const dx          = e.changedTouches[0].clientX - touchStartX.current
    const baseOffset  = openId === id ? -OPEN_OFFSET : 0
    const finalOffset = baseOffset + dx

    if (finalOffset < -THRESHOLD) {
      openRow(id)
    } else {
      closeRow(id)
    }
  }

  /* ---- Row tap (select game) ---------------------------------- */

  function handleRowClick(e, game) {
    /* Ignore if this was really a swipe, or if a row was just opened.
       Check openIdRef (not openId state) — React state is async and
       may not have updated yet when this click handler fires. */
    if (wasSwiping.current) return
    if (openIdRef.current !== null) return
    e.stopPropagation()
    onSelectGame?.(game.id)
  }

  /* ---- Delete flow -------------------------------------------- */

  function handleDeleteClick(e, game) {
    /*
      Stop propagation so the section's onClick handler (which closes open rows)
      doesn't fire simultaneously and close the row before the modal appears.
    */
    e.stopPropagation()
    setConfirmGame(game)
    setDeleteError(null)
  }

  async function handleDeleteConfirm() {
    if (!confirmGame) return
    setDeleting(true)
    setDeleteError(null)

    const { error, count } = await db
      .from('games')
      .delete({ count: 'exact' })
      .eq('id', confirmGame.id)

    if (error) {
      console.error('Supabase delete error:', error)
      setDeleteError('Delete failed. Check the browser console for details.')
      setDeleting(false)
      return
    }

    /*
      count === 0 with no error means the row exists but the DELETE was
      silently blocked — most likely by a missing RLS policy.
    */
    if (count === 0) {
      console.error('Delete silently blocked — check RLS policies on games table.')
      setDeleteError('Delete was blocked. Check RLS policies in the Supabase dashboard.')
      setDeleting(false)
      return
    }

    /*
      Success. Remove from local state immediately.
      ON DELETE CASCADE on game_stats.game_id handles child row cleanup.
    */
    setLocalGames((prev) => prev.filter((g) => g.id !== confirmGame.id))
    onDelete?.(confirmGame.id)
    setOpenId(null)
    setConfirmGame(null)
    setDeleting(false)
  }

  function handleDeleteCancel() {
    if (openId !== null) closeRow(openId)
    setConfirmGame(null)
    setDeleteError(null)
  }

  /* ---- Render ------------------------------------------------- */

  return (
    <section
      className="card"
      aria-labelledby="game-history-heading"
      /* Tap anywhere in the section to close any open row */
      onClick={() => { if (openId !== null) closeRow(openId) }}
    >
      <h2 className="section-title" id="game-history-heading">Game History</h2>

      {/* Column headers — matches the visual style of the old <thead> */}
      <div className="gh-header" aria-hidden="true">
        <span className="gh-col-date">Date</span>
        <span className="gh-col-opponent">Opponent</span>
        <span className="gh-col-score">Score</span>
        <span className="gh-col-result">Result</span>
      </div>

      {localGames.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontStyle: 'italic' }}>
          No games played yet.
        </p>
      ) : (
        <ul className="gh-list" role="list">
          {localGames.map((g, i) => {
            const result =
              g.teamScore > g.opponentScore ? 'win'  :
              g.teamScore < g.opponentScore ? 'loss' : 'tie'
            const resultLabel =
              result === 'win' ? 'Win' : result === 'loss' ? 'Loss' : 'Tie'

            return (
              <li key={g.id} className={`gh-swipe-container${i % 2 === 1 ? ' gh-alt' : ''}${g.id === selectedGameId ? ' gh-selected' : ''}`}>

                {/* Sliding row — transform managed via ref, not JSX style prop */}
                <div
                  className="gh-row"
                  ref={(el) => {
                    if (el) rowRefs.current[g.id] = el
                    else    delete rowRefs.current[g.id]
                  }}
                  onTouchStart={(e) => handleTouchStart(e, g.id)}
                  onTouchMove={(e)  => handleTouchMove(e, g.id)}
                  onTouchEnd={(e)   => handleTouchEnd(e, g.id)}
                  onClick={(e)      => handleRowClick(e, g)}
                >
                  <span className="gh-col-date">{formatDate(g.date)}</span>
                  <span className="gh-col-opponent">
                    {g.opponent}
                    {g.photoUrl && (
                      <button
                        className="gh-photo-btn"
                        onClick={(e) => { e.stopPropagation(); setPhotoGame(g) }}
                        aria-label={`View photo from game vs. ${g.opponent}`}
                      >
                        📷
                      </button>
                    )}
                  </span>
                  <span className="gh-col-score">{g.teamScore}–{g.opponentScore}</span>
                  <span className="gh-col-result">
                    <span className={`result-badge ${result}`}>{resultLabel}</span>
                  </span>
                </div>

                {/* Edit button — left of delete, revealed by the slide */}
                <button
                  className="gh-edit-btn"
                  onClick={(e) => { e.stopPropagation(); closeRow(g.id); onEdit?.(g) }}
                  aria-label={`Edit game vs. ${g.opponent} on ${formatDate(g.date)}`}
                >
                  Edit
                </button>

                {/* Delete button — rightmost, revealed by the slide */}
                <button
                  className="gh-delete-btn"
                  onClick={(e) => handleDeleteClick(e, g)}
                  aria-label={`Delete game vs. ${g.opponent} on ${formatDate(g.date)}`}
                >
                  Delete
                </button>

              </li>
            )
          })}
        </ul>
      )}

      {/* ── Photo modal ──────────────────────────────────────────── */}
      {photoGame && (
        <div className="gh-confirm-overlay" onClick={() => setPhotoGame(null)}>
          <div className="gh-photo-modal" onClick={(e) => e.stopPropagation()}>
            <p className="gh-confirm-title">vs. {photoGame.opponent} — {formatDate(photoGame.date)}</p>
            <img
              src={photoGame.photoUrl}
              alt={`Photo from game vs. ${photoGame.opponent}`}
              className="gh-photo-modal-img"
            />
            <button className="btn btn-ghost" onClick={() => setPhotoGame(null)}>Close</button>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ─────────────────────────────── */}
      {confirmGame && (
        <div
          className="gh-confirm-overlay"
          onClick={handleDeleteCancel} /* tap dim backdrop to dismiss */
        >
          <div
            className="gh-confirm-modal"
            onClick={(e) => e.stopPropagation()} /* don't dismiss when clicking inside */
          >
            <p className="gh-confirm-title">Delete this game?</p>
            <p className="gh-confirm-detail">
              vs. {confirmGame.opponent} on {formatDate(confirmGame.date)}
            </p>

            {deleteError && <p className="form-error">{deleteError}</p>}

            <div className="form-actions">
              <button
                className="btn btn-primary"
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
              <button
                className="btn btn-ghost"
                onClick={handleDeleteCancel}
                disabled={deleting}
              >
                Keep
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
