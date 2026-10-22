// Ayudas que comparten las dos suites. QA es uno solo y lo usan todas las
// corridas: por eso ninguna prueba fija "el 30/10 a las 10:00". Cada una le
// pregunta a la api que dia atiende el negocio y que horarios estan LIBRES,
// y elige uno de esos. Asi no choca con lo que haya dejado otra corrida.
//
// `api` es el prefijo de las rutas: la url de la api en la suite de
// integracion, o '' en la de navegador (las rutas /api/... van al front, que
// las reenvia a su api con nginx, igual que hace el navegador).

import { expect } from '@playwright/test'

// La hora del negocio, no la del runner (que corre en UTC).
const ZONA = 'America/Argentina/Cordoba'

async function leer(request, ruta) {
  const r = await request.get(ruta)
  expect(r.status(), `GET ${ruta}`).toBe(200)
  return r.json()
}

// El servicio y el profesional por su NOMBRE, no por id: los ids dependen de
// en que orden se cargo cada base.
export async function elegir(request, api, nombreServicio, nombreProfesional) {
  const servicios = await leer(request, `${api}/api/servicios`)
  const servicio = servicios.find((s) => s.nombre === nombreServicio)
  expect(servicio, `el servicio ${nombreServicio}`).toBeTruthy()
  const profesionales = await leer(request, `${api}/api/servicios/${servicio.id}/profesionales`)
  const profesional = profesionales.find((p) => p.nombre === nombreProfesional)
  expect(profesional, `${nombreProfesional} hace ${nombreServicio}`).toBeTruthy()
  return { servicio, profesional }
}

// 'YYYY-MM-DD' de hoy en la hora del negocio, corrido `dias` dias.
function fechaDentroDe(dias) {
  const hoy = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
  const [a, m, d] = hoy.split('-').map(Number)
  const fecha = new Date(Date.UTC(a, m - 1, d + dias))
  return { iso: fecha.toISOString().slice(0, 10), diaSemana: fecha.getUTCDay() }
}

// El primer dia que el negocio atiende, a partir de `desde` dias de hoy. Lejos
// de hoy a proposito: asi la regla de "cancelar hasta 4 horas antes" nunca
// frena la limpieza.
export async function diaHabil(request, api, desde) {
  const { dias_cerrados } = await leer(request, `${api}/api/negocio`)
  for (let i = desde; i < desde + 14; i++) {
    const { iso, diaSemana } = fechaDentroDe(i)
    if (!dias_cerrados.includes(diaSemana)) return iso
  }
  throw new Error('No hay ningun dia habil en las proximas dos semanas')
}

// El primer dia que el negocio NO atiende, a partir de `desde` dias de hoy.
export async function diaCerrado(request, api, desde) {
  const { dias_cerrados } = await leer(request, `${api}/api/negocio`)
  for (let i = desde; i < desde + 14; i++) {
    const { iso, diaSemana } = fechaDentroDe(i)
    if (dias_cerrados.includes(diaSemana)) return iso
  }
  throw new Error('El negocio atiende todos los dias')
}

export async function horariosLibres(request, api, servicioId, profesionalId, fecha) {
  const d = await leer(
    request,
    `${api}/api/disponibilidad?servicioId=${servicioId}&profesionalId=${profesionalId}&fecha=${fecha}`,
  )
  return d.slots
}

// Uno de los libres, al azar: si dos corridas usaran QA a la vez, es poco
// probable que elijan el mismo.
export async function horarioLibre(request, api, servicioId, profesionalId, fecha) {
  const libres = await horariosLibres(request, api, servicioId, profesionalId, fecha)
  expect(libres.length, `horarios libres el ${fecha}`).toBeGreaterThan(0)
  return libres[Math.floor(Math.random() * libres.length)]
}

export async function listarTurnos(request, api) {
  return leer(request, `${api}/api/turnos`)
}

// Red de seguridad: si una prueba falla a mitad de camino, su turno quedaria
// reservado en QA. Se cancela al final pase lo que pase (si ya estaba
// cancelado, la api contesta 409 y no pasa nada).
export async function cancelarSinMirar(request, api, codigos) {
  for (const codigo of codigos.splice(0)) {
    await request.delete(`${api}/api/turnos/${codigo}`)
  }
}
