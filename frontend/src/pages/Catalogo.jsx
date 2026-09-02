import { useEffect, useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { getServicios } from '../api.js'
import { duracion, horarioNegocio, moneda } from '../formato.js'
import estilos from './Catalogo.module.css'

const TODOS = 'Todos'

export default function Catalogo() {
  const negocio = useOutletContext()
  const [servicios, setServicios] = useState(null)
  const [error, setError] = useState(null)
  const [categoria, setCategoria] = useState(TODOS)

  useEffect(() => {
    getServicios()
      .then(setServicios)
      .catch((e) => setError(e.message))
  }, [])

  // El catalogo de un negocio chico entra entero en memoria, asi que filtramos
  // aca en vez de pedirle al backend en cada clic. El endpoint igual acepta
  // ?categoria= por si algun dia el catalogo crece.
  const categorias = useMemo(() => {
    if (!servicios) return []
    return [TODOS, ...new Set(servicios.map((s) => s.categoria))]
  }, [servicios])

  const visibles = servicios?.filter(
    (s) => categoria === TODOS || s.categoria === categoria,
  )

  return (
    <div className={estilos.contenedor}>
      <div className={estilos.encabezado}>
        <div className={estilos.intro}>
          <p className={estilos.antetitulo}>Turnos online</p>
          <h1 className={estilos.titulo}>Elegí tu servicio</h1>
          <p className={estilos.bajada}>
            Reservá en menos de un minuto. Podés cancelar o reprogramar hasta 4
            horas antes del turno.
          </p>
        </div>
        <div className={estilos.datos}>
          <div>{negocio.direccion}</div>
          <div>{horarioNegocio(negocio)}</div>
        </div>
      </div>

      {error && (
        <p className={estilos.aviso} role="alert">
          No se pudo cargar el catálogo: {error}
        </p>
      )}

      {!servicios && !error && <p className={estilos.aviso}>Cargando…</p>}

      {servicios && (
        <>
          <div className={estilos.filtros}>
            {categorias.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={c === categoria}
                className={c === categoria ? estilos.chipActivo : estilos.chip}
                onClick={() => setCategoria(c)}
              >
                {c}
              </button>
            ))}
          </div>

          {visibles.length === 0 ? (
            <p className={estilos.aviso}>
              No hay servicios en esta categoría todavía.
            </p>
          ) : (
            <div className={estilos.grilla}>
              {visibles.map((s) => (
                <article key={s.id} className={estilos.tarjeta}>
                  <div className={estilos.filaSuperior}>
                    <span className={estilos.categoria}>{s.categoria}</span>
                    <span className={estilos.precio}>{moneda(s.precio)}</span>
                  </div>
                  <h2 className={estilos.nombre}>{s.nombre}</h2>
                  <p className={estilos.descripcion}>{s.descripcion}</p>
                  <p className={estilos.duracion}>
                    {duracion(s.duracion_minutos)}
                  </p>
                  <Link to={`/reservar/${s.id}`} className={estilos.boton}>
                    Reservar turno
                    <span className={estilos.oculto}> {s.nombre}</span>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}