import { StrictMode } from 'react'
import * as Sentry from '@sentry/react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import Layout from './components/Layout.jsx'
import Catalogo from './pages/Catalogo.jsx'
import Reserva from './pages/Reserva.jsx'

// TP9: Sentry en el front. El DSN va escrito aca a proposito: el de un front no
// es un secreto, solo sirve para MANDAR datos (no para leerlos) y de todas
// formas viaja en el JavaScript que baja el navegador.
Sentry.init({
  dsn: 'https://bae81d6aeb202d02e16e0f6646611a28@o4512313786695680.ingest.us.sentry.io/4512313801310208',
  environment: window.location.hostname, // de que sitio vino: QA, PROD o localhost
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 1.0,
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Layout es una ruta padre: dibuja el header y el footer una sola vez
            y le pasa los datos del negocio a la pantalla que este adentro. */}
        <Route element={<Layout />}>
          <Route path="/" element={<Catalogo />} />
          <Route path="/reservar/:id" element={<Reserva />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)