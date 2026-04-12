import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite configuration for the React migration.
// - root: tells Vite to treat the repo root as the project root
// - build.outDir: where the compiled app goes when you run `npm run build`
// - The @vitejs/plugin-react plugin enables JSX transforms and React Fast Refresh
//   (hot module replacement — changes appear instantly in the browser without a full reload)
export default defineConfig({
  plugins: [react()],
  // Point Vite at our React entry point instead of the existing index.html
  // so the two can coexist during the migration.
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      // Tell the bundler which HTML file is the app entry point.
      input: 'react-index.html',
    },
  },
  // Also tell the dev server to use our React HTML file.
  server: {
    open: '/react-index.html',
  },
})
