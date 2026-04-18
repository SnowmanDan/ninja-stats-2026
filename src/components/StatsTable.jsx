/*
  StatsTable.jsx
  ==============
  Shows per-player goals and assists for a single game (the most recent one).
  The heading includes the game date so it's clear which game is displayed.

  Props
  -----
  game  — object: { date, opponent }
           Used only for the heading label.

  stats — array of objects sorted by jersey number:
    [{ number, name, goals, assists }, …]

  Why separate from SeasonSummary?
  ---------------------------------
  Season totals and per-game stats have the same *columns* but very different
  *meaning*. Keeping them as separate components makes it easy to:
    - Give them different headings (one shows the game date, one doesn't)
    - Sort them differently (by goals season-wide vs. by jersey # per game)
    - Eventually add game-specific columns (e.g. minutes played) without
      touching the season totals table
*/

function StatsTable({ game, stats }) {
  /*
    Format the game date for the section heading.
    Same T00:00:00 trick as LastGame.jsx — prevents a one-day offset
    in US time zones when parsing an ISO date string.
  */
  const formattedDate = new Date(game.date + 'T00:00:00').toLocaleDateString(
    'en-US',
    { month: 'long', day: 'numeric', year: 'numeric' }
  )

  return (
    <section className="card" aria-labelledby="game-stats-heading">
      <h2 className="section-title" id="game-stats-heading">
        Game Stats — {formattedDate}
      </h2>

      <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Player</th>
            <th scope="col" className="col-center" aria-label="Goals">⚽ Goals</th>
            <th scope="col" className="col-center" aria-label="Assists">🅰️ Assists</th>
            <th scope="col" className="col-center" aria-label="Shots on Goal">🎯 Shots</th>
            <th scope="col" className="col-center" aria-label="Tackles">🛡️ Tackles</th>
            <th scope="col" className="col-center" aria-label="Saves">🧤 Saves</th>
          </tr>
        </thead>
        <tbody>
          {stats.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', fontStyle: 'italic' }}>
                No stats recorded for this game yet.
              </td>
            </tr>
          ) : (
            stats.map((s) => (
              <tr key={s.number}>
                <td className="col-center">
                  <span className="jersey-num">{s.number}</span>
                </td>
                <td>{s.name}</td>
                <td className="col-center">{s.goals}</td>
                <td className="col-center">{s.assists}</td>
                <td className="col-center">{s.shots}</td>
                <td className="col-center">{s.tackles}</td>
                <td className="col-center">{s.saves}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>
    </section>
  )
}

export default StatsTable
