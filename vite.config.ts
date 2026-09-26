import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:3000',
      '/projects': 'http://localhost:3000',
      '/surveys': 'http://localhost:3000',
      '/users': 'http://localhost:3000',
    },
  },
})
