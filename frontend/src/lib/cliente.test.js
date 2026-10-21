import { describe, expect, it, vi } from 'vitest'
import { crearCliente } from './cliente.js'

// Dobles de la respuesta de fetch: lo minimo que el cliente usa de ella.
const respuestaOk = (cuerpo) => ({ ok: true, json: async () => cuerpo })
const respuestaError = (status, cuerpo) => ({
  ok: false,
  status,
  json: async () => {
    if (cuerpo === undefined) throw new SyntaxError('no es JSON')
    return cuerpo
  },
})

describe('cliente de la API', () => {
  it('devuelve el cuerpo de la respuesta cuando el backend contesta bien', async () => {
    const traer = vi.fn().mockResolvedValue(respuestaOk([{ id: 1, nombre: 'Balayage' }]))
    const cliente = crearCliente(traer)

    const servicios = await cliente.getServicios()

    expect(servicios).toEqual([{ id: 1, nombre: 'Balayage' }])
  })

  it('pide la disponibilidad con el servicio, el profesional y la fecha en la ruta', async () => {
    const traer = vi.fn().mockResolvedValue(respuestaOk({ slots: [] }))
    const cliente = crearCliente(traer)

    await cliente.getDisponibilidad(3, 2, '2026-10-07')

    expect(traer).toHaveBeenCalledWith(
      '/api/disponibilidad?servicioId=3&profesionalId=2&fecha=2026-10-07',
      {},
    )
  })

  it('pide los profesionales del servicio elegido', async () => {
    const traer = vi.fn().mockResolvedValue(respuestaOk([]))
    const cliente = crearCliente(traer)

    await cliente.getProfesionales(5)

    expect(traer).toHaveBeenCalledWith('/api/servicios/5/profesionales', {})
  })

  it('manda la reserva por POST, como JSON', async () => {
    const traer = vi.fn().mockResolvedValue(respuestaOk({ codigo: 'TRN-2026-0001' }))
    const cliente = crearCliente(traer)
    const datos = { servicioId: 1, hora: '10:00' }

    await cliente.crearTurno(datos)

    expect(traer).toHaveBeenCalledTimes(1)
    expect(traer).toHaveBeenCalledWith('/api/turnos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    })
  })

  it('cancela el turno con DELETE sobre su codigo', async () => {
    const traer = vi
      .fn()
      .mockResolvedValue(respuestaOk({ codigo: 'TRN-2026-0001', estado: 'cancelado' }))
    const cliente = crearCliente(traer)

    const turno = await cliente.cancelarTurno('TRN-2026-0001')

    expect(turno.estado).toBe('cancelado')
    expect(traer).toHaveBeenCalledWith('/api/turnos/TRN-2026-0001', { method: 'DELETE' })
  })

  it('si el backend rechaza el pedido, falla con el mensaje que mando el backend', async () => {
    const traer = vi
      .fn()
      .mockResolvedValue(respuestaError(409, { error: 'Ese horario ya no esta disponible' }))
    const cliente = crearCliente(traer)

    await expect(cliente.crearTurno({})).rejects.toThrow('Ese horario ya no esta disponible')
  })

  it('si la respuesta de error no es JSON, falla informando el codigo HTTP', async () => {
    const traer = vi.fn().mockResolvedValue(respuestaError(502))
    const cliente = crearCliente(traer)

    await expect(cliente.getNegocio()).rejects.toThrow('El servidor respondio 502')
  })
})
