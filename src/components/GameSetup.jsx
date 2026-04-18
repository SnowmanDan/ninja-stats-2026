/*
  GameSetup.jsx
  -------------
  Form that collects the date and opponent for a new game.
  No Supabase write happens here — the game row is only inserted
  into the database when the coach taps "Save Game" at the end.
  This means Cancel is a free local reset with nothing to clean up.

  Props:
    onGameCreated  — callback({ date, opponent }) called on submit
    onCancel       — callback() called when the user clicks Cancel
*/

import { useState } from 'react'

export default function GameSetup({ onGameCreated, onCancel, initialDate, initialOpponent }) {

  const [date, setDate] = useState(() => {
    if (initialDate) return initialDate   /* pre-filled when editing an existing game */
    const d    = new Date()
    const yyyy = d.getFullYear()
    const mm   = String(d.getMonth() + 1).padStart(2, '0')
    const dd   = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`          /* YYYY-MM-DD — the only format <input type="date"> accepts */
  })
  const [opponent, setOpponent] = useState(initialOpponent ?? '')

  /*
    handleSubmit — validates the form and hands the draft game data
    to the parent. No network call; the parent stores it in state and
    switches to the GameLogger view.
  */
  function handleSubmit(e) {
    e.preventDefault()
    onGameCreated({ date, opponent })
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

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            Start Game
          </button>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>

      </form>
    </div>
  )
}
