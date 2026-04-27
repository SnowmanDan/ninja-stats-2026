/*
  TeamSettings.jsx — team name/season editing + owner-only delete
  ================================================================
  Accessible via "Team Settings" in the TeamSwitcher dropdown.
  Shown to all team members but write actions are gated by role:
    - Owners:          edit name/season + delete team
    - Coaches:         edit name/season only
    - Parents/Viewers: read-only (see name/season, no edit controls)

  Delete flow (owners only):
    1. Tap "Delete Team" → confirmation section expands
    2. Type the team name exactly to unlock the final button
    3. Tap "Permanently Delete" → cascade-deletes all data → navigates away

  Cascade order (FK dependency):
    game_stats → games → players → team_members → teams
  Note: photo files in Supabase Storage are NOT deleted here — they'll
  orphan in the bucket. A future cleanup job can handle that.

  Props:
    db         — shared Supabase client
    user       — signed-in Supabase auth user
    team       — current team object { id, name, slug, season }
    userRole   — this user's role on the team ('owner'|'coach'|'parent'|'viewer')
    onSaved    — callback({ name, season }) after a successful update
    onDeleted  — callback() after successful deletion; App handles navigation
    onCancel   — callback() to go back to the dashboard without changes
*/

import { useState } from 'react'

export default function TeamSettings({ db, user, team, userRole, onSaved, onDeleted, onCancel }) {

  /* ---- Edit state ---------------------------------------------- */
  const [name,     setName]     = useState(team.name   ?? '')
  const [season,   setSeason]   = useState(team.season ?? '')
  const [saving,   setSaving]   = useState(false)
  const [saveMsg,  setSaveMsg]  = useState(null)   // null | 'saved' | 'error'
  const [saveErr,  setSaveErr]  = useState('')

  /* ---- Delete state -------------------------------------------- */
  const [showDelete,    setShowDelete]    = useState(false)  // danger zone expanded?
  const [confirmName,   setConfirmName]   = useState('')     // typed confirmation
  const [deleting,      setDeleting]      = useState(false)
  const [deleteErr,     setDeleteErr]     = useState('')

  /* ---- Role helpers -------------------------------------------- */
  const canEdit   = userRole === 'owner' || userRole === 'coach'
  const canDelete = userRole === 'owner'

  /* ---- Save handler -------------------------------------------- */
  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaveMsg(null)
    setSaveErr('')

    const { error } = await db
      .from('teams')
      .update({ name: name.trim(), season: season.trim() || null })
      .eq('id', team.id)

    setSaving(false)

    if (error) {
      setSaveMsg('error')
      setSaveErr(error.message)
      return
    }

    setSaveMsg('saved')
    // Bubble the updated values up so App can refresh the header/switcher
    onSaved({ name: name.trim(), season: season.trim() || null })

    // Clear the success message after 2 seconds
    setTimeout(() => setSaveMsg(null), 2000)
  }

  /* ---- Delete handler ------------------------------------------ */
  async function handleDelete() {
    if (confirmName !== team.name) return  // shouldn't be reachable, but guard anyway
    setDeleting(true)
    setDeleteErr('')

    try {
      // Step 1 — find all game IDs for this team so we can delete their stats
      const { data: gameRows, error: gamesErr } = await db
        .from('games')
        .select('id')
        .eq('team_id', team.id)

      if (gamesErr) throw gamesErr

      // Step 2 — delete game_stats (FK → games)
      const gameIds = (gameRows || []).map((g) => g.id)
      if (gameIds.length > 0) {
        const { error: statsErr } = await db
          .from('game_stats')
          .delete()
          .in('game_id', gameIds)
        if (statsErr) throw statsErr
      }

      // Step 3 — delete games (FK → teams)
      const { error: gDelErr } = await db.from('games').delete().eq('team_id', team.id)
      if (gDelErr) throw gDelErr

      // Step 4 — delete players (FK → teams)
      const { error: pDelErr } = await db.from('players').delete().eq('team_id', team.id)
      if (pDelErr) throw pDelErr

      // Step 5 — delete team_members (FK → teams)
      const { error: mDelErr } = await db.from('team_members').delete().eq('team_id', team.id)
      if (mDelErr) throw mDelErr

      // Step 6 — delete the team itself
      const { error: tDelErr } = await db.from('teams').delete().eq('id', team.id)
      if (tDelErr) throw tDelErr

      // Hand off to App to figure out where to navigate
      onDeleted()

    } catch (err) {
      setDeleting(false)
      setDeleteErr(err.message || 'Something went wrong. Please try again.')
    }
  }

  /* ---- Render -------------------------------------------------- */
  return (
    <div className="page-wrapper">

      {/* ---- Edit section ---- */}
      <div className="card settings-card">
        <h2 className="settings-title">Team Settings</h2>

        {canEdit ? (
          <form onSubmit={handleSave} className="settings-form">

            <label htmlFor="ts-name" className="login-label">Team name</label>
            <input
              id="ts-name"
              type="text"
              className="login-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <label htmlFor="ts-season" className="login-label">Season</label>
            <input
              id="ts-season"
              type="text"
              className="login-input"
              placeholder="e.g. Spring 2026"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
            />

            {saveMsg === 'error' && (
              <p className="login-error">{saveErr}</p>
            )}
            {saveMsg === 'saved' && (
              <p className="settings-saved">✓ Saved</p>
            )}

            <div className="settings-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || !name.trim()}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                type="button"
                className="btn settings-cancel-btn"
                onClick={onCancel}
              >
                Back
              </button>
            </div>

          </form>
        ) : (
          /* Read-only view for parents/viewers */
          <div className="settings-readonly">
            <p className="settings-readonly-row"><span>Team</span><strong>{team.name}</strong></p>
            {team.season && <p className="settings-readonly-row"><span>Season</span><strong>{team.season}</strong></p>}
            <p className="settings-role-note">You have <em>{userRole}</em> access — contact the team owner to make changes.</p>
            <button className="btn settings-cancel-btn" style={{ marginTop: '1rem' }} onClick={onCancel}>
              Back
            </button>
          </div>
        )}
      </div>

      {/* ---- Danger zone (owners only) ---- */}
      {canDelete && (
        <div className="card settings-danger-zone">
          <h3 className="settings-danger-title">Danger Zone</h3>
          <p className="settings-danger-desc">
            Deleting a team permanently removes all its games, stats, and players.
            This cannot be undone.
          </p>

          {!showDelete ? (
            <button
              className="btn settings-delete-btn"
              onClick={() => setShowDelete(true)}
            >
              Delete Team…
            </button>
          ) : (
            <div className="settings-confirm">
              <p className="settings-confirm-prompt">
                Type <strong>{team.name}</strong> to confirm:
              </p>
              <input
                type="text"
                className="login-input"
                placeholder={team.name}
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                autoFocus
              />
              {deleteErr && <p className="login-error">{deleteErr}</p>}
              <div className="settings-actions" style={{ marginTop: '0.75rem' }}>
                <button
                  className="btn settings-delete-btn"
                  onClick={handleDelete}
                  disabled={confirmName !== team.name || deleting}
                >
                  {deleting ? 'Deleting…' : 'Permanently Delete'}
                </button>
                <button
                  className="btn settings-cancel-btn"
                  onClick={() => { setShowDelete(false); setConfirmName('') }}
                  disabled={deleting}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
