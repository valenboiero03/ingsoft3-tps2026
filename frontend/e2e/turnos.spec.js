// Suite E2E: un navegador de verdad contra el front de QA, que le habla a su
// api y a su base. Nada de mocks: si el navegador no le pega a la api, no es
// end-to-end.
//
// Las rutas /api/... que usan las ayudas van al FRONT (baseURL), que las
// reenvia a su api: el mismo camino que recorre el navegador.

import { expect, test } from '@playwright/test'
import { cancelarSinMirar, diaCerrado, diaHabil, elegir, horarioLibre, listarTurnos } from './agenda.js'

const SERVICIO = 'Corte masculino'
const PROFESIONAL = 'Nicolás Ruiz'

const creados = []
test.afterEach(async ({ request }) => cancelarSinMirar(request, '', creados))

// Del catalogo al formulario: el camino que hace cualquier cliente.
async function abrirReserva(page, fecha) {
  await page.goto('/')
  await page.getByRole('link', { name: `Reservar turno ${SERVICIO}` }).click()
  await page.getByRole('button', { name: new RegExp(`^${PROFESIONAL}`) }).click()
  await page.getByLabel('Fecha del turno').fill(fecha)
}

async function reservar(page, fecha, hora, cliente) {
  await abrirReserva(page, fecha)
  await page.getByRole('button', { name: hora, exact: true }).click()
  await page.getByLabel('Nombre y apellido').fill(cliente)
  await page.getByLabel('Teléfono').fill('3510000000')
  await page.getByRole('button', { name: 'Confirmar turno' }).click()
}

async function horarioParaElTest(request, desde) {
  const { servicio, profesional } = await elegir(request, '', SERVICIO, PROFESIONAL)
  const fecha = await diaHabil(request, '', desde)
  const hora = await horarioLibre(request, '', servicio.id, profesional.id, fecha)
  return { fecha, hora }
}

test('reservar un turno muestra su codigo, y cancelarlo desde la misma pantalla libera el horario', async ({ page, request }) => {
  const { fecha, hora } = await horarioParaElTest(request, 4)
  const nombre = `E2e${Date.now()}` // unico: no choca con otra corrida

  await reservar(page, fecha, hora, `${nombre} Prueba`)

  // La confirmacion es la de ESTE test: su nombre y un codigo de reserva.
  await expect(page.getByRole('heading', { name: `¡Listo, ${nombre}!` })).toBeVisible()
  const codigo = (await page.getByText(/TRN-\d{4}-\d+/).textContent()).match(/TRN-\d{4}-\d+/)[0]
  creados.push(codigo)

  await page.getByRole('button', { name: 'Cancelar esta reserva' }).click()
  await expect(page.getByRole('heading', { name: 'Tu turno quedó cancelado' })).toBeVisible()

  // Y la cancelacion, comprobada: ese horario se le vuelve a ofrecer a cualquiera.
  await abrirReserva(page, fecha)
  await expect(page.getByRole('button', { name: hora, exact: true })).toBeVisible()
})

test('elegir un dia que el negocio no atiende muestra el motivo y no deja reservar nada', async ({ page, request }) => {
  const fecha = await diaCerrado(request, '', 2)
  const antes = (await listarTurnos(request, '')).length

  await abrirReserva(page, fecha)

  // El usuario ve el motivo, y no hay ni horarios ni boton para confirmar.
  await expect(page.getByText('El negocio no atiende ese dia')).toBeVisible()
  await expect(page.getByRole('button', { name: /^\d{2}:\d{2}$/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Confirmar turno' })).toHaveCount(0)
  expect((await listarTurnos(request, '')).length).toBe(antes) // y no se creo nada
})

test('un horario reservado deja de ofrecerse a los demas clientes', async ({ page, browser, request }) => {
  const { fecha, hora } = await horarioParaElTest(request, 5)
  const nombre = `E2e${Date.now()}`

  await reservar(page, fecha, hora, `${nombre} Prueba`)
  await expect(page.getByRole('heading', { name: `¡Listo, ${nombre}!` })).toBeVisible()
  const codigo = (await page.getByText(/TRN-\d{4}-\d+/).textContent()).match(/TRN-\d{4}-\d+/)[0]
  creados.push(codigo)

  // Otro cliente, en otro navegador (sin nada compartido con el primero),
  // entra al mismo dia: ese horario ya no esta, porque quedo guardado en la base.
  const otro = await (await browser.newContext()).newPage()
  await abrirReserva(otro, fecha)
  await expect(otro.getByRole('button', { name: /^\d{2}:\d{2}$/ }).first()).toBeVisible()
  await expect(otro.getByRole('button', { name: hora, exact: true })).toHaveCount(0)

  // Limpieza, comprobada: se cancela y al otro cliente se le vuelve a ofrecer.
  expect((await request.delete(`/api/turnos/${codigo}`)).status()).toBe(200)
  await abrirReserva(otro, fecha)
  await expect(otro.getByRole('button', { name: hora, exact: true })).toBeVisible()
})
