/*
  LandingPage.jsx — marketing homepage for Stat-Ninja
  =====================================================
  Shown at / (the root URL). Describes the product, shows features,
  explains how to install as a PWA, and links to the app.

  If the visitor is already signed in, we skip straight to their team.
*/

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../supabase'

export default function LandingPage() {
  const navigate = useNavigate()

  // If already signed in, find the user's first team and go there
  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await db.auth.getSession()
      if (!session) return

      // Find the user's teams so we can navigate to the right slug
      const { data: memberships } = await db
        .from('team_members')
        .select('teams(slug)')
        .eq('user_id', session.user.id)
        .limit(1)
        .single()

      const slug = memberships?.teams?.slug
      navigate(slug ? `/${slug}` : '/ninjas', { replace: true })
    }
    checkSession()
  }, [])

  return (
    <div className="lp">

      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className="lp-nav">
        <span className="lp-logo">
          <span className="lp-logo-icon">🥷</span> Stat-Ninja
        </span>
        <a href="/ninjas" className="btn btn-primary lp-nav-btn">Sign In</a>
      </nav>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="lp-hero">
        <div className="lp-hero-text">
          <h1 className="lp-headline">
            Know Your Team.<br />Track Every Kick.
          </h1>
          <p className="lp-subhead">
            Stat-Ninja is the free, easy way to track stats for youth soccer —
            right from the sideline. Understand your team's strengths, spot
            opportunities, and share the insights with coaches and parents.
          </p>
          <a href="/ninjas" className="btn btn-primary lp-hero-btn">
            Get Started Free →
          </a>
          <p className="lp-hero-note">No credit card. No setup fee. Free forever for one team.</p>
        </div>

        <div className="lp-hero-art">
          <NinjaSVG />
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section className="lp-section">
        <h2 className="lp-section-title">Everything you need. Nothing you don't.</h2>
        <div className="lp-feature-grid">
          <div className="lp-feature-card">
            <span className="lp-feature-icon">⚡</span>
            <h3 className="lp-feature-title">Log stats live</h3>
            <p className="lp-feature-desc">
              Tap to record goals, assists, shots on goal, saves, and tackles
              in real time — no paper, no pencil.
            </p>
          </div>
          <div className="lp-feature-card">
            <span className="lp-feature-icon">📊</span>
            <h3 className="lp-feature-title">See the full picture</h3>
            <p className="lp-feature-desc">
              Season totals, per-game breakdowns, and goalie stats — all in
              one place, always up to date.
            </p>
          </div>
          <div className="lp-feature-card">
            <span className="lp-feature-icon">📱</span>
            <h3 className="lp-feature-title">Built for sidelines</h3>
            <p className="lp-feature-desc">
              Mobile-first with big tap targets. Install it on your home
              screen and it works just like a native app.
            </p>
          </div>
          <div className="lp-feature-card">
            <span className="lp-feature-icon">👥</span>
            <h3 className="lp-feature-title">Invite your team</h3>
            <p className="lp-feature-desc">
              Share with coaches and parents so everyone can follow along —
              no spreadsheets, no group texts.
            </p>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section className="lp-section lp-how">
        <h2 className="lp-section-title">Up and running in minutes</h2>
        <div className="lp-steps">
          <div className="lp-step">
            <span className="lp-step-num">1</span>
            <div className="lp-step-text">
              <h3>Create your team</h3>
              <p>Sign up free — enter your team name and season. Done in under a minute.</p>
            </div>
          </div>
          <div className="lp-step-divider" aria-hidden="true" />
          <div className="lp-step">
            <span className="lp-step-num">2</span>
            <div className="lp-step-text">
              <h3>Add your roster</h3>
              <p>Enter player names and jersey numbers. Invite coaches and parents by email.</p>
            </div>
          </div>
          <div className="lp-step-divider" aria-hidden="true" />
          <div className="lp-step">
            <span className="lp-step-num">3</span>
            <div className="lp-step-text">
              <h3>Log your first game</h3>
              <p>Tap players and events as they happen. Save the stats when the final whistle blows.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PWA Install ──────────────────────────────────── */}
      <section className="lp-section lp-pwa">
        <h2 className="lp-section-title">Add to your home screen</h2>
        <p className="lp-pwa-desc">
          Install Stat-Ninja like a native app — no App Store download required.
          Works on iPhone and Android.
        </p>
        <div className="lp-pwa-grid">
          <div className="lp-pwa-card">
            <h3 className="lp-pwa-platform">🍎 iPhone &amp; iPad</h3>
            <ol className="lp-pwa-steps">
              <li>Open <strong>Safari</strong> and visit <strong>stat-ninja.com</strong></li>
              <li>Tap the <strong>Share</strong> button — the box with an arrow pointing up ↑</li>
              <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
              <li>Tap <strong>Add</strong> — it'll appear on your home screen like any app</li>
            </ol>
            <p className="lp-pwa-note">⚠️ Must use Safari — Chrome on iPhone can't install PWAs.</p>
          </div>
          <div className="lp-pwa-card">
            <h3 className="lp-pwa-platform">🤖 Android</h3>
            <ol className="lp-pwa-steps">
              <li>Open <strong>Chrome</strong> and visit <strong>stat-ninja.com</strong></li>
              <li>Tap the <strong>menu</strong> — the three dots ⋮ in the top right</li>
              <li>Tap <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong></li>
              <li>Tap <strong>Add</strong> — done!</li>
            </ol>
            <p className="lp-pwa-note">💡 Chrome may show an install banner automatically.</p>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────── */}
      <section className="lp-cta-section">
        <h2 className="lp-cta-headline">Ready to track your season?</h2>
        <p className="lp-cta-sub">Free forever for one team. No credit card. No setup fees.</p>
        <a href="/ninjas" className="btn btn-primary lp-hero-btn">
          Get Started Free →
        </a>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="lp-footer">
        <span>© 2026 Stat-Ninja</span>
      </footer>

    </div>
  )
}

