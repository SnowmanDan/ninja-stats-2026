/*
  supabase.js — shared Supabase client instance
  ==============================================
  Defined once here and imported wherever needed (App.jsx, Login.jsx, etc.)
  so the same connection is reused across the whole app rather than creating
  a new client in every file.

  Credentials come from environment variables:
    - Local dev:  .env.development  (gitignored)
    - Local prod: .env.production   (gitignored)
    - Vercel:     Project Settings → Environment Variables

  SESSION STORAGE — why cookies instead of localStorage
  -------------------------------------------------------
  By default Supabase stores the session in localStorage. On iOS, an app
  installed to the home screen (PWA / standalone mode) has its OWN
  localStorage that is NOT shared with Safari. So if you tap a sign-in link
  in Mail, it opens in Safari, auth completes there, and the session lives
  in Safari's localStorage — but when you switch back to the installed PWA
  it has no session and shows the login screen again.

  Cookies ARE shared across Safari and any PWA on the same domain, so
  switching to a cookie-based storage adapter fixes this completely.
*/

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

/* ------------------------------------------------------------------ */
/*  Cookie storage adapter                                              */
/*  Supabase's auth client accepts any object that implements           */
/*  getItem / setItem / removeItem — same interface as localStorage.    */
/* ------------------------------------------------------------------ */

function getCookie(name) {
  // Split on "; name=" and grab the value portion
  const parts = `; ${document.cookie}`.split(`; ${name}=`)
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift())
  return null
}

function setCookie(name, value) {
  // 400-day expiry (longer than any Supabase refresh token lifetime)
  const expires = new Date(Date.now() + 400 * 864e5).toUTCString()
  // Add Secure flag on HTTPS (prod/Vercel) but not on localhost (HTTP)
  const secure  = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie =
    `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${secure}`
}

function deleteCookie(name) {
  // Setting an already-expired date removes the cookie
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`
}

const cookieStorage = {
  getItem:    (key)        => getCookie(key),
  setItem:    (key, value) => setCookie(key, value),
  removeItem: (key)        => deleteCookie(key),
}

/* ------------------------------------------------------------------ */
/*  Supabase client                                                     */
/* ------------------------------------------------------------------ */

/*
  flowType: 'implicit' — token lives in the URL fragment (#access_token=...)
  rather than requiring a PKCE code verifier in localStorage. This lets
  AuthConfirm.jsx exchange the token regardless of which browser context
  (Safari vs PWA) made the original request.
*/
export const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    flowType: 'implicit',
    storage:  cookieStorage,
  },
})
