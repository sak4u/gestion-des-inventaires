import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,      // expose on LAN → accessible from smartphone
    port: 5173,
    hmr: {
      host: 'localhost',
      port: 5173,
      clientPort: 5173,
    },
    proxy: {
      '/api': {
        target: 'https://gestion-des-inventaires-backend.vercel.app/',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: false,
      },
      '/socket.io': {
        target: 'https://gestion-des-inventaires-backend.vercel.app/',
        ws: true,
        changeOrigin: true,
      }
    }
  },
})
