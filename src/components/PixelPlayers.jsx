/*
  PixelPlayers.jsx
  ----------------
  Renders a single animated pixel-art soccer player on a <canvas>.
  Pass mirrored={true} to flip the character horizontally so it
  faces left (used for the right-side player in the header).

  Usage:
    <PixelPlayers />              — faces right (left side of header)
    <PixelPlayers mirrored />    — faces left  (right side of header)

  How it works:
    1. A canvas ref is created with useRef.
    2. On mount, useEffect starts a requestAnimationFrame loop.
    3. Each "pixel" in the sprite grid is drawn as 4×4 real pixels
       using fillRect, giving the chunky Game Boy look.
    4. When mirrored=true, ctx.scale(-1,1) flips the context so the
       character faces left without a separate sprite sheet.
*/

import { useEffect, useRef } from 'react'

/* --- each pixel block is 4×4 real pixels --- */
const SCALE = 4;

/* --- color palette ---
   Keeping it named makes re-theming easy later. */
const SK = '#f5c897'; /* skin tone               */
const HR = '#3d1c00'; /* dark brown hair         */
const EY = '#111111'; /* eyes                    */
const JR = '#1a55ee'; /* blue jersey             */
const JS = '#5588ff'; /* lighter blue stripe     */
const PT = '#111111'; /* black shorts            */
const WS = '#e8e8e8'; /* white socks             */
const WB = '#cc0000'; /* red stripe on socks     */
const BT = '#4a2800'; /* dark brown boot upper   */
const BS = '#111111'; /* boot sole               */
const BW = '#ffffff'; /* ball — white panels     */
const BD = '#222222'; /* ball — dark patches     */
const N  = null;      /* transparent — skip cell */

/* ---------------------------------------------------------
   SPRITE FRAMES
   Each frame is a 2-D array: frame[row][col] = color | null
   The grid is 16 cols × 20 rows at SCALE px each → 64×80 px.
   Character faces RIGHT by default.
   --------------------------------------------------------- */

/* Frame 1 — idle: player standing, ball resting at feet */
const FRAME_IDLE = [
  /* col:  0    1    2    3    4    5    6    7    8    9   10   11   12   13   14   15  */
  [  N,   N,   N,   N,   N,  HR,  HR,  HR,  HR,  HR,   N,   N,   N,   N,   N,   N  ], /*  0 hair     */
  [  N,   N,   N,   N,  HR,  SK,  SK,  SK,  SK,  SK,  HR,   N,   N,   N,   N,   N  ], /*  1 head     */
  [  N,   N,   N,   N,  SK,  EY,  SK,  SK,  SK,  EY,  SK,   N,   N,   N,   N,   N  ], /*  2 eyes     */
  [  N,   N,   N,   N,  SK,  SK,  SK,  SK,  SK,  SK,  SK,   N,   N,   N,   N,   N  ], /*  3 face     */
  [  N,   N,   N,   N,  JR,  JR,  SK,  SK,  JR,  JR,  JR,   N,   N,   N,   N,   N  ], /*  4 collar   */
  [  N,   N,   N,  JR,  JR,  JR,  JR,  JR,  JR,  JR,  JR,  JR,   N,   N,   N,   N  ], /*  5 shoulders*/
  [  N,   N,  JR,  JR,  JR,  JR,  JS,  JS,  JR,  JR,  JR,  JR,  JR,   N,   N,   N  ], /*  6 jersey   */
  [  N,  JR,  JR,  JR,  JR,  JR,  JS,  JS,  JR,  JR,  JR,  JR,  JR,  JR,   N,   N  ], /*  7 arms out */
  [  N,  SK,  SK,  JR,  JR,  JR,  JS,  JS,  JR,  JR,  JR,  JR,  SK,  SK,   N,   N  ], /*  8 forearms */
  [  N,   N,   N,  PT,  PT,  PT,  PT,  PT,  PT,  PT,  PT,   N,   N,   N,   N,   N  ], /*  9 shorts   */
  [  N,   N,   N,  PT,  PT,  PT,  PT,  PT,  PT,  PT,  PT,   N,   N,   N,   N,   N  ], /* 10 shorts   */
  [  N,   N,   N,  WS,  WS,  WS,   N,   N,  WS,  WS,  WS,   N,   N,   N,   N,   N  ], /* 11 thighs   */
  [  N,   N,   N,  WS,  WS,   N,   N,   N,   N,  WS,  WS,   N,   N,   N,   N,   N  ], /* 12 socks    */
  [  N,   N,   N,  WS,  WS,   N,   N,   N,   N,  WS,  WS,   N,   N,   N,   N,   N  ], /* 13 socks    */
  [  N,   N,   N,  WB,  WB,   N,   N,   N,   N,  WB,  WB,   N,   N,   N,   N,   N  ], /* 14 red stripe*/
  [  N,   N,   N,  WS,  WS,   N,   N,   N,   N,  WS,  WS,   N,   N,   N,   N,   N  ], /* 15 socks    */
  [  N,   N,  BT,  BT,  BT,  BT,   N,  BT,  BT,  BT,  BT,   N,   N,   N,   N,   N  ], /* 16 boots    */
  [  N,  BS,  BS,  BT,  BT,  BT,  BS,  BS,  BT,  BT,  BT,  BS,   N,   N,   N,   N  ], /* 17 soles    */
  [  N,   N,   N,   N,   N,  BW,  BD,  BW,  BD,   N,   N,   N,   N,   N,   N,   N  ], /* 18 ball     */
  [  N,   N,   N,   N,   N,  BD,  BW,  BD,  BW,   N,   N,   N,   N,   N,   N,   N  ], /* 19 ball     */
];

