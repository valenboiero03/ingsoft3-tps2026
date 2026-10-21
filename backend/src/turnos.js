// Servicio de turnos: la logica de disponibilidad, de reserva y de cancelacion.
//
// No fabrica sus dependencias: las RECIBE. `repo` es quien habla con la base
// y `ahora` es el reloj. En produccion index.js le pasa el repositorio de
// Postgres y el reloj real; en los tests entran dobles, y por eso esta logica
// se puede probar sin levantar una base ni depender de la hora del dia.

import { aMinutos, diaDeLaSemana, fechaLocal, minutosDelDia, calcularSlots } from './horarios.js';
import { puedeCancelar } from './cancelaciones.js';

// Violacion de indice unico en Postgres: alguien reservo ese mismo horario
// entre nuestra validacion y el insert.
const CODIGO_DUPLICADO = '23505';

// Error con codigo HTTP, para no repetir el manejo en cada endpoint.
function errorHttp(status, mensaje) {
  const err = new Error(mensaje);
  err.status = status;
  return err;
}

function crearServicioDeTurnos({ repo, ahora = () => new Date() }) {
  // Devuelve los horarios en los que ese profesional puede tomar ese servicio
  // en esa fecha.
  async function calcularDisponibilidad(servicioId, profesionalId, fecha) {
    const negocio = await repo.obtenerNegocio();
    if (!negocio) {
      throw errorHttp(500, 'No hay un negocio configurado');
    }

    const duracion = await repo.duracionDelServicio(servicioId);
    if (duracion === null) {
      throw errorHttp(404, 'El servicio no existe o no esta disponible');
    }

    if (!(await repo.profesionalHaceServicio(servicioId, profesionalId))) {
      throw errorHttp(400, 'Ese profesional no realiza el servicio elegido');
    }

    const cerrado = (motivo) => ({ fecha, abierto: false, motivo, slots: [] });
    const momento = ahora();
    const hoy = fechaLocal(momento);

    if (fecha < hoy) {
      return cerrado('No se pueden reservar fechas pasadas');
    }
    if (negocio.dias_cerrados.includes(diaDeLaSemana(fecha))) {
      return cerrado('El negocio no atiende ese dia');
    }

    // Cada turno ocupado pasa a ser un intervalo [inicio, fin) en minutos.
    const turnos = await repo.turnosDelDia(profesionalId, fecha);
    const ocupados = turnos.map((t) => {
      const inicio = aMinutos(t.fecha.split(' ')[1]);
      return { inicio, fin: inicio + t.duracion_minutos };
    });

    const slots = calcularSlots({
      apertura: aMinutos(negocio.hora_apertura),
      cierre: aMinutos(negocio.hora_cierre),
      duracion,
      ocupados,
      // Si la fecha es hoy, no ofrecemos horarios que ya pasaron.
      minimo: fecha === hoy ? minutosDelDia(momento) : 0,
    });

    return { fecha, abierto: true, slots };
  }

  // Reserva un turno. El cliente ya vio la disponibilidad, pero pudo pasar
  // tiempo entre que la consulto y confirmo: se vuelve a validar siempre.
  async function reservar(datos) {
    const { servicioId, profesionalId, fecha, hora } = datos;

    const disponibilidad = await calcularDisponibilidad(servicioId, profesionalId, fecha);
    if (!disponibilidad.abierto) {
      throw errorHttp(409, disponibilidad.motivo);
    }
    if (!disponibilidad.slots.includes(hora)) {
      throw errorHttp(409, 'Ese horario ya no esta disponible');
    }

    try {
      return await repo.guardarTurno({
        servicioId,
        profesionalId,
        fecha: `${fecha} ${hora}:00`,
        nombreCliente: datos.nombreCliente,
        telefonoCliente: datos.telefonoCliente,
        emailCliente: datos.emailCliente || null,
        nota: datos.nota || null,
      });
    } catch (err) {
      if (err.code === CODIGO_DUPLICADO) {
        throw errorHttp(409, 'Ese horario ya no esta disponible');
      }
      throw err;
    }
  }

  // Cancela un turno por su codigo, el que ve el cliente. No borra la fila:
  // la pasa a 'cancelado', y el indice parcial de la base libera el horario.
  // La regla (hasta 4 horas antes) vive en cancelaciones.js.
  async function cancelar(codigo) {
    const turno = await repo.buscarTurnoPorCodigo(codigo);
    if (!turno) {
      throw errorHttp(404, 'El turno no existe');
    }

    const { permitido, motivo } = puedeCancelar(turno, ahora());
    if (!permitido) {
      throw errorHttp(409, motivo);
    }

    // Si otro pedido lo cancelo entre la busqueda y el update, el repositorio
    // no encuentra nada que cambiar y devuelve null.
    const cancelado = await repo.cancelarTurno(turno.id);
    if (!cancelado) {
      throw errorHttp(409, 'El turno ya estaba cancelado');
    }
    return cancelado;
  }

  return { calcularDisponibilidad, reservar, cancelar };
}

export { crearServicioDeTurnos, errorHttp };
