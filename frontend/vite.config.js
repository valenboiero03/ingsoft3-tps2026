import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // En produccion nginx redirige /api al backend. Esto hace lo mismo cuando
    // corres "npm run dev" fuera de docker, para que la URL relativa /api
    // funcione igual en los dos entornos.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})