/*
  AcceptInvite.jsx — invite acceptance landing page
  ==================================================
  Reached when an invitee clicks their magic link email. The URL looks like:
    /accept-invite?token=INVITE_UUID#access_token=AUTH_TOKEN&...

  The Supabase client automatically processes the #access_token fragment
  and authenticates the user. This component then:
    1. Waits for the auth session to be established
    2. Reads the ?token= query param
    3. Fetches the invite from the database
    4. Verifies the invite is valid (not expired, not used, email matches)
    5. Adds the user to team_members with the invite's role
    6. Marks the invite as accepted
    7. Redirects to the team dashboard

  This is a standalone page — it renders outside of App.jsx and handles
  its own auth state. No team slug in the URL, no App auth gate.
*/

import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { db } from '../supabase'

export default function AcceptInvite() {
  const [searchParams]   = useSearchParams()
  const token            = searchParams.get('token')

  /*
    status:
      'loading'  — waiting for auth + invite lookup
      'success'  — joined the team, about to redirect
      'error'    — something went wrong
      'no-token' — URL has no token param (bad link)
  */
  const [status,   setStatus]   = useState('loading')
  const [message,  setMessage]  = useState('')
  const [teamName, setTeamName] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('no-token')
      return
    }

    /*
      The Supabase client processes the #access_token fragment as soon as
      it initialises (before any component mounts). By the time this effect
      runs, getSession() usually already returns the new session.

      We try getSession() first. If it returns null (rare timing edge case),
      we fall back to listening for the SIGNED_IN event.
    */
    async function run() {
      const { data: { session } } = await db.auth.getSession()

      if (session) {
        await acceptInvite(session)
        return
      }

      // Session not ready yet — wait for onAuthStateChange
      const { data: { subscription } } = db.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          subscription.unsubscribe()
          await acceptInvite(session)
        }
      })

      // Safety timeout — if auth never fires, show an error
      const timeout = setTimeout(() => {
        subscription.unsubscribe()
        setStatus('error')
        setMessage('Could not sign you in. Try clicking the invite link again.')
      }, 15000)

      return () => {
        clearTimeout(timeout)
        subscription.unsubscribe()
      }
    }

    run()
  }, [token])

  async function acceptInvite(session) {
    // Fetch the invite — RLS allows this because the user's email matches
    const { data: invite, error: fetchErr } = await db
      .from('invites')
      .select('id, team_id, email, role, accepted_at, expires_at, teams(name, slug)')
      .eq('token', token)
      .single()

    if (fetchErr || !invite) {
      setStatus('error')
      setMessage('This invite link is invalid or has already expired.')
      return
    }

    // Already used?
    if (invite.accepted_at) {
      setStatus('error')
      setMessage('This invite has already been used. Ask your team owner to send a new one.')
      return
    }

    // Expired?
    if (new Date(invite.expires_at) < new Date()) {
      setStatus('error')
      setMessage('This invite has expired (links are valid for 7 days). Ask your team owner to send a new one.')
      return
    }

    // Email mismatch?
    if (invite.email.toLowerCase() !== session.user.email.toLowerCase()) {
      setStatus('error')
      setMessage(
        `This invite was sent to ${invite.email}, but you're signed in as ${session.user.email}. ` +
        `Please sign in with the correct email address.`
      )
      return
    }

    // Add to team_members
    const { error: memberErr } = await db
      .from('team_members')
      .insert({
        user_id: session.user.id,
        team_id: invite.team_id,
        role:    invite.role,
      })

    // 23505 = unique_violation → already a member, which is fine
    if (memberErr && memberErr.code !== '23505') {
      setStatus('error')
      setMessage(`Could not join the team: ${memberErr.message}`)
      return
    }

    // Mark the invite accepted
    await db
      .from('invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    setTeamName(invite.teams.name)
    setStatus('success')

    // Redirect to the team after a short delay so the user sees the confirmation
    setTimeout(() => {
      window.location.href = `/${invite.teams.slug}`
    }, 2500)
  }

  /* ---- Render -------------------------------------------------- */

  return (
    <div className="page-wrapper">
      <header>
        <div className="header-inner">
          <div className="header-center">
            <h1 className="team-name">Ninja Stats</h1>
          </div>
        </div>
      </header>

      <div className="card login-card" style={{ textAlign: 'center' }}>
        {status === 'loading' && (
          <>
            <p className="accept-invite-icon">⏳</p>
            <h2>Joining team…</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Verifying your invite link.
            </p>
          </>
        )}

        {status === 'no-token' && (
          <>
            <p className="accept-invite-icon">🔗</p>
            <h2>Invalid link</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              This invite link is missing its token. Make sure you copied the full link from your email.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <p className="accept-invite-icon">🎉</p>
            <h2>You're in!</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              You've joined <strong>{teamName}</strong>. Taking you there now…
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <p className="accept-invite-icon">⚠️</p>
            <h2>Couldn't join</h2>
            <p style={{ color: '#e57373', marginTop: '0.5rem' }}>{message}</p>
          </>
        )}
      </div>
    </div>
  )
}
