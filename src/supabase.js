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
*/

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

/*
  flowType: 'implicit' stores the auth token in the URL fragment (#access_token=...)
  instead of using PKCE (which requires a code verifier stored in localStorage).

  PKCE breaks when the magic link opens in a different browser context than where
  it was requested — e.g. requesting from the installed PWA but clicking the link
  in Safari (they have separate localStorage). Implicit flow sidesteps this because
  the token is self-contained in the URL and works across any context.
*/
export const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    flowType: 'implicit',
  },
})
