import { describe, expect, it, vi } from 'vitest';
import { crearServicioDeTurnos } from './turnos.js';

// Martes 6 de octubre de 2026, 10:15. El reloj entra por parametro: asi el
// test no depende de la hora real ni de la zona horaria de la maquina.
const AHORA = new Date(2026, 9, 6, 10, 15);
const HOY = '2026-10-06';
const MANANA = '2026-10-07';

const reserva = {
  servicioId: 1,
  profesionalId: 2,
  fecha: MANANA,
  hora: '09:30',
  nombreCliente: 'Ana Perez',
  telefonoCliente: '3511234567',
};

// Doble del repositorio: en vez de Postgres, funciones que contestan lo que
// cada test necesita. `cambios` pisa las respuestas por defecto.
function armar(cambios = {}) {
  const repo = {
    obtenerNegocio: vi.fn().mockResolvedValue({
      hora_apertura: '09:00:00',
      hora_cierre: '11:00:00',
      dias_cerrados: [0, 1],
    }),
    duracionDelServicio: vi.fn().mockResolvedValue(30),
    profesionalHaceServicio: vi.fn().mockResolvedValue(true),
    turnosDelDia: vi.fn().mockResolvedValue([]),
    guardarTurno: vi.fn().mockResolvedValue({ id: 7, codigo: 'TRN-2026-0007' }),
    ...cambios,
  };
  const servicio = crearServicioDeTurnos({ repo, ahora: () => AHORA });
  return { repo, servicio };
}

describe('calcularDisponibilidad', () => {
  it('descuenta los turnos que el profesional ya tiene ese dia', async () => {
    const { servicio } = armar({
      turnosDelDia: vi.fn().mockResolvedValue([
        { fecha: `${MANANA} 09:30:00`, duracion_minutos: 30 },
      ]),
    });

    const resultado = await servicio.calcularDisponibilidad(1, 2, MANANA);

    expect(resultado).toEqual({ fecha: MANANA, abierto: true, slots: ['09:00', '10:00', '10:30'] });
  });

  it('si la fecha es hoy, no ofrece horarios que ya pasaron', async () => {
    const { servicio } = armar();

    const resultado = await servicio.calcularDisponibilidad(1, 2, HOY);

    expect(resultado.slots).toEqual(['10:30']); // son las 10:15
  });

  it('una fecha pasada figura cerrada, con el motivo', async () => {
    const { servicio } = armar();

    const resultado = await servicio.calcularDisponibilidad(1, 2, '2026-10-03');

    expect(resultado).toMatchObject({ abierto: false, slots: [] });
    expect(resultado.motivo).toBe('No se pueden reservar fechas pasadas');
  });

  it('un dia que el negocio no atiende figura cerrado y ni consulta los turnos', async () => {
    const { repo, servicio } = armar();
    const domingo = '2026-10-11';

    const resultado = await servicio.calcularDisponibilidad(1, 2, domingo);

    expect(resultado.motivo).toBe('El negocio no atiende ese dia');
    expect(repo.turnosDelDia).not.toHaveBeenCalled();
  });

  it('pide los turnos del profesional y la fecha consultados', async () => {
    const { repo, servicio } = armar();

    await servicio.calcularDisponibilidad(1, 2, MANANA);

    expect(repo.turnosDelDia).toHaveBeenCalledWith(2, MANANA);
  });

  it.each([
    ['no hay negocio configurado', { obtenerNegocio: vi.fn().mockResolvedValue(null) }, 500],
    ['el servicio no existe', { duracionDelServicio: vi.fn().mockResolvedValue(null) }, 404],
    ['el profesional no hace ese servicio', { profesionalHaceServicio: vi.fn().mockResolvedValue(false) }, 400],
  ])('falla si %s', async (_caso, cambios, status) => {
    const { servicio } = armar(cambios);

    await expect(servicio.calcularDisponibilidad(1, 2, MANANA)).rejects.toMatchObject({ status });
  });
});

