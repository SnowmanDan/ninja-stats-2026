/*
  GameHistory.jsx
  ===============
  A table of every game played this season, newest first.
  Each row shows the date, opponent, final score, and a Win/Loss/Tie badge.

  Props
  -----
  games — array sorted newest-first:
    [{ date, opponent, teamScore, opponentScore }, …]

  Why newest-first?
  -----------------
  The most recent game is what visitors care about most. The parent
  is responsible for the sort order — this component just renders
  whatever it receives, which keeps it simple and predictable.
*/

function GameHistory({ games }) {
  /*
    Format "2026-04-10" → "April 10, 2026".
    Appending T00:00:00 forces JS to treat the string as local midnight.
    Without it, bare ISO date strings are parsed as UTC, which shifts
    the displayed date by one day in US time zones.
  */
  function formatDate(dateStr) {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString(
      'en-US',
      { month: 'long', day: 'numeric', year: 'numeric' }
    )
  }

  return (
    <section className="card" aria-labelledby="game-history-heading">
      <h2 className="section-title" id="game-history-heading">Game History</h2>

      <table>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Opponent</th>
            <th scope="col" className="col-center">Score</th>
            <th scope="col" className="col-center">Result</th>
          </tr>
        </thead>
        <tbody>
          {games.length === 0 ? (
            <tr>
              <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', fontStyle: 'italic' }}>
                No games played yet.
              </td>
            </tr>
          ) : (
            games.map((g) => {
              /*
                Derive result inline — it's pure logic with no side effects,
                and it only makes sense in the context of rendering this row.
              */
              const result =
                g.teamScore > g.opponentScore ? 'win'  :
                g.teamScore < g.opponentScore ? 'loss' : 'tie'

              const resultLabel =
                result === 'win'  ? 'Win'  :
                result === 'loss' ? 'Loss' : 'Tie'

              return (
                <tr key={g.date + g.opponent}>
                  <td>{formatDate(g.date)}</td>
                  <td>{g.opponent}</td>
                  {/* "us – them" order matches how a real scoreboard reads */}
                  <td className="col-center">{g.teamScore}–{g.opponentScore}</td>
                  <td className="col-center">
                    <span className={`result-badge ${result}`}>{resultLabel}</span>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </section>
  )
}

export default GameHistory
