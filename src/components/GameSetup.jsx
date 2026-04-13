/*
  GameSetup.jsx
  -------------
  Form to create a new game. Collects date + opponent, then inserts
  a row into the Supabase `games` table with scores starting at 0.
  Calls onGameCreated(newGameRow) on success so the parent can
  switch to the logger view for that game.

  Props:
    db             — the Supabase client from App.jsx
    onGameCreated  — callback(newGame) called after a successful insert
    onCancel       — callback() called when the user clicks Cancel
*/

import { useState } from 'react'

export default function GameSetup({ db, onGameCreated, onCancel }) {

  const [date,       setDate]       = useState('')
  const [opponent,   setOpponent]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState(null)

  /*
    handleSubmit — called when the form is submitted.
    1. Prevents the default browser page reload (e.preventDefault).
    2. Inserts a new row into `games` with scores set to 0.
    3. .select().single() tells Supabase to return the newly created row
       (with its auto-generated id, timestamps, etc.).
    4. Hands the new row to the parent via onGameCreated.
  */
  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { data, error: insertError } = await db
      .from('games')
      .insert({ date, opponent, team_score: 0, opponent_score: 0 })
      .select()
      .single()

    if (insertError) {
      console.error('Supabase insert error:', insertError)
      setError('Could not create game. Check the browser console for details.')
      setSubmitting(false)
      return
    }

    /* Pass the full row (including the new id) up to App */
    onGameCreated(data)
  }

  return (
    <div className="card">
      <h2 className="section-title">New Game</h2>

      <form onSubmit={handleSubmit}>

        <div className="form-group">
          <label className="form-label" htmlFor="game-date">
            Date
          </label>
          <input
            id="game-date"
            className="form-input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="game-opponent">
            Opponent
          </label>
          <input
            id="game-opponent"
            className="form-input"
            type="text"
            placeholder="e.g. Tigers"
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
            required
          />
        </div>

        {/* Show Supabase errors inline so the user knows what went wrong */}
        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Creating…' : 'Start Game'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>

      </form>
    </div>
  )
}
