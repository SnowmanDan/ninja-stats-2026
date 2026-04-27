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
  Sentinel values for non-navigation options.
  Not real slugs so they won't accidentally match a team.
*/
const SETTINGS_SENTINEL = '__settings__'
const NEW_TEAM_SENTINEL  = '__new__'

export default function TeamSwitcher({ teams, currentSlug, onTeamSettings, onCreateNew }) {

  // useNavigate gives us a function we can call to change the URL
  // programmatically (without an <a> link).
  const navigate = useNavigate()

  /*
    When the user picks from the dropdown:
      - Picking a real team    → navigate to that team's URL
      - Picking "Team Settings"→ call onTeamSettings (App shows TeamSettings)
      - Picking "+ New Team"   → call onCreateNew (App shows TeamCreator)

    Because this select is controlled (value={currentSlug}), picking a
    sentinel doesn't change the displayed value — React keeps it on the
    current team once the handlers trigger a re-render.
  */
  function handleChange(e) {
    const value = e.target.value

    if (value === SETTINGS_SENTINEL) {
      onTeamSettings?.()
      return
    }

    if (value === NEW_TEAM_SENTINEL) {
      onCreateNew?.()
      return
    }

    if (value !== currentSlug) {
      navigate(`/${value}`)
    }
  }

  /*
    Hide the switcher when there's only one team and no action handlers —
    nothing useful to show. As soon as any handler is wired up (settings
    or create), we always render so those options are reachable.
  */
  const hasActions = onTeamSettings || onCreateNew
  if (!teams || (teams.length < 2 && !hasActions)) return null

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

        {/* Management options — separated from team list by a divider */}
        {hasActions && <option disabled>──────────</option>}
        {onTeamSettings && <option value={SETTINGS_SENTINEL}>Team Settings</option>}
        {onCreateNew    && <option value={NEW_TEAM_SENTINEL}>+ New Team</option>}
      </select>
    </div>
  )
}
