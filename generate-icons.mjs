// One-time script to generate PWA icons from the favicon SVG.
// Run with: node generate-icons.mjs
// Output: public/pwa-192x192.png and public/pwa-512x512.png

import sharp from 'sharp';
import { readFileSync } from 'fs';

const svg = readFileSync('./favicon.svg');

// Scale up the 16x20 pixel art SVG to crisp PNG icons.
// "nearest" resampling keeps the pixel-art look sharp (no blurring).

// Flatten onto a dark background to fill the full square — prevents white edges
// from the letterboxing that happens when a portrait SVG is fit into a square icon.

const dark = { r: 13, g: 13, b: 13, alpha: 1 }; // #0d0d0d

await sharp({ create: { width: 192, height: 192, channels: 4, background: dark } })
  .composite([{ input: await sharp(svg).resize(154, 192, { kernel: 'nearest' }).png().toBuffer(), gravity: 'center' }])
  .png()
  .toFile('./public/pwa-192x192.png');

console.log('✓ pwa-192x192.png');

await sharp({ create: { width: 512, height: 512, channels: 4, background: dark } })
  .composite([{ input: await sharp(svg).resize(410, 512, { kernel: 'nearest' }).png().toBuffer(), gravity: 'center' }])
  .png()
  .toFile('./public/pwa-512x512.png');

console.log('✓ pwa-512x512.png');
console.log('Done! Icons saved to public/');
