/*
  GoalieStats.jsx
  ===============
  A collapsible card with two sub-sections:
    1. Season Totals — cumulative minutes and goals allowed per player
    2. By Game       — a mini-table per game, newest first

  It starts collapsed because most visitors care about scoring first.
  Clicking the header toggles it open.

  Props
  -----
  seasonTotals — array sorted by minutes desc:
    [{ name, gamesInGoal, minutes, goalsAllowed }, …]

  byGame — array sorted newest-first:
    [{
      date,       // "2026-04-10"
      opponent,   // "Storm"
      goalies: [{ name, minutes, goalsAllowed }, …]  // sorted by minutes desc
    }, …]

  React concept used here: useState
  ----------------------------------
  useState is how React components remember things between renders.
  Here we use it to track whether the content is open or closed.

    const [isOpen, setIsOpen] = useState(false)

  - isOpen      → the current value (starts as false = collapsed)
  - setIsOpen   → the function we call to change it
  - useState(false) → the initial value

  When the button is clicked we call setIsOpen(!isOpen) which flips
  the boolean, React re-renders the component, and the content appears
  or disappears.
*/

import { useState } from 'react'

function GoalieStats({ seasonTotals, byGame }) {
  /*
    isOpen tracks whether the collapsible content is visible.
    false = collapsed (default), true = expanded.
  */
  const [isOpen, setIsOpen] = useState(false)

  /*
    Format an ISO date string as "April 10, 2026".
    Defined here (not imported) because only GoalieStats uses it —
    the by-game labels need date formatting but no other component
    in this file does.
  */
  function formatDate(dateStr) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(
      'en-US',
      { month: 'long', day: 'numeric', year: 'numeric' }
    )
  }

  return (
    <section className="card" aria-labelledby="goalie-stats-heading">

      {/*
        The heading is a <button> instead of an <h2>.
        This is important for accessibility — a <button> is keyboard-
        focusable and triggers on Enter/Space automatically, which is
        exactly what users expect for a toggle.

        aria-expanded tells screen readers whether the section is open.
        aria-controls points to the content div so screen readers know
        what this button controls.
      */}
      <button
        className="section-title section-title-toggle"
        id="goalie-stats-heading"
        aria-expanded={isOpen}
        aria-controls="goalie-stats-content"
        onClick={() => setIsOpen(!isOpen)}
      >
        Goalie Stats
        {/*
          The arrow rotates 90° when open via the .open CSS class.
          aria-hidden keeps screen readers from reading out "▶" aloud.
        */}
        <span className={`toggle-icon${isOpen ? ' open' : ''}`} aria-hidden="true">▶</span>
      </button>

      {/*
        Conditional rendering — React's way of showing/hiding content.
        {isOpen && <div>…</div>} means: only render the div if isOpen is true.
        When isOpen is false, nothing is rendered at all (not just hidden
        with CSS). This is fine here because the content isn't needed until
        the user asks for it.
      */}
      {isOpen && (
        <div className="collapsible-content" id="goalie-stats-content">

          {/* ---- Sub-section A: Season Totals ---- */}
          <p className="subsection-label">Season Totals</p>
          <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Player</th>
                <th scope="col" className="col-center">Games in Goal</th>
                <th scope="col" className="col-center">Minutes</th>
                <th scope="col" className="col-center">Saves</th>
                <th scope="col" className="col-center">Goals Allowed</th>
              </tr>
            </thead>
            <tbody>
              {seasonTotals.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', fontStyle: 'italic' }}>
                    No goalie data recorded yet.
                  </td>
                </tr>
              ) : (
                seasonTotals.map((g) => (
                  /*
                    Using name as the key — it's unique among goalies and
                    more stable than an array index.
                  */
                  <tr key={g.name}>
                    <td>{g.name}</td>
                    <td className="col-center">{g.gamesInGoal}</td>
                    <td className="col-center">{g.minutes}</td>
                    <td className="col-center">{g.saves}</td>
                    <td className="col-center">{g.goalsAllowed}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>

          {/* ---- Sub-section B: By Game ---- */}
          <p className="subsection-label">By Game</p>

          {byGame.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
              No game-by-game goalie data yet.
            </p>
          ) : (
            byGame.map((game) => (
              <div className="game-goalie-block" key={game.date + game.opponent}>
                <p className="game-goalie-label">
                  {formatDate(game.date)} vs {game.opponent}
                </p>
                <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Player</th>
                      <th scope="col" className="col-center">Minutes</th>
                      <th scope="col" className="col-center">Saves</th>
                      <th scope="col" className="col-center">Goals Allowed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {game.goalies.map((g) => (
                      <tr key={g.name}>
                        <td>{g.name}</td>
                        <td className="col-center">{g.minutes}</td>
                        <td className="col-center">{g.saves}</td>
                        <td className="col-center">{g.goalsAllowed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            ))
          )}

        </div>
      )}
    </section>
  )
}

export default GoalieStats
