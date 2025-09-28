// vite.config.js
import { defineConfig } from 'vite'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  root: '.',                 // Root is project root where index.html lives
  base: '/',                 
  publicDir: 'public',       // Standard public folder
  plugins: [legacy({ targets: ['defaults', 'not IE 11'] })],
  server: { port: 5168, host: true },
  preview: { port: 5169, host: true },
  build: {
    outDir: 'dist',          // Build directly to dist/
    emptyOutDir: true,
    sourcemap: true
  },
  define: { global: 'globalThis' }
})