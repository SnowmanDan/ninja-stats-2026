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
          <img
            src="/ninja-hero.png"
            alt="Cartoon ninja kicking a soccer ball"
            className="lp-ninja-svg"
          />
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

/* ── Pixel-art Ninja in a Game Boy frame ───────────────────────────────── */
function NinjaSVG() {
  const PS = 10  // each "pixel" is 10×10 SVG units

  // Color palette — Game Boy 4-green + red accent (GBC style)
  const COLORS = {
    K: '#0f380f',  // darkest green  — ninja body, ball dark patches
    W: '#8bac0f',  // light green    — eye mask, ball light patches
    R: '#dd2222',  // red            — headband, kicking boot
    w: '#8bac0f',  // ball white     — same as W
    b: '#0f380f',  // ball black     — same as K
  }

  // Hand-drawn 26×18 pixel sprite (each char = one pixel, '.' = transparent)
  // Columns 0-12: ninja | Columns 15-25: soccer ball
  const SPRITE = [
    '.....KKKK.................', //  0  head top
    '....KRRRKK................', //  1  red headband
    '....KWWWKK................', //  2  eye mask (white strip)
    '....KKWKWK................', //  3  eyes
    '.....KKKK.................', //  4  chin
    '....KKKKKK................', //  5  neck / upper body
    '..KKKKKKKKKK..............', //  6  wide shoulders (arms out)
    '....KKKKKK................', //  7  body
    '....KKKK..KKKK............', //  8  hips + kicking leg begins
    '...KK......KKKKKK.........', //  9  standing leg + kick extends
    '...KK..........KKKRR.....b', // 10  kick reaches boot + ball edge
    '..KKKK..........RRwwwbbwww', // 11  foot + red boot + ball starts
    '..KK...........wwwwwwwbwww', // 12  standing leg + ball
    '.KKK...........wwbwwwwwwww', // 13  foot widens + ball
    '.KK............wwwwwwbwwww', // 14  ball
    'KKK............wwwwwwwwwbw', // 15  big foot + ball
    '...............bwwwwwwwwww', // 16  ball
    '................wwwwwwwwww', // 17  ball bottom
  ]

  // Screen sits at (22, 18) inside the Game Boy frame
  const SX = 22
  const SY = 18

  return (
    <svg
      viewBox="0 0 320 272"
      className="lp-ninja-svg"
      aria-label="Pixel art ninja kicking a soccer ball on a Game Boy screen"
      role="img"
    >
      {/* ── Game Boy outer shell ── */}
      <rect width="320" height="272" rx="18" ry="18" fill="#b8b8a8" />
      {/* Slight bevel shadow on bottom */}
      <rect x="0" y="240" width="320" height="32" rx="18" fill="#a0a090" />

      {/* ── Screen bezel ── */}
      <rect x={SX - 8} y={SY - 8} width="292" height="200" rx="6" fill="#404035" />

      {/* ── Screen (Game Boy green) ── */}
      <rect x={SX} y={SY} width="276" height="184" fill="#9bbc0f" />

      {/* ── Pixel art sprite ── */}
      <g transform={`translate(${SX + 8}, ${SY + 2})`}>
        {SPRITE.map((row, y) =>
          [...row].map((char, x) => {
            const fill = COLORS[char]
            if (!fill) return null
            return (
              <rect
                key={`${x}-${y}`}
                x={x * PS} y={y * PS}
                width={PS} height={PS}
                fill={fill}
              />
            )
          })
        )}
      </g>

      {/* ── Scanline overlay for that CRT feel ── */}
      {Array.from({ length: 92 }, (_, i) => (
        <rect key={i}
          x={SX} y={SY + i * 2}
          width="276" height="1"
          fill="#000" opacity="0.05"
        />
      ))}

      {/* ── Screen glare in top-left corner ── */}
      <rect x={SX} y={SY} width="276" height="50" fill="white" opacity="0.04" />

      {/* ── Horizontal ridge between screen and controls ── */}
      <rect x="0" y="210" width="320" height="6" fill="#a8a898" />

      {/* ── D-pad ── */}
      <g fill="#2a2a22">
        <rect x="32" y="228" width="32" height="11" rx="3" />
        <rect x="42" y="218" width="12" height="30" rx="3" />
        <circle cx="48" cy="233" r="5" fill="#222218" />
      </g>

      {/* ── SELECT / START buttons ── */}
      <rect x="108" y="236" width="28" height="7" rx="3.5" fill="#888878" />
      <text x="122" y="242" textAnchor="middle" fill="#555548"
            fontSize="4.5" fontFamily="monospace" fontWeight="bold">SELECT</text>
      <rect x="152" y="236" width="28" height="7" rx="3.5" fill="#888878" />
      <text x="166" y="242" textAnchor="middle" fill="#555548"
            fontSize="4.5" fontFamily="monospace" fontWeight="bold">START</text>

      {/* ── A / B buttons ── */}
      <circle cx="272" cy="230" r="14" fill="#cc2244" />
      <text x="272" y="234.5" textAnchor="middle" fill="white"
            fontSize="10" fontFamily="monospace" fontWeight="bold">A</text>
      <circle cx="244" cy="247" r="12" fill="#cc2244" />
      <text x="244" y="251" textAnchor="middle" fill="white"
            fontSize="10" fontFamily="monospace" fontWeight="bold">B</text>

      {/* ── Speaker grille (dots) ── */}
      {[0,1,2,3,4].map(i => [0,1,2].map(j => (
        <circle key={`sp-${i}-${j}`}
          cx={292 + i * 5} cy={228 + j * 6}
          r="1.5" fill="#909085" />
      )))}

      {/* ── STAT-NINJA branding on the body ── */}
      <text x="160" y="264" textAnchor="middle" fill="#888878"
            fontSize="8.5" fontFamily="monospace" fontWeight="bold"
            letterSpacing="4">STAT-NINJA</text>
    </svg>
  )
}
