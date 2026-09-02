import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import Layout from './components/Layout.jsx'
import Catalogo from './pages/Catalogo.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Layout es una ruta padre: dibuja el header y el footer una sola vez
            y le pasa los datos del negocio a la pantalla que este adentro. */}
        <Route element={<Layout />}>
          <Route path="/" element={<Catalogo />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)