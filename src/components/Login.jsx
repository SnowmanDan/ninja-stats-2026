/*
  Login.jsx — magic link sign-in screen (link goes to our app, not Supabase)
  ===========================================================================
  The email the user receives contains a link to /auth/confirm?token_hash=...
  (our own app), NOT directly to Supabase's verify endpoint.

  Why this matters: Apple Mail prefetches links when you hover or open an email.
  If the link pointed to Supabase's /auth/v1/verify, that prefetch would consume
  the token before the user clicked it. Our /auth/confirm URL just returns static
  React HTML on prefetch — harmless. The token is only exchanged when the user
  actually taps the link and AuthConfirm.jsx runs in their browser.

  The email template in Supabase must be set to link to:
    {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink
  See Supabase dashboard → Authentication → Email Templates → Magic Link.

  Flow:
    1. User enters email → taps "Send me a link"
    2. signInWithOtp() fires → Supabase emails the user
    3. We show "Check your email"
    4. User taps the link in the email → lands on /auth/confirm
    5. AuthConfirm.jsx exchanges the token → session established → app loads

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
        shouldCreateUser: true,
        // No emailRedirectTo — the email template links to /auth/confirm
        // with the token_hash, which AuthConfirm.jsx exchanges for a session.
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
            <h1 className="team-name">Stat-Ninja</h1>
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
            <p className="login-hint">Tap the link in the email to open the app.</p>
          </div>
        ) : (
          /* ---- Email form ---- */
          <>
            <h2 className="login-title">Sign in</h2>
            <p className="login-subtitle">Enter your email and we'll send you a sign-in link — no password needed.</p>

            <form onSubmit={handleSubmit} className="login-form">
              <label htmlFor="email" className="login-label">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="login-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                // autoFocus omitted — iOS suppresses autofill when field is
                // programmatically focused; user tap triggers it fine
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
