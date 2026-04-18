/*
  RosterEditor.jsx
  ================
  A batch editor for the team roster. Lets a coach add, edit, or remove
  players, then write everything to Supabase with one tap.

  Layout
  ------
  - Existing players appear as pre-filled editable rows with an ✕ button
  - Three blank rows follow (so an empty roster doesn't look bare)
  - "Add Row" appends one more blank row at the bottom
  - "Save Roster" (top) validates then writes to Supabase
  - "← Back" returns to the dashboard without saving

  Save logic
  ----------
  - Rows with an id → UPDATE if name or number changed
  - Rows without an id + non-empty name → INSERT with team_id
  - Rows with an empty name are silently ignored (never inserted)

  Delete logic
  ------------
  - Tap ✕ on an existing player → inline confirm prompt replaces the row
  - Confirm → DELETE from Supabase, row removed from local state
  - Players with game_stats are blocked by the DB (RESTRICT FK) and get
    an inline error explaining why

  Validation
  ----------
  - Duplicate jersey numbers across non-empty rows → both rows highlighted
  - Save is blocked until duplicates are resolved
  - Empty number is fine (some leagues assign numbers late)

  Props
  -----
  players  — current roster: [{ id, name, number }, …]
  db       — Supabase client
  teamId   — current team's id (for INSERT)
  onBack   — callback() called after save or cancel
*/

import { useState, useEffect, useRef } from 'react'

const BLANK = () => ({ id: null, name: '', number: '' })
const INITIAL_BLANKS = 1

