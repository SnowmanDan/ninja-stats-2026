/*
  Roster.jsx
  ==========
  A simple table listing every player on the team, sorted by jersey number.
  No stats here — just names and numbers, like a lineup card.

  Props
  -----
  players — array of objects sorted by jersey number:
    [{ number, name }, …]

  Why so simple?
  --------------
  The roster is intentionally just a list. When we connect to Supabase,
  the query returns players ordered by number, so the parent passes them
  straight through with no extra processing needed.

  If we later want to add positions or photos, we add them to the player
  objects and update only this component — nothing else needs to change.
*/

function Roster({ players }) {
  return (
    <section className="card" aria-labelledby="roster-heading">
      <h2 className="section-title" id="roster-heading">Roster</h2>

      <table>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Player</th>
          </tr>
        </thead>
        <tbody>
          {players.length === 0 ? (
            <tr>
              <td colSpan="2" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', fontStyle: 'italic' }}>
                No players found.
              </td>
            </tr>
          ) : (
            players.map((p) => (
              <tr key={p.number}>
                <td className="col-center">
                  <span className="jersey-num">{p.number}</span>
                </td>
                <td>{p.name}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  )
}

export default Roster
