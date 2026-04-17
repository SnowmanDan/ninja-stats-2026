/*
  RosterEditor.jsx
  ================
  A batch editor for the team roster. Lets a parent add or edit all
  players in one go, then write everything to Supabase with one tap.

  Layout
  ------
  - Existing players appear as pre-filled editable rows
  - Three blank rows follow (so an empty roster doesn't look bare)
  - "Add Row" appends one more blank row at the bottom
  - "Save Roster" (top) validates then writes to Supabase
  - "← Back" returns to the dashboard without saving

  Save logic
  ----------
  - Rows with an id → UPDATE if name or number changed
  - Rows without an id + non-empty name → INSERT with team_id
  - Rows with an empty name are silently ignored (never inserted)
  - Player deletion is intentionally not supported here

  Validation
  ----------
  - Duplicate jersey numbers across non-empty rows → both rows highlighted
  - Save is blocked until duplicates are resolved
  - Empty number is fine (some leagues assign numbers late)

  Tab order
  ---------
  Natural DOM order gives: name[0] → number[0] → name[1] → number[1] → …
  No tabIndex overrides needed.

  Props
  -----
  players  — current roster: [{ id, name, number }, …]
  db       — Supabase client
  teamId   — current team's id (for INSERT)
  onBack   — callback() called after save or cancel
*/

import { useState, useEffect, useRef } from 'react'

const BLANK = () => ({ id: null, name: '', number: '' })
const INITIAL_BLANKS = 3

export default function RosterEditor({ players, db, teamId, onBack }) {

  /* ---- Row state ------------------------------------------------ */

  /*
    Each row: { id, name, number }
      id     — existing player's db id, or null for a new row
      name   — editable string
      number — editable string (converted to int on save; empty = null)

    We keep number as a string so the controlled input never shows "0"
    for a null/undefined jersey number.
  */
  const [rows, setRows] = useState(() => [
    ...players.map((p) => ({
      id:     p.id,
      name:   p.name,
      number: p.number != null ? String(p.number) : '',
    })),
    ...Array.from({ length: INITIAL_BLANKS }, BLANK),
  ])

  /* ---- Validation + save state ---------------------------------- */

  const [dupIndexes, setDupIndexes] = useState(new Set())  /* row indexes with duplicate numbers */
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState(null)

  /* ---- Auto-focus first blank row ------------------------------- */

  /*
    The first blank row sits right after the last existing player.
    We auto-focus its name field when the editor mounts so the parent
    can start typing immediately on mobile without tapping first.
  */
  const firstBlankRef = useRef(null)
  useEffect(() => { firstBlankRef.current?.focus() }, [])

  /* ---- Helpers -------------------------------------------------- */

  function updateRow(index, field, value) {
    setRows((prev) => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
    /* Clear duplicate flag for this row while the user is editing */
    setDupIndexes((prev) => { const next = new Set(prev); next.delete(index); return next })
  }

  function addRow() {
    setRows((prev) => [...prev, BLANK()])
  }

  /* ---- Validation ----------------------------------------------- */

  function validate() {
    /* Only consider rows the user has given a name */
    const active = rows
      .map((r, i) => ({ ...r, i }))
      .filter((r) => r.name.trim() !== '')

    /* Group row indexes by jersey number, ignoring empty numbers */
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

    /* Build a lookup of original player values for change-detection */
    const originalMap = {}
    players.forEach((p) => { originalMap[p.id] = p })

    /* Rows to UPDATE: existing players whose name or number changed */
    const toUpdate = rows.filter((r) => {
      if (r.id === null || r.name.trim() === '') return false
      const orig = originalMap[r.id]
      const origNumber = orig?.number != null ? String(orig.number) : ''
      return r.name.trim() !== orig?.name || r.number.trim() !== origNumber
    })

    /* Rows to INSERT: new rows (no id) with a non-empty name */
    const toInsert = rows.filter((r) => r.id === null && r.name.trim() !== '')

    try {
      /* UPDATE each changed row (parallel — order doesn't matter) */
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

      /* INSERT all new rows in one call */
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

      /* Success — return to dashboard so the roster re-fetches */
      onBack()

    } catch (err) {
      console.error('Roster save error:', err)
      setSaveError('Save failed. Check the browser console for details.')
      setSaving(false)
    }
  }

  /* ---- Render --------------------------------------------------- */

  return (
    <div className="card">

      {/* ── Header row: title + Save button ──────────────────────── */}
      <div className="re-header">
        <h2 className="section-title" style={{ marginBottom: 0 }}>Manage Roster</h2>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save Roster'}
        </button>
      </div>

      {saveError && <p className="form-error" style={{ marginTop: 12 }}>{saveError}</p>}

      {/* ── Column labels ────────────────────────────────────────── */}
      <div className="re-col-labels" aria-hidden="true">
        <span className="re-col-name">Name</span>
        <span className="re-col-number">#</span>
      </div>

      {/* ── Editable rows ────────────────────────────────────────── */}
      <div className="re-rows">
        {rows.map((row, i) => {
          const isDup      = dupIndexes.has(i)
          const isFirstNew = i === players.length   /* auto-focus target */

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
        <button className="btn btn-ghost" onClick={onBack} disabled={saving}>
          ← Back
        </button>
      </div>

    </div>
  )
}
