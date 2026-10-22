import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  getServicios,
  getProfesionales,
  getDisponibilidad,
  crearTurno,
  cancelarTurno,
} from '../api.js'
import { duracion, moneda } from '../lib/formato.js'
import estilos from './Reserva.module.css'

// Fecha de hoy en formato YYYY-MM-DD, para el atributo min del input date.
function hoy() {
  const ahora = new Date()
  const mes = String(ahora.getMonth() + 1).padStart(2, '0')
  const dia = String(ahora.getDate()).padStart(2, '0')
  return `${ahora.getFullYear()}-${mes}-${dia}`
}

export default function Reserva() {
  const { id } = useParams()

  // Paso 1: el servicio elegido. El catalogo entero ya lo trae /api/servicios,
  // asi que no hace falta un endpoint aparte para uno solo (mismo criterio
  // que ya usa Catalogo.jsx: es un negocio chico, entra entero en memoria).
  const [servicio, setServicio] = useState(null)
  const [errorServicio, setErrorServicio] = useState(null)

  // Paso 2: profesionales habilitados para ese servicio.
  const [profesionales, setProfesionales] = useState(null)
  const [errorProfesionales, setErrorProfesionales] = useState(null)
  const [profesionalId, setProfesionalId] = useState('')

  // Paso 3: fecha y horarios disponibles para ese servicio + profesional.
  const [fecha, setFecha] = useState('')
  const [disponibilidad, setDisponibilidad] = useState(null)
  const [errorDisponibilidad, setErrorDisponibilidad] = useState(null)
  const [hora, setHora] = useState('')

  // Paso 4: datos del cliente y envio.
  const [nombreCliente, setNombreCliente] = useState('')
  const [telefonoCliente, setTelefonoCliente] = useState('')
  const [emailCliente, setEmailCliente] = useState('')
  const [nota, setNota] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState(null)
  const [confirmacion, setConfirmacion] = useState(null)

  // Despues de reservar: el cliente se puede arrepentir en la misma pantalla.
  const [cancelando, setCancelando] = useState(false)
  const [errorCancelar, setErrorCancelar] = useState(null)
  const [cancelado, setCancelado] = useState(false)

  useEffect(() => {
    getServicios()
      .then((lista) => {
        const encontrado = lista.find((s) => s.id === Number(id))
        setServicio(encontrado || false)
      })
      .catch((e) => setErrorServicio(e.message))
  }, [id])

  useEffect(() => {
    if (!servicio) return
    getProfesionales(servicio.id)
      .then((lista) => {
        setProfesionales(lista)
        // Si hay uno solo, no tiene sentido pedirle al cliente que elija.
        if (lista.length === 1) setProfesionalId(String(lista[0].id))
      })
      .catch((e) => setErrorProfesionales(e.message))
  }, [servicio])

  useEffect(() => {
    if (!servicio || !profesionalId || !fecha) return
    getDisponibilidad(servicio.id, profesionalId, fecha)
      .then(setDisponibilidad)
      .catch((e) => setErrorDisponibilidad(e.message))
  }, [servicio, profesionalId, fecha])

  // La disponibilidad depende de profesional + fecha: si cualquiera de los
  // dos cambia, la anterior queda invalida y hay que pedirla de nuevo.
  function elegirProfesional(idProfesional) {
    setProfesionalId(idProfesional)
    setFecha('')
    setHora('')
    setDisponibilidad(null)
    setErrorDisponibilidad(null)
  }

  function elegirFecha(nuevaFecha) {
    setFecha(nuevaFecha)
    setHora('')
    setDisponibilidad(null)
    setErrorDisponibilidad(null)
  }

  async function confirmarTurno(evento) {
    evento.preventDefault()
    setEnviando(true)
    setErrorEnvio(null)
    try {
      const turno = await crearTurno({
        servicioId: servicio.id,
        profesionalId: Number(profesionalId),
        fecha,
        hora,
        nombreCliente,
        telefono: telefonoCliente,
        emailCliente: emailCliente || undefined,
        nota: nota || undefined,
      })
      setConfirmacion(turno)
    } catch (e) {
      // Si el horario se ocupo entre que se eligio y se confirmo, el backend
      // responde 409: volvemos a pedir la disponibilidad para mostrar la real.
      setErrorEnvio(e.message)
      getDisponibilidad(servicio.id, profesionalId, fecha)
        .then(setDisponibilidad)
        .catch(() => {})
      setHora('')
    } finally {
      setEnviando(false)
    }
  }

  // La regla (hasta 4 horas antes) la aplica el backend: si no se puede, el
  // 409 trae el motivo y se lo mostramos tal cual.
  async function cancelarReserva() {
    setCancelando(true)
    setErrorCancelar(null)
    try {
      await cancelarTurno(confirmacion.codigo)
      setCancelado(true)
    } catch (e) {
      setErrorCancelar(e.message)
    } finally {
      setCancelando(false)
    }
  }

  if (errorServicio) {
    return (
      <div className={estilos.contenedor}>
        <p className={estilos.aviso} role="alert">
          No se pudo conectar con el servidor: {errorServicio}
        </p>
        <Link to="/" className={estilos.volver}>
          Volver al catálogo
        </Link>
      </div>
    )
  }

  if (servicio === false) {
    return (
      <div className={estilos.contenedor}>
        <p className={estilos.aviso} role="alert">
          Ese servicio no existe o ya no está disponible.
        </p>
        <Link to="/" className={estilos.volver}>
          Volver al catálogo
        </Link>
      </div>
    )
  }

  if (!servicio) {
    return (
      <div className={estilos.contenedor}>
        <p className={estilos.aviso}>Cargando…</p>
      </div>
    )
  }

  if (confirmacion && cancelado) {
    return (
      <div className={estilos.contenedor}>
        <div className={estilos.confirmacion}>
          <p className={estilos.antetitulo}>Reserva cancelada</p>
          <h1 className={estilos.titulo}>Tu turno quedó cancelado</h1>
          <p className={estilos.bajada}>
            El horario del {fecha} a las {hora} vuelve a estar libre.
          </p>
          <p className={estilos.codigo}>
            Código de la reserva: <strong>{confirmacion.codigo}</strong>
          </p>
          <Link to="/" className={estilos.boton}>
            Volver al catálogo
          </Link>
        </div>
      </div>
    )
  }

  if (confirmacion) {
    return (
      <div className={estilos.contenedor}>
        <div className={estilos.confirmacion}>
          <p className={estilos.antetitulo}>Turno confirmado</p>
          <h1 className={estilos.titulo}>¡Listo, {nombreCliente.split(' ')[0]}!</h1>
          <p className={estilos.bajada}>
            Reservaste <strong>{servicio.nombre}</strong> para el {fecha} a las{' '}
            {hora}.
          </p>
          <p className={estilos.codigo}>
            Código de la reserva: <strong>{confirmacion.codigo}</strong>
          </p>
          <Link to="/" className={estilos.boton}>
            Volver al catálogo
          </Link>
          {errorCancelar && (
            <p className={estilos.aviso} role="alert">
              {errorCancelar}
            </p>
          )}
          <button
            type="button"
            className={estilos.botonSecundario}
            onClick={cancelarReserva}
            disabled={cancelando}
          >
            {cancelando ? 'Cancelando…' : 'Cancelar esta reserva'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={estilos.contenedor}>
      <Link to="/" className={estilos.volver}>
        ← Volver al catálogo
      </Link>

      <div className={estilos.resumenServicio}>
        <span className={estilos.categoria}>{servicio.categoria}</span>
        <h1 className={estilos.titulo}>{servicio.nombre}</h1>
        <p className={estilos.bajada}>{servicio.descripcion}</p>
        <div className={estilos.datosServicio}>
          <span>{duracion(servicio.duracion_minutos)}</span>
          <span className={estilos.precio}>{moneda(servicio.precio)}</span>
        </div>
      </div>

      {errorProfesionales && (
        <p className={estilos.aviso} role="alert">
          No se pudieron cargar los profesionales: {errorProfesionales}
        </p>
      )}

      {profesionales && profesionales.length === 0 && (
        <p className={estilos.aviso} role="alert">
          Por ahora no hay nadie habilitado para este servicio.
        </p>
      )}

      {profesionales && profesionales.length > 0 && (
        <form className={estilos.formulario} onSubmit={confirmarTurno}>
          {profesionales.length > 1 && (
            <section className={estilos.seccion}>
              <h2 className={estilos.tituloSeccion}>¿Con quién?</h2>
              <div className={estilos.opciones}>
                {profesionales.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={String(p.id) === profesionalId}
                    className={
                      String(p.id) === profesionalId
                        ? estilos.opcionActiva
                        : estilos.opcion
                    }
                    onClick={() => elegirProfesional(String(p.id))}
                  >
                    {p.nombre}
                    <span className={estilos.rol}>{p.rol}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {profesionalId && (
            <section className={estilos.seccion}>
              <h2 className={estilos.tituloSeccion}>¿Qué día?</h2>
              <input
                type="date"
                aria-label="Fecha del turno"
                className={estilos.input}
                min={hoy()}
                value={fecha}
                onChange={(e) => elegirFecha(e.target.value)}
                required
              />
            </section>
          )}

          {errorDisponibilidad && (
            <p className={estilos.aviso} role="alert">
              No se pudo calcular la disponibilidad: {errorDisponibilidad}
            </p>
          )}

          {disponibilidad && !disponibilidad.abierto && (
            <p className={estilos.aviso}>{disponibilidad.motivo}</p>
          )}

          {disponibilidad?.abierto && disponibilidad.slots.length === 0 && (
            <p className={estilos.aviso}>
              No quedan horarios libres ese día. Probá con otra fecha.
            </p>
          )}

          {disponibilidad?.abierto && disponibilidad.slots.length > 0 && (
            <section className={estilos.seccion}>
              <h2 className={estilos.tituloSeccion}>¿A qué hora?</h2>
              <div className={estilos.grillaHorarios}>
                {disponibilidad.slots.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={s === hora}
                    className={s === hora ? estilos.horarioActivo : estilos.horario}
                    onClick={() => setHora(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </section>
          )}

          {hora && (
            <section className={estilos.seccion}>
              <h2 className={estilos.tituloSeccion}>Tus datos</h2>
              <div className={estilos.campo}>
                <label className={estilos.etiqueta} htmlFor="nombreCliente">
                  Nombre y apellido
                </label>
                <input
                  id="nombreCliente"
                  className={estilos.input}
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                  required
                />
              </div>
              <div className={estilos.campo}>
                <label className={estilos.etiqueta} htmlFor="telefonoCliente">
                  Teléfono
                </label>
                <input
                  id="telefonoCliente"
                  className={estilos.input}
                  value={telefonoCliente}
                  onChange={(e) => setTelefonoCliente(e.target.value)}
                  required
                />
              </div>
              <div className={estilos.campo}>
                <label className={estilos.etiqueta} htmlFor="emailCliente">
                  Email (opcional)
                </label>
                <input
                  id="emailCliente"
                  type="email"
                  className={estilos.input}
                  value={emailCliente}
                  onChange={(e) => setEmailCliente(e.target.value)}
                />
              </div>
              <div className={estilos.campo}>
                <label className={estilos.etiqueta} htmlFor="nota">
                  Nota (opcional)
                </label>
                <textarea
                  id="nota"
                  className={estilos.textarea}
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  rows={3}
                />
              </div>

              {errorEnvio && (
                <p className={estilos.aviso} role="alert">
                  {errorEnvio}
                </p>
              )}

              <button type="submit" className={estilos.boton} disabled={enviando}>
                {enviando ? 'Confirmando…' : 'Confirmar turno'}
              </button>
            </section>
          )}
        </form>
      )}
    </div>
  )
}