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

export const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
