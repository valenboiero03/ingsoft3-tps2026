import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e', // recoge los DOS archivos; cada job del pipeline corre el suyo por nombre
  timeout: 60_000, // tope de CADA test: generoso por el cold start del plan gratis de Render
  expect: { timeout: 15_000 }, // tope de CADA asercion (el default es 5 s)
  // QA es uno solo: las pruebas van de a una para no pisarse los horarios.
  workers: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:8080', // el FRONT. La api tiene la suya: API_BASE_URL
    trace: 'on-first-retry', // la traza se graba en el retry de un fallo
    screenshot: 'only-on-failure', // captura de cada fallo en el reporte
  },
  retries: 1, // absorbe una demora suelta; si un test pasa recien ahi, sale «flaky»
  reporter: [['html', { open: 'never' }], ['list']],
})
