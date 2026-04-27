/*
  TeamSwitcher.jsx
  ----------------
  Dropdown in the page header that lets the user jump between teams
  or create a new one.

  Props:
    teams       — array of { id, name, slug } from the teams table
    currentSlug — the slug currently in the URL (so the dropdown
                  reflects the active team)
    onCreateNew — callback fired when the user picks "+ New Team";
                  App.jsx uses this to switch to the TeamCreator view
*/

import { useNavigate } from 'react-router-dom'

/*
  Sentinel value used for the "+ New Team" option.
  It's not a real slug so it won't accidentally match a team.
*/
const NEW_TEAM_SENTINEL = '__new__'

export default function TeamSwitcher({ teams, currentSlug, onCreateNew }) {

  // useNavigate gives us a function we can call to change the URL
  // programmatically (without an <a> link).
  const navigate = useNavigate()

  /*
    When the user picks from the dropdown:
      - Picking a real team → navigate to that team's URL
      - Picking "+ New Team" → call onCreateNew (App shows TeamCreator)
  */
  function handleChange(e) {
    const value = e.target.value

    if (value === NEW_TEAM_SENTINEL) {
      // Don't navigate — let App.jsx handle the view switch.
      // Because this select is controlled (value={currentSlug}),
      // React will re-render it back to the current team automatically.
      onCreateNew?.()
      return
    }

    if (value !== currentSlug) {
      navigate(`/${value}`)
    }
  }

  /*
    Hide the switcher if there's only one team AND no onCreateNew handler —
    nothing useful to show. If onCreateNew is provided we always render
    so the user can reach "+ New Team" even from a single-team account.
  */
  if (!teams || (teams.length < 2 && !onCreateNew)) return null

  return (
    <div className="team-switcher">
      <label htmlFor="team-select" className="team-switcher-label">
        Team:
      </label>
      <select
        id="team-select"
        className="team-switcher-select"
        value={currentSlug}
        onChange={handleChange}
      >
        {teams.map((team) => (
          <option key={team.id} value={team.slug}>
            {team.name}
          </option>
        ))}

        {/* Divider + create option — only shown when a handler is wired up */}
        {onCreateNew && (
          <>
            <option disabled>──────────</option>
            <option value={NEW_TEAM_SENTINEL}>+ New Team</option>
          </>
        )}
      </select>
    </div>
  )
}
