// Funciones de presentacion. No tienen logica de negocio: solo convierten
// datos crudos del backend en texto listo para mostrar.

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export function moneda(valor) {
  return valor.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  })
}

export function duracion(minutos) {
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`
}

// '09:00:00' -> '9:00'
export function hora(valor) {
  const [h, m] = valor.split(':')
  return `${Number(h)}:${m}`
}

// Arma el texto del horario a partir de la configuracion del negocio.
// Si los dias abiertos son seguidos muestra un rango ("Mar a Sáb"), y si no
// los lista uno por uno.
export function horarioNegocio(negocio) {
  const cerrados = negocio.dias_cerrados
  // La semana arranca en lunes porque es como se lee un horario comercial.
  const semana = [1, 2, 3, 4, 5, 6, 0]
  const abiertos = semana.filter((dia) => !cerrados.includes(dia))

  if (abiertos.length === 0) return 'Cerrado'

  const primero = semana.indexOf(abiertos[0])
  const seguidos = abiertos.every(
    (dia, i) => semana.indexOf(dia) === primero + i,
  )

  const dias =
    abiertos.length === 1
      ? DIAS[abiertos[0]]
      : seguidos
        ? `${DIAS[abiertos[0]]} a ${DIAS[abiertos[abiertos.length - 1]]}`
        : abiertos.map((dia) => DIAS[dia]).join(' · ')

  return `${dias} · ${hora(negocio.hora_apertura)} – ${hora(negocio.hora_cierre)}`
}