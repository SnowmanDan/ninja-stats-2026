/*
  Login.jsx — magic link sign-in screen
  ======================================
  Shown when no active Supabase session is detected. The user enters
  their email, we call signInWithOtp(), and Supabase emails them a
  one-click login link. No password required.

  Flow:
    1. User types email → taps "Send me a link"
    2. signInWithOtp() fires → Supabase sends the email
    3. We show a confirmation ("Check your email!")
    4. User taps the link in the email → browser opens the app URL
    5. Supabase detects the token in the URL → fires onAuthStateChange
       with SIGNED_IN → App.jsx updates user state → Login disappears

  Props:
    db — the shared Supabase client (from src/supabase.js)
*/

import { useState } from 'react'

export default function Login({ db }) {

  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: authError } = await db.auth.signInWithOtp({
      email,
      options: {
        // Use the full current URL (e.g. http://localhost:5173/ninjas) so
        // Supabase redirects back to the same path. If we used just the
        // origin (/), React Router would redirect to /ninjas and strip the
        // ?code= param before Supabase could exchange it for a session.
        emailRedirectTo: window.location.href,
      },
    })

    setLoading(false)

    if (authError) {
      setError(authError.message)
      return
    }

    setSent(true)
  }

  return (
    <div className="page-wrapper">
      <header>
        <div className="header-inner">
          <div className="header-center">
            <h1 className="team-name">Ninja Stats</h1>
            <p className="season-label">Spring 2026 Season</p>
          </div>
        </div>
      </header>

      <div className="card login-card">
        {sent ? (
          /* ---- Success state ---- */
          <div className="login-success">
            <p className="login-success-icon">📬</p>
            <h2>Check your email!</h2>
            <p>We sent a sign-in link to <strong>{email}</strong>.</p>
            <p className="login-hint">Tap the link in the email to open the app. You can close this tab.</p>
          </div>
        ) : (
          /* ---- Email form ---- */
          <>
            <h2 className="login-title">Sign in</h2>
            <p className="login-subtitle">Enter your email and we'll send you a magic link — no password needed.</p>

            <form onSubmit={handleSubmit} className="login-form">
              <label htmlFor="email" className="login-label">Email address</label>
              <input
                id="email"
                type="email"
                className="login-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />

              {error && <p className="login-error">{error}</p>}

              <button
                type="submit"
                className="btn btn-primary login-btn"
                disabled={loading}
              >
                {loading ? 'Sending…' : 'Send me a link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
