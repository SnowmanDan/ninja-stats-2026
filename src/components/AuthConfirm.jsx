/*
  AuthConfirm.jsx — exchanges a Supabase token_hash for a live session
  ======================================================================
  This is the page the magic link email points to. Instead of linking
  directly to Supabase's /auth/v1/verify endpoint (which Apple Mail
  prefetches and consumes the token), emails link here:

    https://yourapp.com/auth/confirm?token_hash=XXX&type=magiclink

  When Apple Mail previews that URL it gets our static React HTML — safe,
  no token consumed. When the user actually taps the link, this component
  runs, calls verifyOtp(), and establishes the session.

  On success → redirects to / (App.jsx picks the right team from there)
  On failure → shows an error with a link back to the sign-in screen
*/

import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { db } from '../supabase'

export default function AuthConfirm() {
  const [searchParams]  = useSearchParams()
  const navigate        = useNavigate()
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    async function confirm() {
      const tokenHash = searchParams.get('token_hash')
      const type      = searchParams.get('type') ?? 'magiclink'

      if (!tokenHash) {
        setErrorMsg('Invalid sign-in link — no token found. Please request a new one.')
        return
      }

      const { error } = await db.auth.verifyOtp({ token_hash: tokenHash, type })

      if (error) {
        setErrorMsg(
          error.message.includes('expired')
            ? 'This sign-in link has expired. Please request a new one.'
            : `Sign-in failed: ${error.message}`
        )
        return
      }

      // Session established — head to the root, App.jsx will route to
      // the user's team (or show TeamCreator if they're new).
      navigate('/', { replace: true })
    }

    confirm()
  }, []) // runs once on mount

  return (
    <div className="page-wrapper">
      <header>
        <div className="header-inner">
          <div className="header-center">
            <h1 className="team-name">Statsy</h1>
          </div>
        </div>
      </header>

      <div className="card login-card">
        {errorMsg ? (
          <div className="login-success">
            <p className="login-success-icon">⚠️</p>
            <h2>Sign-in failed</h2>
            <p>{errorMsg}</p>
            <a href="/" className="btn btn-primary" style={{ marginTop: '1rem', textDecoration: 'none', textAlign: 'center' }}>
              Back to sign in
            </a>
          </div>
        ) : (
          <div className="login-success">
            <p className="login-success-icon">🔐</p>
            <h2>Signing you in…</h2>
            <p>Just a moment.</p>
          </div>
        )}
      </div>
    </div>
  )
}
