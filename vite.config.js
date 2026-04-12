import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite configuration for the React migration.
// - root: tells Vite to treat the repo root as the project root
// - build.outDir: where the compiled app goes when you run `npm run build`
// - The @vitejs/plugin-react plugin enables JSX transforms and React Fast Refresh
//   (hot module replacement — changes appear instantly in the browser without a full reload)
export default defineConfig({
  plugins: [react()],
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
