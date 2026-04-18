/*
  SeasonSummary.jsx
  =================
  Shows the team's season record (W/L/T + goals for/against) and
  a cumulative goals+assists table sorted by most productive players.

  Props
  -----
  record  — object:
    { wins, losses, ties, goalsFor, goalsAgainst }

  players — array of objects sorted by goals (desc):
    [{ number, name, goals, assists }, …]

  Why this shape?
  ---------------
  The parent (App.jsx) is responsible for computing these values from
  the raw games/stats data. SeasonSummary only knows how to display them.
  That separation keeps this component simple and easy to test — you
  can pass any record + players array and it just renders.
*/

function SeasonSummary({ record, players }) {
  return (
    <section className="card" aria-labelledby="season-heading">
      <h2 className="section-title" id="season-heading">Season Totals</h2>

      {/*
        Record bar — five boxes in a flex row.
        Each box uses a modifier class (.wins, .losses, etc.) so the CSS
        can color the number differently without extra inline styles.
      */}
      <div className="record-bar" role="group" aria-label="Season record">
        <div className="record-item wins">
          <span className="record-num">{record.wins}</span>
          <span className="record-label">Wins</span>
        </div>
        <div className="record-item losses">
          <span className="record-num">{record.losses}</span>
          <span className="record-label">Losses</span>
        </div>
        <div className="record-item ties">
          <span className="record-num">{record.ties}</span>
          <span className="record-label">Ties</span>
        </div>
      </div>

      {/*
        Season stats table.
        Only players with at least one goal or assist are shown
        (that filtering happens in App.jsx before passing the prop).
      */}
      <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Player</th>
            {/* aria-label gives screen readers a real description instead of just the emoji */}
            <th scope="col" className="col-center" aria-label="Goals">⚽ Goals</th>
            <th scope="col" className="col-center" aria-label="Assists">🅰️ Assists</th>
            <th scope="col" className="col-center" aria-label="Shots on Goal">🎯 Shots</th>
            <th scope="col" className="col-center" aria-label="Tackles">🛡️ Tackles</th>
            <th scope="col" className="col-center" aria-label="Saves">🧤 Saves</th>
          </tr>
        </thead>
        <tbody>
          {players.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', fontStyle: 'italic' }}>
                No stats recorded yet this season.
              </td>
            </tr>
          ) : (
            /*
              .map() turns the players array into an array of <tr> elements.
              React requires a unique "key" prop on each item so it can
              efficiently update the list when data changes — jersey number
              works great here since it's unique per player.
            */
            players.map((p) => (
              <tr key={p.number}>
                <td className="col-center">
                  <span className="jersey-num">{p.number}</span>
                </td>
                <td>{p.name}</td>
                <td className="col-center">{p.goals}</td>
                <td className="col-center">{p.assists}</td>
                <td className="col-center">{p.shots}</td>
                <td className="col-center">{p.tackles}</td>
                <td className="col-center">{p.saves}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>
    </section>
  )
}

export default SeasonSummary