export default function RosterEditor({ players, db, teamId, onBack }) {

  /* ---- Row state ------------------------------------------------ */

  const [rows, setRows] = useState(() => [
    ...players.map((p) => ({
      id:     p.id,
      name:   p.name,
      number: p.number != null ? String(p.number) : '',
    })),
    ...Array.from({ length: INITIAL_BLANKS }, BLANK),
  ])

  /* ---- Validation + save state ---------------------------------- */

  const [dupIndexes,  setDupIndexes]  = useState(new Set())
  const [saving,      setSaving]      = useState(false)
  const [saveError,   setSaveError]   = useState(null)

  /* ---- Delete state --------------------------------------------- */

  /*
    confirmDeleteIndex — index of the row currently showing the inline
    "Delete [name]?" prompt. Only one row at a time.
  */
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState(null)
  const [deleting,           setDeleting]           = useState(false)
  const [deleteError,        setDeleteError]        = useState(null)

  /* ---- Auto-focus first blank row ------------------------------- */

  const firstBlankRef = useRef(null)
  useEffect(() => { firstBlankRef.current?.focus() }, [])

  /* ---- Helpers -------------------------------------------------- */

  function updateRow(index, field, value) {
    setRows((prev) => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
    setDupIndexes((prev) => { const next = new Set(prev); next.delete(index); return next })
  }

  function addRow() {
    setRows((prev) => [...prev, BLANK()])
  }

  /* ---- Validation ----------------------------------------------- */

  function validate() {
    const active = rows
      .map((r, i) => ({ ...r, i }))
      .filter((r) => r.name.trim() !== '')

    const byNumber = {}
    active.forEach((r) => {
      const n = r.number.trim()
      if (!n) return
      if (!byNumber[n]) byNumber[n] = []
      byNumber[n].push(r.i)
    })

    const dups = new Set()
    Object.values(byNumber).forEach((indexes) => {
      if (indexes.length > 1) indexes.forEach((i) => dups.add(i))
    })

    setDupIndexes(dups)
    return dups.size === 0
  }

  /* ---- Save ----------------------------------------------------- */

  async function handleSave() {
    if (!validate()) return

    setSaving(true)
    setSaveError(null)

    const originalMap = {}
    players.forEach((p) => { originalMap[p.id] = p })

    const toUpdate = rows.filter((r) => {
      if (r.id === null || r.name.trim() === '') return false
      const orig = originalMap[r.id]
      const origNumber = orig?.number != null ? String(orig.number) : ''
      return r.name.trim() !== orig?.name || r.number.trim() !== origNumber
    })

    const toInsert = rows.filter((r) => r.id === null && r.name.trim() !== '')

    try {
      if (toUpdate.length > 0) {
        const results = await Promise.all(
          toUpdate.map((r) =>
            db.from('players').update({
              name:   r.name.trim(),
              number: r.number.trim() !== '' ? parseInt(r.number.trim(), 10) : null,
            }).eq('id', r.id)
          )
        )
        const firstErr = results.find((res) => res.error)?.error
        if (firstErr) throw firstErr
      }

      if (toInsert.length > 0) {
        const { error: insertError } = await db.from('players').insert(
          toInsert.map((r) => ({
            name:    r.name.trim(),
            number:  r.number.trim() !== '' ? parseInt(r.number.trim(), 10) : null,
            team_id: teamId,
          }))
        )
        if (insertError) throw insertError
      }

      onBack()

    } catch (err) {
      console.error('Roster save error:', err)
      setSaveError('Save failed. Check the browser console for details.')
      setSaving(false)
    }
  }

  /* ---- Delete --------------------------------------------------- */

  async function handleDeleteConfirm(row) {
    setDeleting(true)
    setDeleteError(null)

    const { error } = await db
      .from('players')
      .delete()
      .eq('id', row.id)

    if (error) {
      /*
        FK RESTRICT fires when the player has game_stats rows.
        Supabase surfaces this as a "foreign key" error code.
      */
      const isFK = error.code === '23503' || error.message?.includes('foreign key')
      setDeleteError(
        isFK
          ? `${row.name} has game stats on record and can't be removed.`
          : `Delete failed: ${error.message || error.code}`
      )
      setDeleting(false)
      return
    }

    /* Success — remove the row from local state */
    setRows((prev) => prev.filter((_, i) => i !== confirmDeleteIndex))
    setConfirmDeleteIndex(null)
    setDeleting(false)
  }

  function handleDeleteCancel() {
    setConfirmDeleteIndex(null)
    setDeleteError(null)
  }

  /* ---- Render --------------------------------------------------- */

  return (
    <div className="card">

      {/* ── Header row: title only ───────────────────────────────── */}
      <div className="re-header">
        <h2 className="section-title" style={{ marginBottom: 0 }}>Manage Roster</h2>
      </div>

      {saveError && <p className="form-error" style={{ marginTop: 12 }}>{saveError}</p>}

      {/* ── Column labels ────────────────────────────────────────── */}
      <div className="re-col-labels" aria-hidden="true">
        <span className="re-col-name">Name</span>
        <span className="re-col-number">#</span>
        <span className="re-col-delete-spacer" />
      </div>

      {/* ── Editable rows ────────────────────────────────────────── */}
      <div className="re-rows">
        {rows.map((row, i) => {
          const isDup      = dupIndexes.has(i)
          const isFirstNew = i === players.length
          const isConfirming = confirmDeleteIndex === i

          /* ── Inline delete confirmation ── */
          if (isConfirming) {
            return (
              <div key={i} className="re-row re-row-confirming">
                <span className="re-confirm-msg">
                  Remove <strong>{row.name}</strong>?
                </span>
                {deleteError && (
                  <span className="re-confirm-error">{deleteError}</span>
                )}
                <button
                  className="btn btn-primary re-confirm-yes"
                  onClick={() => handleDeleteConfirm(row)}
                  disabled={deleting}
                >
                  {deleting ? '…' : 'Remove'}
                </button>
                <button
                  className="btn btn-ghost re-confirm-no"
                  onClick={handleDeleteCancel}
                  disabled={deleting}
                >
                  Cancel
                </button>
              </div>
            )
          }

          /* ── Normal editable row ── */
          return (
            <div key={i} className={`re-row${isDup ? ' re-row-error' : ''}`}>
              <input
                className="form-input re-name-input"
                type="text"
                placeholder="Player name"
                value={row.name}
                onChange={(e) => updateRow(i, 'name', e.target.value)}
                ref={isFirstNew ? firstBlankRef : null}
                autoFocus={isFirstNew}
              />
              <input
                className="form-input re-number-input"
                type="number"
                placeholder="—"
                min="0"
                max="99"
                value={row.number}
                onChange={(e) => updateRow(i, 'number', e.target.value)}
              />

              {/* ✕ only shown on existing players (id set), not blank rows */}
              {row.id !== null ? (
                <button
                  className="re-delete-btn"
                  onClick={() => { setConfirmDeleteIndex(i); setDeleteError(null) }}
                  aria-label={`Remove ${row.name}`}
                >
                  ✕
                </button>
              ) : (
                <span className="re-delete-spacer" />
              )}

              {isDup && (
                <span className="re-dup-msg">Duplicate #</span>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Add row + Back ───────────────────────────────────────── */}
      <button className="btn btn-ghost re-add-btn" onClick={addRow}>
        + Add Row
      </button>

      <div className="form-actions" style={{ marginTop: 20 }}>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save Roster'}
        </button>
        <button className="btn btn-ghost" onClick={onBack} disabled={saving}>
          ← Back
        </button>
      </div>

    </div>
  )
}
