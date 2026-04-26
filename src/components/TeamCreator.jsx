/*
  TeamCreator.jsx — new team setup screen
  ========================================
  Shown when a signed-in user has no team memberships yet (i.e. brand
  new user who hasn't created a team). Lets them name their team and
  set a season, then:
    1. INSERTs a row into `teams` (with owner_id = their user ID)
    2. INSERTs a row into `team_members` (role = 'owner')
    3. Calls onCreated(slug) so App.jsx can navigate to the new team

  Slug generation:
    "Spring Ninjas" → "spring-ninjas"
    Lowercase, spaces → hyphens, non-alphanumeric characters stripped.
    Supabase enforces uniqueness on slug via a UNIQUE constraint.

  Props:
    db        — shared Supabase client (from src/supabase.js)
    user      — the signed-in Supabase auth user object
    onCreated — callback(slug: string) called after successful creation
*/

import { useState } from 'react'

/* Turn a team name into a URL-safe slug */
function toSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')          // spaces → hyphens
    .replace(/[^a-z0-9-]/g, '')   // strip anything that's not a letter, number, or hyphen
}

export default function TeamCreator({ db, user, onCreated }) {

  const [name,    setName]    = useState('')
  const [season,  setSeason]  = useState('Spring 2026')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const slug = toSlug(name)

    if (!slug) {
      setError('Team name must contain at least one letter or number.')
      setSaving(false)
      return
    }

    /* ---- Step 1: Insert the team --------------------------------- */
    const { data: team, error: teamError } = await db
      .from('teams')
      .insert({
        name:     name.trim(),
        slug,
        season:   season.trim() || null,
        owner_id: user.id,
      })
      .select()
      .single()

    if (teamError) {
      /*
        The most likely error is a slug collision (UNIQUE constraint).
        Supabase error code 23505 = unique_violation.
      */
      const isSlugConflict = teamError.code === '23505'
      setError(
        isSlugConflict
          ? `A team called "${name.trim()}" already exists. Try a different name.`
          : `Could not create team: ${teamError.message}`
      )
      setSaving(false)
      return
    }

    /* ---- Step 2: Add the creator as owner in team_members -------- */
    const { error: memberError } = await db
      .from('team_members')
      .insert({
        user_id: user.id,
        team_id: team.id,
        role:    'owner',
      })

    if (memberError) {
      setError(`Team created but membership failed: ${memberError.message}`)
      setSaving(false)
      return
    }

    /* ---- Step 3: Hand off to App.jsx to navigate ---------------- */
    onCreated(slug)
  }

  return (
    <div className="page-wrapper">
      <header>
        <div className="header-inner">
          <div className="header-center">
            <h1 className="team-name">Ninja Stats</h1>
            <p className="season-label">Let's set up your team</p>
          </div>
        </div>
      </header>

      <div className="card login-card">
        <h2 className="login-title">Create your team</h2>
        <p className="login-subtitle">
          You'll be the team owner. You can invite coaches and parents later.
        </p>

        <form onSubmit={handleSubmit} className="login-form">

          <label htmlFor="team-name" className="login-label">Team name</label>
          <input
            id="team-name"
            type="text"
            className="login-input"
            placeholder="e.g. Ninjas"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <label htmlFor="season" className="login-label">Season</label>
          <input
            id="season"
            type="text"
            className="login-input"
            placeholder="e.g. Spring 2026"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
          />

          {error && <p className="login-error">{error}</p>}

          <button
            type="submit"
            className="btn btn-primary login-btn"
            disabled={saving || !name.trim()}
          >
            {saving ? 'Creating…' : 'Create Team'}
          </button>

        </form>
      </div>
    </div>
  )
}
