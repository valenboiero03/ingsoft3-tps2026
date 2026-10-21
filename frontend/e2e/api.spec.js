// Suite de INTEGRACION: le habla directo a la api de QA, sin navegador y sin
// dobles. Del otro lado esta la base de verdad (Postgres), asi que lo que se
// comprueba con un GET lo contesto la base, no un mock.

import { expect, test } from '@playwright/test'
import { cancelarSinMirar, elegir, diaHabil, horarioLibre, horariosLibres, listarTurnos } from './agenda.js'

// La api tiene su propia direccion: NO es la del front. Sin barra al final.
const API = process.env.API_BASE_URL || 'http://localhost:3000'

const creados = []
test.afterEach(async ({ request }) => cancelarSinMirar(request, API, creados))

const activo = (t) => t.estado !== 'cancelado'

test('reservar guarda el turno en la base, y cancelarlo libera el horario', async ({ request }) => {
  const { servicio, profesional } = await elegir(request, API, 'Corte masculino', 'Valeria Sosa')
  const fecha = await diaHabil(request, API, 3)
  const hora = await horarioLibre(request, API, servicio.id, profesional.id, fecha)
  const cliente = `api ${Date.now()}` // unico: no choca con otra corrida

  const alta = await request.post(`${API}/api/turnos`, {
    data: {
      servicioId: servicio.id, profesionalId: profesional.id, fecha, hora,
      nombreCliente: cliente, telefonoCliente: '3510000000',
    },
  })
  expect(alta.status()).toBe(201)
  const turno = await alta.json()
  creados.push(turno.codigo)

  // La BASE lo devuelve, tal cual se guardo, y el horario deja de ofrecerse.
  const lista = await listarTurnos(request, API)
  expect(lista.find((t) => t.codigo === turno.codigo)).toMatchObject({
    nombre_cliente: cliente,
    fecha: `${fecha} ${hora}:00`,
    estado: 'pendiente',
  })
  expect(await horariosLibres(request, API, servicio.id, profesional.id, fecha)).not.toContain(hora)

  const baja = await request.delete(`${API}/api/turnos/${turno.codigo}`)
  expect(baja.status()).toBe(200)

  // Y la baja, comprobada: ya no hay un turno activo con ese codigo, y el
  // horario vuelve a estar libre (el indice parcial de la base lo libero).
  const despues = await listarTurnos(request, API)
  expect(despues.some((t) => t.codigo === turno.codigo && activo(t))).toBe(false)
  expect(await horariosLibres(request, API, servicio.id, profesional.id, fecha)).toContain(hora)
})

test('una reserva sin telefono la rechaza la api con 400, y no se crea nada', async ({ request }) => {
  const { servicio, profesional } = await elegir(request, API, 'Corte masculino', 'Valeria Sosa')
  const fecha = await diaHabil(request, API, 4)
  const hora = await horarioLibre(request, API, servicio.id, profesional.id, fecha)
  const cliente = `api ${Date.now()} sin telefono`
  const antes = await listarTurnos(request, API)

  const alta = await request.post(`${API}/api/turnos`, {
    data: { servicioId: servicio.id, profesionalId: profesional.id, fecha, hora, nombreCliente: cliente },
  })
  expect(alta.status()).toBe(400) // el contrato del error
  expect(await alta.json()).toEqual({ error: 'Faltan datos obligatorios' })

  const despues = await listarTurnos(request, API)
  expect(despues.length).toBe(antes.length) // y de verdad no se creo nada
  expect(despues.some((t) => t.nombre_cliente === cliente)).toBe(false)
  expect(await horariosLibres(request, API, servicio.id, profesional.id, fecha)).toContain(hora)
})

test('el mismo horario no se puede reservar dos veces: el segundo recibe 409', async ({ request }) => {
  const { servicio, profesional } = await elegir(request, API, 'Corte masculino', 'Valeria Sosa')
  const fecha = await diaHabil(request, API, 5)
  const hora = await horarioLibre(request, API, servicio.id, profesional.id, fecha)
  const reserva = (cliente) => ({
    data: {
      servicioId: servicio.id, profesionalId: profesional.id, fecha, hora,
      nombreCliente: cliente, telefonoCliente: '3510000000',
    },
  })
  const primero = `api ${Date.now()} primero`
  const segundo = `api ${Date.now()} segundo`

  const alta = await request.post(`${API}/api/turnos`, reserva(primero))
  expect(alta.status()).toBe(201)
  const turno = await alta.json()
  creados.push(turno.codigo)

  const repetida = await request.post(`${API}/api/turnos`, reserva(segundo))
  expect(repetida.status()).toBe(409)
  expect(await repetida.json()).toEqual({ error: 'Ese horario ya no esta disponible' })

  // En la base hay UN solo turno activo en ese horario, y es el del primero.
  const lista = await listarTurnos(request, API)
  const enEseHorario = lista.filter(
    (t) => t.fecha === `${fecha} ${hora}:00` && t.profesional === profesional.nombre && activo(t),
  )
  expect(enEseHorario.map((t) => t.nombre_cliente)).toEqual([primero])

  // Limpieza, comprobada.
  expect((await request.delete(`${API}/api/turnos/${turno.codigo}`)).status()).toBe(200)
  expect(await horariosLibres(request, API, servicio.id, profesional.id, fecha)).toContain(hora)
})
