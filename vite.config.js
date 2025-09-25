// vite.config.js
import { defineConfig } from 'vite'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  root: 'app',               // <- your index.html is here
  base: '/',                 // served at site root
  publicDir: '../public',    // keep using the existing public/ folder
  plugins: [legacy({ targets: ['defaults', 'not IE 11'] })],
  server: { port: 5168, host: true },
  preview: { port: 5169, host: true },
  build: {
    outDir: '../dist',       // build to repo-level dist/
    emptyOutDir: true,
    sourcemap: true
  },
  define: { global: 'globalThis' }
})
