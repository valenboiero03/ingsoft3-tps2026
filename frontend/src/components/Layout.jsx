import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { getNegocio } from '../api.js'
import estilos from './Layout.module.css'

export default function Layout() {
  const [negocio, setNegocio] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getNegocio()
      .then(setNegocio)
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    if (!negocio) return
    // El color de acento sale de la base. Es lo que permite que el mismo
    // frontend sirva para una veterinaria o una academia sin tocar codigo.
    document.documentElement.style.setProperty('--acento', negocio.color_acento)
    document.title = `${negocio.nombre} · Turnos`
  }, [negocio])

  if (error) {
    return (
      <p className={estilos.aviso} role="alert">
        No se pudo conectar con el servidor: {error}
      </p>
    )
  }

  if (!negocio) {
    return <p className={estilos.aviso}>Cargando…</p>
  }

  return (
    <div className={estilos.pagina}>
      <header className={estilos.header}>
        <div className={estilos.headerInterno}>
          <div className={estilos.marca}>
            <span className={estilos.cuadrado} aria-hidden="true" />
            <span className={estilos.nombre}>{negocio.nombre}</span>
            <span className={estilos.rubro}>{negocio.rubro}</span>
          </div>
          <nav>
            <NavLink to="/" className={estilos.link}>
              Catálogo
            </NavLink>
          </nav>
        </div>
      </header>

      <main className={estilos.main}>
        <Outlet context={negocio} />
      </main>

      <footer className={estilos.footer}>
        <div className={estilos.footerInterno}>
          <span>
            {negocio.nombre} {negocio.rubro} · {negocio.direccion}
          </span>
          <span>Turnero desarrollado como proyecto académico</span>
        </div>
      </footer>
    </div>
  )
}