/* ── Ninja SVG ──────────────────────────────────────────────────────────── */
function NinjaSVG() {
  return (
    <svg
      viewBox="0 0 300 230"
      className="lp-ninja-svg"
      aria-label="Cartoon ninja kicking a soccer ball"
      role="img"
    >
      {/* Motion / speed lines behind the ball */}
      <g stroke="#cc0000" strokeWidth="3" strokeLinecap="round" opacity="0.75">
        <line x1="178" y1="75"  x2="200" y2="62" />
        <line x1="182" y1="100" x2="208" y2="100" />
        <line x1="178" y1="125" x2="200" y2="138" />
      </g>

      {/* ── Soccer ball ── */}
      <g transform="translate(232, 100)">
        {/* White base */}
        <circle r="34" fill="white" stroke="#333" strokeWidth="2.5" />
        {/* Centre pentagon (black) */}
        <polygon points="0,-22 13,-8 8,11 -8,11 -13,-8" fill="#222" />
        {/* Surrounding pentagons (slightly transparent) */}
        <polygon points="13,-8 29,-12 31,6  19,17  8,11"  fill="#222" opacity="0.5" />
        <polygon points="-13,-8 -29,-12 -31,6 -19,17 -8,11" fill="#222" opacity="0.5" />
        <polygon points="8,11  19,17  13,31 -13,31 -19,17 -8,11" fill="#222" opacity="0.5" />
        <polygon points="0,-22 -13,-8 -29,-12 -23,-29 0,-33" fill="#222" opacity="0.5" />
        <polygon points="0,-22  13,-8  29,-12  23,-29 0,-33" fill="#222" opacity="0.5" />
        {/* Highlight gloss */}
        <ellipse cx="-10" cy="-14" rx="8" ry="5" fill="white" opacity="0.35" transform="rotate(-30 -10 -14)" />
      </g>

      {/* ── Kicking leg (extended toward ball) ── */}
      <line x1="104" y1="158" x2="198" y2="112"
            stroke="#1a1a1a" strokeWidth="17" strokeLinecap="round" />
      {/* Kicking boot (red) */}
      <ellipse cx="201" cy="109" rx="18" ry="11"
               fill="#cc0000" transform="rotate(-25 201 109)" />

      {/* ── Body ── */}
      <ellipse cx="88" cy="137" rx="24" ry="31" fill="#1a1a1a" />

      {/* White belt stripe */}
      <rect x="66" y="133" width="46" height="8" rx="4" fill="white" opacity="0.15" />

      {/* ── Left arm (swinging back for balance) ── */}
      <line x1="66" y1="118" x2="32" y2="93"
            stroke="#1a1a1a" strokeWidth="14" strokeLinecap="round" />
      <circle cx="30" cy="91" r="8" fill="#1a1a1a" />

      {/* ── Right arm (reaching forward) ── */}
      <line x1="110" y1="120" x2="143" y2="140"
            stroke="#1a1a1a" strokeWidth="14" strokeLinecap="round" />
      <circle cx="146" cy="142" r="7" fill="#1a1a1a" />

      {/* ── Standing leg ── */}
      <line x1="78" y1="166" x2="63" y2="212"
            stroke="#1a1a1a" strokeWidth="17" strokeLinecap="round" />
      {/* Standing foot */}
      <ellipse cx="57" cy="215" rx="19" ry="9" fill="#1a1a1a" />

      {/* ── Head ── */}
      <circle cx="88" cy="70" r="30" fill="#1a1a1a" />

      {/* Red headband */}
      <path d="M59,63 Q88,45 117,63"
            stroke="#cc0000" strokeWidth="10" fill="none" strokeLinecap="round" />
      {/* Headband tail/knot on the right side */}
      <path d="M117,63 L130,72 L123,82"
            stroke="#cc0000" strokeWidth="7" fill="none"
            strokeLinecap="round" strokeLinejoin="round" />

      {/* White mask strip across eyes */}
      <rect x="70" y="69" width="40" height="11" rx="5.5" fill="white" />

      {/* Eyes (dark circles on white mask) */}
      <circle cx="81"  cy="74.5" r="3.5" fill="#1a1a1a" />
      <circle cx="99"  cy="74.5" r="3.5" fill="#1a1a1a" />

      {/* Eye shine highlights */}
      <circle cx="82.5" cy="73" r="1.2" fill="white" />
      <circle cx="100.5" cy="73" r="1.2" fill="white" />

      {/* Cloth wrapping detail on forehead */}
      <path d="M59,63 Q65,68 70,66" stroke="#990000" strokeWidth="2" fill="none" opacity="0.5" />
      <path d="M117,63 Q111,68 107,66" stroke="#990000" strokeWidth="2" fill="none" opacity="0.5" />
    </svg>
  )
}
