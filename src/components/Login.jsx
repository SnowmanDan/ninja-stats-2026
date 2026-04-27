/*
  Login.jsx — two-step sign-in: email → 6-digit code
  =====================================================
  We deliberately avoid magic links (clickable email links) because Apple
  Mail's link-preview feature makes a real GET request to the Supabase
  verify URL when the user hovers over the link, consuming the OTP token
  before the user actually clicks it. A 6-digit code sidesteps this
  entirely — there's nothing for email clients to prefetch.

  Flow:
    Step 1 — User enters email → taps "Send me a code"
              signInWithOtp() fires → Supabase emails a 6-digit code
    Step 2 — User types the code from their email
              verifyOtp() exchanges the code for a session
              onAuthStateChange in App.jsx detects SIGNED_IN → Login disappears

  Note: the Supabase "Magic Link" email template must be customised to show
  {{ .Token }} (the 6-digit code) instead of {{ .ConfirmationURL }} (a link).
  See Supabase dashboard → Authentication → Email Templates → Magic Link.

  Props:
    db — the shared Supabase client (from src/supabase.js)
*/

import { useState } from 'react'

export default function Login({ db }) {

  const [email,   setEmail]   = useState('')
  const [code,    setCode]    = useState('')
  const [step,    setStep]    = useState('email')  // 'email' | 'code'
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  /* ---- Step 1: send the OTP code --------------------------------- */
  async function handleSendCode(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: authError } = await db.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,  // create an account if they don't have one yet
        // No emailRedirectTo — we're using a code, not a magic link
      },
    })

    setLoading(false)

    if (authError) {
      setError(authError.message)
      return
    }

    setStep('code')
  }

  /* ---- Step 2: verify the code ----------------------------------- */
  async function handleVerifyCode(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: verifyError } = await db.auth.verifyOtp({
      email,
      token: code.trim(),
      type:  'email',
    })

    setLoading(false)

    if (verifyError) {
      setError(verifyError.message)
      return
    }

    // Success — onAuthStateChange in App.jsx picks up SIGNED_IN and
    // updates user state, causing this Login screen to disappear.
  }

  /* ---- Shared header -------------------------------------------- */
  const header = (
    <header>
      <div className="header-inner">
        <div className="header-center">
          <h1 className="team-name">Statsy</h1>
          <p className="season-label">Spring 2026 Season</p>
        </div>
      </div>
    </header>
  )

  /* ---- Render ---------------------------------------------------- */
  return (
    <div className="page-wrapper">
      {header}

      <div className="card login-card">

        {step === 'email' ? (

          /* ---- Step 1: email input ---- */
          <>
            <h2 className="login-title">Sign in</h2>
            <p className="login-subtitle">
              Enter your email and we'll send you a 6-digit sign-in code — no password needed.
            </p>

            <form onSubmit={handleSendCode} className="login-form">
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
                // autoFocus omitted — iOS suppresses autofill suggestions
                // when a field is programmatically focused
              />

              {error && <p className="login-error">{error}</p>}

              <button
                type="submit"
                className="btn btn-primary login-btn"
                disabled={loading}
              >
                {loading ? 'Sending…' : 'Send me a code'}
              </button>
            </form>
          </>

        ) : (

          /* ---- Step 2: code input ---- */
          <>
            <h2 className="login-title">Check your email</h2>
            <p className="login-subtitle">
              We sent a 6-digit code to <strong>{email}</strong>. Enter it below — it expires in 1 hour.
            </p>

            <form onSubmit={handleVerifyCode} className="login-form">
              <label htmlFor="code" className="login-label">Sign-in code</label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="login-input login-code-input"
                placeholder="123456"
                value={code}
                maxLength={6}
                onChange={(e) => {
                  // Strip non-digits and cap at 6 characters
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }}
                required
                autoFocus
              />

              {error && <p className="login-error">{error}</p>}

              <button
                type="submit"
                className="btn btn-primary login-btn"
                disabled={loading || code.length < 6}
              >
                {loading ? 'Verifying…' : 'Sign in'}
              </button>

              {/* Let the user go back if they mis-typed their email */}
              <button
                type="button"
                className="btn settings-cancel-btn login-btn"
                onClick={() => { setStep('email'); setCode(''); setError(null) }}
                disabled={loading}
              >
                Use a different email
              </button>
            </form>
          </>

        )}
      </div>
    </div>
  )
}
