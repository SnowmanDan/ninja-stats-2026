/*
  TeamSwitcher.jsx
  ----------------
  Small dropdown in the page header that lets the user jump between
  teams. Selecting a team navigates to that team's URL (e.g. /ninjas
  or /inter-milan).

  Props:
    teams       — array of { id, name, slug } from the teams table
    currentSlug — the slug currently in the URL (so the dropdown
                  reflects the active team)
*/

import { useNavigate } from 'react-router-dom'

export default function TeamSwitcher({ teams, currentSlug }) {

  // useNavigate gives us a function we can call to change the URL
  // programmatically (without an <a> link).
  const navigate = useNavigate()

  /*
    When the user picks a different team from the dropdown,
    navigate to that team's URL. React Router will re-render App
    with the new slug, which triggers a fresh data fetch.
  */
  function handleChange(e) {
    const newSlug = e.target.value
    if (newSlug !== currentSlug) {
      navigate(`/${newSlug}`)
    }
  }

  // If there's only one team, there's nothing to switch to —
  // skip rendering to keep the header clean.
  if (!teams || teams.length < 2) return null

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
      </select>
    </div>
  )
}
