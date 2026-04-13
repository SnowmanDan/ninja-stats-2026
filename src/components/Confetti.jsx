/*
  Confetti.jsx
  ------------
  Full-screen particle animation that fires once per browser session,
  but only when the most recent game was a win (active === true).

  How it works:
    1. A fixed-position <canvas> sits over the whole page.
       pointer-events: none lets clicks pass through to the page below.
    2. 120 confetti rectangles are created with random positions,
       speeds, colors, and rotations.
    3. requestAnimationFrame drives the loop. After 3 s the canvas
       fades out over 1 s, then the animation stops entirely.
    4. sessionStorage tracks whether confetti has already fired this
       session so it doesn't repeat on subsequent navigations.
*/

import { useEffect, useRef } from 'react'

/* Team-colored confetti palette */
const COLORS = [
  '#cc0000', /* team red          */
  '#ffffff', /* white             */
  '#ffcc00', /* gold accent       */
  '#4caf6e', /* green (field!)    */
  '#6fa3e0', /* light blue        */
];

const PARTICLE_COUNT = 120;
const DURATION = 3000; /* ms before fade starts */
const FADE     = 1000; /* ms the fade-out takes */

/* Key used in sessionStorage to remember confetti has fired */
const SESSION_KEY = 'confettiShown';

export default function Confetti({ active }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    /*
      Only fire if:
        1. The most recent game was a win (active prop)
        2. Confetti hasn't already been shown this browser session
    */
    if (!active || sessionStorage.getItem(SESSION_KEY)) return;

    /* Mark as shown immediately so a fast re-render can't double-fire */
    sessionStorage.setItem(SESSION_KEY, '1');

    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');

    /* Size the canvas to fill the viewport */
    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    /* Create particles scattered above the viewport */
    const particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x:      Math.random() * canvas.width,
        y:      Math.random() * -canvas.height, /* start above the top edge */
        w:      6 + Math.random() * 8,          /* width: 6–14 px */
        h:      4 + Math.random() * 5,          /* height: 4–9 px */
        color:  COLORS[Math.floor(Math.random() * COLORS.length)],
        speedY: 2 + Math.random() * 4,          /* fall speed */
        speedX: (Math.random() - 0.5) * 2,      /* slight sideways drift */
        angle:  Math.random() * Math.PI * 2,    /* starting rotation */
        spin:   (Math.random() - 0.5) * 0.15,   /* rotation per frame */
      });
    }

    let startTime = null;
    let rafId     = null;

    function draw(timestamp) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      /* Full opacity for DURATION ms, then fade to 0 over FADE ms */
      let alpha = 1;
      if (elapsed > DURATION) {
        alpha = 1 - (elapsed - DURATION) / FADE;
      }

      /* Stop once fully faded */
      if (alpha <= 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        window.removeEventListener('resize', resize);
        return; /* don't schedule another frame */
      }

      particles.forEach((p) => {
        p.y     += p.speedY;
        p.x     += p.speedX;
        p.angle += p.spin;

        /* Particles that fall below the viewport just disappear */
        if (p.y > canvas.height) return;

        /* save/restore so rotating one particle doesn't affect others */
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      rafId = requestAnimationFrame(draw);
    }

    rafId = requestAnimationFrame(draw);

    /* Cancel the loop if the component unmounts mid-animation */
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [active]); /* re-check whenever active changes (e.g. after data loads) */

  return (
    /*
      id="confetti-canvas" matches the CSS rule in index.css.
      pointer-events: none is set in CSS so clicks pass through.
    */
    <canvas ref={canvasRef} id="confetti-canvas" aria-hidden="true" />
  );
}
