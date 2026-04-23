import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Vite configuration for the React migration.
// - root: tells Vite to treat the repo root as the project root
// - build.outDir: where the compiled app goes when you run `npm run build`
// - The @vitejs/plugin-react plugin enables JSX transforms and React Fast Refresh
//   (hot module replacement — changes appear instantly in the browser without a full reload)
// - VitePWA generates a service worker and web manifest so the app is installable
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // automatically update the service worker when a new version deploys
      manifest: {
        name: 'Ninja Stats',
        short_name: 'Ninjas',
        description: 'Live sideline stat tracker for the Ninjas soccer team',
        theme_color: '#0d0d0d',
        background_color: '#0d0d0d',
        display: 'standalone', // hides the browser URL bar — feels like a native app
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable', // maskable allows Android to apply its own icon shape
          },
        ],
      },
      workbox: {
        // Cache the app shell (HTML, JS, CSS) so it loads fast and works offline
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Never cache Supabase API calls — always fetch live data from the network
        navigateFallbackDenylist: [/^\/rest\//, /^\/auth\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.includes('supabase.co'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  // Vite's default entry point is index.html at the project root,
  // so no custom input needed now that the React HTML is named index.html.
  root: '.',
  build: {
    outDir: 'dist',
  },
  // Open the app automatically when running `npm run dev`.
  server: {
    open: '/',
  },
})
