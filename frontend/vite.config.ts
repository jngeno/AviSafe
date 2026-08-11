import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // maplibre-gl ships its own web worker; Vite's dep pre-bundler mangles
  // the worker's import URL when it optimizes the package, so it must be
  // excluded and let the browser load it as real ESM.
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
})
