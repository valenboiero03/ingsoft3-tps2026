// Cliente del backend. No usa fetch directamente: lo RECIBE por parametro
// (`traer`). En la app real api.js le pasa el fetch del navegador; en los
// tests entra un doble, y asi se prueba sin levantar el backend ni salir a
// la red.

const BASE = '/api'

export function crearCliente(traer) {
  async function pedir(ruta, opciones = {}) {
    const respuesta = await traer(`${BASE}${ruta}`, opciones)

    if (!respuesta.ok) {
      // El backend devuelve { error: "..." } en todos los casos de falla.
      const cuerpo = await respuesta.json().catch(() => ({}))
      throw new Error(cuerpo.error || `El servidor respondio ${respuesta.status}`)
    }

    return respuesta.json()
  }

  return {
    getNegocio: () => pedir('/negocio'),

    getServicios: () => pedir('/servicios'),

    getProfesionales: (servicioId) =>
      pedir(`/servicios/${servicioId}/profesionales`),

    getDisponibilidad: (servicioId, profesionalId, fecha) =>
      pedir(
        `/disponibilidad?servicioId=${servicioId}&profesionalId=${profesionalId}&fecha=${fecha}`,
      ),

    crearTurno: (datos) =>
      pedir('/turnos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      }),

    // Cancela un turno por su codigo. El backend no borra la fila: la pasa a
    // 'cancelado' y el horario vuelve a quedar libre.
    cancelarTurno: (codigo) =>
      pedir(`/turnos/${encodeURIComponent(codigo)}`, { method: 'DELETE' }),
  }
}
