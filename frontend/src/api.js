// Todas las llamadas al backend pasan por aca, asi el manejo de errores esta
// en un solo lugar. La URL es relativa a proposito: en produccion la resuelve
// nginx y en desarrollo el proxy de vite.config.js.

const BASE = '/api'

async function pedir(ruta, opciones = {}) {
  const respuesta = await fetch(`${BASE}${ruta}`, opciones)

  if (!respuesta.ok) {
    // El backend devuelve { error: "..." } en todos los casos de falla.
    const cuerpo = await respuesta.json().catch(() => ({}))
    throw new Error(cuerpo.error || `El servidor respondio ${respuesta.status}`)
  }

  return respuesta.json()
}

export const getNegocio = () => pedir('/negocio')

export const getServicios = () => pedir('/servicios')

export const getProfesionales = (servicioId) =>
  pedir(`/servicios/${servicioId}/profesionales`)

export const getDisponibilidad = (servicioId, profesionalId, fecha) =>
  pedir(
    `/disponibilidad?servicioId=${servicioId}&profesionalId=${profesionalId}&fecha=${fecha}`,
  )

export const crearTurno = (datos) =>
  pedir('/turnos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  })