/* Frame 2 — kick: right leg swings forward, ball flies right */
const FRAME_KICK = [
  /* col:  0    1    2    3    4    5    6    7    8    9   10   11   12   13   14   15  */
  [  N,   N,   N,   N,   N,  HR,  HR,  HR,  HR,  HR,   N,   N,   N,   N,   N,   N  ], /*  0 hair     */
  [  N,   N,   N,   N,  HR,  SK,  SK,  SK,  SK,  SK,  HR,   N,   N,   N,   N,   N  ], /*  1 head     */
  [  N,   N,   N,   N,  SK,  EY,  SK,  SK,  SK,  EY,  SK,   N,   N,   N,   N,   N  ], /*  2 eyes     */
  [  N,   N,   N,   N,  SK,  SK,  SK,  SK,  SK,  SK,  SK,   N,   N,   N,   N,   N  ], /*  3 face     */
  [  N,   N,   N,   N,  JR,  JR,  SK,  SK,  JR,  JR,  JR,   N,   N,   N,   N,   N  ], /*  4 collar   */
  [  N,   N,   N,  JR,  JR,  JR,  JR,  JR,  JR,  JR,  JR,  JR,   N,   N,   N,   N  ], /*  5 shoulders*/
  [  N,   N,  JR,  JR,  JR,  JR,  JS,  JS,  JR,  JR,  JR,  JR,  JR,   N,   N,   N  ], /*  6 jersey   */
  [  N,  JR,  JR,  JR,  JR,  JR,  JS,  JS,  JR,  JR,  JR,  JR,  JR,  JR,   N,   N  ], /*  7 arms out */
  [  N,  SK,  SK,  JR,  JR,  JR,  JS,  JS,  JR,  JR,  JR,  JR,  SK,  SK,   N,   N  ], /*  8 forearms */
  [  N,   N,   N,  PT,  PT,  PT,  PT,  PT,  PT,  PT,  PT,   N,   N,   N,   N,   N  ], /*  9 shorts   */
  [  N,   N,   N,  PT,  PT,  PT,  PT,  PT,  PT,  PT,  PT,   N,   N,   N,   N,   N  ], /* 10 shorts   */
  [  N,   N,   N,  WS,  WS,   N,   N,   N,  WS,  WS,   N,   N,   N,   N,   N,   N  ], /* 11 both legs*/
  [  N,   N,   N,  WS,  WS,   N,   N,   N,   N,   N,  WS,  WS,   N,   N,   N,   N  ], /* 12 kick leg */
  [  N,   N,   N,  WS,  WS,   N,   N,   N,   N,   N,   N,  WS,  WS,   N,   N,   N  ], /* 13 extends  */
  [  N,   N,   N,  WB,  WB,   N,   N,   N,   N,   N,   N,   N,  WB,  WB,   N,   N  ], /* 14 stripes  */
  [  N,   N,   N,  WS,  WS,   N,   N,   N,   N,   N,   N,   N,  WS,  WS,   N,   N  ], /* 15 socks    */
  [  N,   N,  BT,  BT,  BT,  BT,   N,   N,   N,   N,   N,   N,  BT,  BT,  BT,   N  ], /* 16 boots    */
  [  N,  BS,  BS,  BT,  BT,  BT,  BS,   N,   N,   N,   N,  BS,  BT,  BT,  BT,  BS  ], /* 17 soles    */
  [  N,   N,   N,   N,   N,   N,   N,   N,   N,  BW,  BD,  BW,   N,   N,   N,   N  ], /* 18 ball →   */
  [  N,   N,   N,   N,   N,   N,   N,   N,   N,  BD,  BW,  BD,   N,   N,   N,   N  ], /* 19 ball     */
];

const FRAMES   = [FRAME_IDLE, FRAME_KICK];
const FRAME_MS = 500; /* ms per frame */

/*
  drawFrame — paints one sprite frame onto a canvas context.
  When mirrored=true, flips the context on the X axis so the
  character faces left without a separate sprite sheet.
*/
function drawFrame(ctx, frame, mirrored) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.clearRect(0, 0, w, h);

  if (mirrored) {
    ctx.save();
    ctx.scale(-1, 1);     /* flip: positive x now goes left */
    ctx.translate(-w, 0); /* shift back so origin is top-left */
  }

  for (let row = 0; row < frame.length; row++) {
    for (let col = 0; col < frame[row].length; col++) {
      const color = frame[row][col];
      if (color === null) continue; /* transparent — skip */
      ctx.fillStyle = color;
      ctx.fillRect(col * SCALE, row * SCALE, SCALE, SCALE);
    }
  }

  if (mirrored) ctx.restore();
}

/*
  PixelPlayers renders a single 64×80 canvas.
  mirrored — if true, the player faces left (for the right side of
             the header); if false (default), the player faces right.
*/
export default function PixelPlayers({ mirrored = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    let lastFrameIdx = -1;
    let rafId;

    /* Draw frame 0 immediately so there's no blank canvas on load */
    drawFrame(ctx, FRAMES[0], mirrored);

    function animate() {
      /* divide time into FRAME_MS buckets; mod 2 → 0 or 1 */
      const idx = Math.floor(Date.now() / FRAME_MS) % FRAMES.length;

      if (idx !== lastFrameIdx) {
        lastFrameIdx = idx;
        drawFrame(ctx, FRAMES[idx], mirrored);
      }

      rafId = requestAnimationFrame(animate);
    }

    rafId = requestAnimationFrame(animate);

    /* Cancel the loop when the component unmounts */
    return () => cancelAnimationFrame(rafId);
  }, [mirrored]); /* mirrored is stable (passed from parent), but listed for correctness */

  return (
    <canvas
      ref={canvasRef}
      className="player-canvas"
      width={64}
      height={80}
      aria-hidden="true"
    />
  );
}