describe('reservar', () => {
  it('guarda el turno una sola vez, con la fecha y la hora unidas', async () => {
    const { repo, servicio } = armar();

    const turno = await servicio.reservar(reserva);

    expect(turno.codigo).toBe('TRN-2026-0007');
    expect(repo.guardarTurno).toHaveBeenCalledTimes(1);
    expect(repo.guardarTurno).toHaveBeenCalledWith(
      expect.objectContaining({ fecha: `${MANANA} 09:30:00`, emailCliente: null, nota: null }),
    );
  });

  it('si el horario ya esta tomado responde 409 y NO guarda nada', async () => {
    const { repo, servicio } = armar({
      turnosDelDia: vi.fn().mockResolvedValue([
        { fecha: `${MANANA} 09:30:00`, duracion_minutos: 30 },
      ]),
    });

    await expect(servicio.reservar(reserva)).rejects.toMatchObject({
      status: 409,
      message: 'Ese horario ya no esta disponible',
    });
    expect(repo.guardarTurno).not.toHaveBeenCalled();
  });

  it('si el dia esta cerrado responde 409 con el motivo y NO guarda nada', async () => {
    const { repo, servicio } = armar();

    await expect(servicio.reservar({ ...reserva, fecha: '2026-10-11' })).rejects.toMatchObject({
      status: 409,
      message: 'El negocio no atiende ese dia',
    });
    expect(repo.guardarTurno).not.toHaveBeenCalled();
  });

  it('si otro cliente gano el horario entre la validacion y el guardado, responde 409', async () => {
    const duplicado = Object.assign(new Error('duplicate key'), { code: '23505' });
    const { servicio } = armar({ guardarTurno: vi.fn().mockRejectedValue(duplicado) });

    await expect(servicio.reservar(reserva)).rejects.toMatchObject({ status: 409 });
  });

  it('cualquier otro error de la base sube tal cual, sin disfrazarse de 409', async () => {
    const caida = new Error('connection refused');
    const { servicio } = armar({ guardarTurno: vi.fn().mockRejectedValue(caida) });

    await expect(servicio.reservar(reserva)).rejects.toBe(caida);
  });
});

describe('cancelar', () => {
  // Faltan mas de 4 horas: es manana a las 09:30 y AHORA es hoy a las 10:15.
  const turnoReservado = {
    id: 7,
    codigo: 'TRN-2026-0007',
    fecha: `${MANANA} 09:30:00`,
    estado: 'pendiente',
  };

  function armarCancelacion(turno, cancelado = { ...turno, estado: 'cancelado' }) {
    return armar({
      buscarTurnoPorCodigo: vi.fn().mockResolvedValue(turno),
      cancelarTurno: vi.fn().mockResolvedValue(cancelado),
    });
  }

  it('busca el turno por su codigo, lo cancela y lo devuelve cancelado', async () => {
    const { repo, servicio } = armarCancelacion(turnoReservado);

    const turno = await servicio.cancelar('TRN-2026-0007');

    expect(turno.estado).toBe('cancelado');
    expect(repo.buscarTurnoPorCodigo).toHaveBeenCalledWith('TRN-2026-0007');
    expect(repo.cancelarTurno).toHaveBeenCalledWith(7);
  });

  it('si el codigo no existe responde 404 y NO cambia nada', async () => {
    const { repo, servicio } = armarCancelacion(null);

    await expect(servicio.cancelar('TRN-2026-9999')).rejects.toMatchObject({
      status: 404,
      message: 'El turno no existe',
    });
    expect(repo.cancelarTurno).not.toHaveBeenCalled();
  });

  it('si faltan menos de 4 horas responde 409 con el motivo y NO cambia nada', async () => {
    const { repo, servicio } = armarCancelacion({ ...turnoReservado, fecha: `${HOY} 13:00:00` });

    await expect(servicio.cancelar('TRN-2026-0007')).rejects.toMatchObject({
      status: 409,
      message: 'Solo se puede cancelar hasta 4 horas antes del turno',
    });
    expect(repo.cancelarTurno).not.toHaveBeenCalled();
  });

  it('si otro pedido lo cancelo entre la busqueda y el guardado, responde 409', async () => {
    const { servicio } = armarCancelacion(turnoReservado, null);

    await expect(servicio.cancelar('TRN-2026-0007')).rejects.toMatchObject({
      status: 409,
      message: 'El turno ya estaba cancelado',
    });
  });
});
