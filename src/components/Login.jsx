/*
  Login.jsx — magic link sign-in screen.
  ========================================
  Shown whenever there is no active Supabase session. The user enters
  their email and we fire supabase.auth.signInWithOtp(), which sends a
  magic link. Clicking that link redirects back to the app with an
  auth code in the URL; the Supabase client exchanges it for a session
  automatically, onAuthStateChange fires in App.jsx, and the login
  screen is replaced by the dashboard.

  No password needed — magic link only.
*/

import { useState } from 'react'

function Login({ db }) {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: signInError } = await db.auth.signInWithOtp({
      email,
      options: {
        // Redirect back to the current page after the link is clicked.
        // Strip any stale query/hash params from the current URL first.
        emailRedirectTo: window.location.href.split('?')[0].split('#')[0],
      },
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  /* ---- Sent confirmation ---- */
  if (sent) {
    return (
      <div className="page-wrapper">
        <header>
          <div className="header-inner">
            <div className="header-center">
              <h1 className="team-name">Ninja Stats</h1>
            </div>
          </div>
        </header>
        <div className="card login-confirm-card">
          <h2 className="login-confirm-heading">Check your email</h2>
          <p className="login-confirm-body">
            We sent a magic link to <strong>{email}</strong>.
            Tap it to sign in — no password needed.
          </p>
          <button
            className="btn btn-ghost"
            onClick={() => setSent(false)}
          >
            Use a different email
          </button>
        </div>
      </div>
    )
  }

  /* ---- Sign-in form ---- */
  return (
    <div className="page-wrapper">
      <header>
        <div className="header-inner">
          <div className="header-center">
            <h1 className="team-name">Ninja Stats</h1>
          </div>
        </div>
      </header>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              Sign in with your email
            </label>
            <input
              id="login-email"
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Login
