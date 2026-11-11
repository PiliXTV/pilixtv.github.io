import { defineConfig } from 'vite'

// Static live player (HTML + public/ assets). Vite still handles Pages build output.
export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: true,
  },
})
