// main.jsx — the entry point for the React app.
// React needs one DOM element to "mount" into (attach itself to).
// This file finds that element, sets up URL-based routing, and hands
// control to our App component.

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App'
import AcceptInvite from './components/AcceptInvite'
import AuthConfirm  from './components/AuthConfirm'

/* ================================================================
   ROUTING
   ----------------------------------------------------------------
   We use react-router-dom to map URL paths to React components.

   Routes:
     /                  → redirect to /ninjas (the default team)
     /:teamSlug/*       → render <App /> for the team in the URL
                          (the /* allows nested routes later, e.g.
                          /ninjas/games/123)

   Inside App, we'll read the :teamSlug param via useParams() and
   use it to scope all Supabase queries to that team's data.
================================================================ */

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_relativeSplatPath: true }}>
      <Routes>
        {/* Default landing: send people to the Ninjas page */}
        <Route path="/" element={<Navigate to="/ninjas" replace />} />

        {/* Magic link token exchange — email links here instead of directly to
            Supabase's verify endpoint, so Apple Mail's link preview can't
            prefetch and consume the token before the user taps it */}
        <Route path="/auth/confirm" element={<AuthConfirm />} />

        {/* Invite acceptance — must be before /:teamSlug/* so React Router
            doesn't treat "accept-invite" as a team slug */}
        <Route path="/accept-invite" element={<AcceptInvite />} />

        {/* Team-scoped dashboard. The /* trailing pattern allows for
            future nested routes inside App without changing main.jsx. */}
        <Route path="/:teamSlug/*" element={<App />} />

        {/* Fallback: any unknown path also goes to the Ninjas page.
            Cleaner than a blank screen if someone mistypes a URL. */}
        <Route path="*" element={<Navigate to="/ninjas" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
