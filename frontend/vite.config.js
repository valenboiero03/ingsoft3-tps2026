import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'

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
  test: {
    // vitest NO toca los specs de Playwright (los dos viven en e2e/): cada
    // herramienta con su carpeta.
    exclude: [...configDefaults.exclude, 'e2e/**'],
    coverage: {
      provider: 'v8',
      // json-summary deja coverage-summary.json, que es lo que lee el pipeline
      // para armar la tabla del Summary.
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      // Que entra en la cuenta: la logica sin DOM (src/lib/). Un archivo nuevo
      // en esa carpeta entra solo, tenga tests o no. Quedan afuera los
      // componentes de React, main.jsx y api.js (el cableado del fetch real).
      include: ['src/lib/**'],
      // El umbral: si la cobertura de lineas o de ramas queda abajo de 90,
      // vitest sale con error y el build se rompe. El porque del numero esta
      // en decisiones.md (TP5).
      thresholds: { lines: 90, branches: 90 },
    },
  },
})