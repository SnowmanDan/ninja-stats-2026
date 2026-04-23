// One-time script to generate PWA icons from the favicon SVG.
// Run with: node generate-icons.mjs
// Output: public/pwa-192x192.png and public/pwa-512x512.png

import sharp from 'sharp';
import { readFileSync } from 'fs';

const svg = readFileSync('./favicon.svg');

// Scale up the 16x20 pixel art SVG to crisp PNG icons.
// "nearest" resampling keeps the pixel-art look sharp (no blurring).

await sharp(svg)
  .resize(192, 192, { fit: 'contain', background: '#0d0d0d', kernel: 'nearest' })
  .png()
  .toFile('./public/pwa-192x192.png');

console.log('✓ pwa-192x192.png');

await sharp(svg)
  .resize(512, 512, { fit: 'contain', background: '#0d0d0d', kernel: 'nearest' })
  .png()
  .toFile('./public/pwa-512x512.png');

console.log('✓ pwa-512x512.png');
console.log('Done! Icons saved to public/');
