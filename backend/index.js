const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// La agenda se maneja en bloques de 30 minutos: los turnos arrancan 9:00,
// 9:30, 10:00, etc. Si mas adelante un rubro necesita otro paso, esto pasa a
// ser una columna de la tabla negocio.
const PASO_MINUTOS = 30;

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const FORMATO_HORA = /^\d{2}:\d{2}$/;

// '09:30:00' o '09:30' -> 570
function aMinutos(hora) {
  const [h, m] = hora.split(':');
  return Number(h) * 60 + Number(m);
}

// 570 -> '09:30'
function aHora(minutos) {
  const h = String(Math.floor(minutos / 60)).padStart(2, '0');
  const m = String(minutos % 60).padStart(2, '0');
  return `${h}:${m}`;
}

// '2026-09-08' -> 0 domingo, 1 lunes ... 6 sabado
function diaDeLaSemana(fecha) {
  return new Date(`${fecha}T00:00:00`).getDay();
}

// Fecha de hoy en formato YYYY-MM-DD, segun la zona horaria del contenedor.
function hoy() {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${ahora.getFullYear()}-${mes}-${dia}`;
}

// Error con codigo HTTP, para no repetir el manejo en cada endpoint.
function errorHttp(status, mensaje) {
  const err = new Error(mensaje);
  err.status = status;
  return err;
}

function manejarError(res, err, mensajeGenerico) {
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: mensajeGenerico });
}

// ---------------------------------------------------------------------------
// Disponibilidad
//
// Devuelve los horarios en los que ese profesional puede tomar ese servicio en
// esa fecha. Un horario candidato entra si el servicio termina antes del cierre
// y si no se pisa con ningun turno activo que el profesional ya tenga.
// ---------------------------------------------------------------------------

async function calcularDisponibilidad(servicioId, profesionalId, fecha) {
  const negocio = await pool.query(
    'SELECT hora_apertura, hora_cierre, dias_cerrados FROM negocio LIMIT 1'
  );
  if (negocio.rowCount === 0) {
    throw errorHttp(500, 'No hay un negocio configurado');
  }
  const { hora_apertura, hora_cierre, dias_cerrados } = negocio.rows[0];

  const servicio = await pool.query(
    'SELECT duracion_minutos FROM servicios WHERE id = $1 AND activo',
    [servicioId]
  );
  if (servicio.rowCount === 0) {
    throw errorHttp(404, 'El servicio no existe o no esta disponible');
  }
  const duracion = servicio.rows[0].duracion_minutos;

  const habilitado = await pool.query(
    `SELECT 1
       FROM servicios_profesionales sp
       JOIN profesionales p ON p.id = sp.profesional_id
      WHERE sp.servicio_id = $1 AND sp.profesional_id = $2 AND p.activo`,
    [servicioId, profesionalId]
  );
  if (habilitado.rowCount === 0) {
    throw errorHttp(400, 'Ese profesional no realiza el servicio elegido');
  }

  const cerrado = (motivo) => ({ fecha, abierto: false, motivo, slots: [] });

  if (fecha < hoy()) {
    return cerrado('No se pueden reservar fechas pasadas');
  }
  if (dias_cerrados.includes(diaDeLaSemana(fecha))) {
    return cerrado('El negocio no atiende ese dia');
  }

  const ocupados = await pool.query(
    `SELECT t.fecha, s.duracion_minutos
       FROM turnos t
       JOIN servicios s ON s.id = t.servicio_id
      WHERE t.profesional_id = $1
        AND t.estado <> 'cancelado'
        AND t.fecha >= $2::date
        AND t.fecha <  $2::date + INTERVAL '1 day'`,
    [profesionalId, fecha]
  );

  // Cada turno ocupado pasa a ser un intervalo [inicio, fin) en minutos.
  const intervalos = ocupados.rows.map((t) => {
    const inicio = aMinutos(t.fecha.split(' ')[1]);
    return { inicio, fin: inicio + t.duracion_minutos };
  });

  const apertura = aMinutos(hora_apertura);
  const cierre = aMinutos(hora_cierre);

  // Si la fecha es hoy, no ofrecemos horarios que ya pasaron.
  const ahora = new Date();
  const minimo =
    fecha === hoy() ? ahora.getHours() * 60 + ahora.getMinutes() : 0;

  const slots = [];
  for (let inicio = apertura; inicio + duracion <= cierre; inicio += PASO_MINUTOS) {
    if (inicio < minimo) continue;
    const fin = inicio + duracion;
    const sePisa = intervalos.some((t) => inicio < t.fin && t.inicio < fin);
    if (!sePisa) slots.push(aHora(inicio));
  }

  return { fecha, abierto: true, slots };
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

// Lo usa el healthcheck de docker-compose.
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Datos del negocio: nombre, rubro, direccion, color de acento y horario.
// Es lo que permite que el mismo frontend sirva para otro rubro.
app.get('/api/negocio', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT nombre, rubro, direccion, color_acento,
              hora_apertura, hora_cierre, dias_cerrados
         FROM negocio
        LIMIT 1`
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'No hay un negocio configurado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    manejarError(res, err, 'Error al consultar el negocio');
  }
});

// Catalogo de servicios. Acepta ?categoria= para el filtro de la pantalla.
app.get('/api/servicios', async (req, res) => {
  const { categoria } = req.query;
  try {
    const result = await pool.query(
      `SELECT id, nombre, categoria, descripcion, duracion_minutos, precio
         FROM servicios
        WHERE activo
          AND ($1::text IS NULL OR categoria = $1)
        ORDER BY categoria, nombre`,
      [categoria || null]
    );
    // NUMERIC vuelve del driver como texto porque no todo decimal entra exacto
    // en un number de JavaScript. Lo convertimos en el borde de la API.
    res.json(result.rows.map((s) => ({ ...s, precio: Number(s.precio) })));
  } catch (err) {
    manejarError(res, err, 'Error al consultar el catalogo');
  }
});

// Profesionales habilitados para un servicio (paso 1 de la reserva).
app.get('/api/servicios/:id/profesionales', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.nombre, p.rol
         FROM profesionales p
         JOIN servicios_profesionales sp ON sp.profesional_id = p.id
        WHERE sp.servicio_id = $1 AND p.activo
        ORDER BY p.nombre`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    manejarError(res, err, 'Error al consultar los profesionales');
  }
});

// Horarios libres para un servicio, un profesional y una fecha.
app.get('/api/disponibilidad', async (req, res) => {
  const { servicioId, profesionalId, fecha } = req.query;

  if (!servicioId || !profesionalId || !fecha) {
    return res
      .status(400)
      .json({ error: 'Faltan servicioId, profesionalId o fecha' });
  }
  if (!FORMATO_FECHA.test(fecha)) {
    return res.status(400).json({ error: 'La fecha debe tener formato YYYY-MM-DD' });
  }

  try {
    res.json(await calcularDisponibilidad(servicioId, profesionalId, fecha));
  } catch (err) {
    manejarError(res, err, 'Error al calcular la disponibilidad');
  }
});

// Listado de turnos, con los nombres resueltos para que sea legible.
app.get('/api/turnos', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.id, t.codigo, t.fecha, t.estado,
              t.nombre_cliente, t.telefono_cliente, t.email_cliente, t.nota,
              s.nombre AS servicio, p.nombre AS profesional
         FROM turnos t
         JOIN servicios s ON s.id = t.servicio_id
         JOIN profesionales p ON p.id = t.profesional_id
        ORDER BY t.fecha DESC`
    );
    res.json(result.rows);
  } catch (err) {
    manejarError(res, err, 'Error al consultar los turnos');
  }
});

// Reserva de turno.
app.post('/api/turnos', async (req, res) => {
  const {
    servicioId,
    profesionalId,
    fecha,
    hora,
    nombreCliente,
    telefonoCliente,
    emailCliente,
    nota,
  } = req.body;

  if (!servicioId || !profesionalId || !fecha || !hora || !nombreCliente || !telefonoCliente) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }
  if (!FORMATO_FECHA.test(fecha) || !FORMATO_HORA.test(hora)) {
    return res.status(400).json({ error: 'Formato de fecha u hora invalido' });
  }

  try {
    // El cliente ya vio la disponibilidad, pero pudo pasar tiempo entre que la
    // consulto y confirmo. Se vuelve a validar siempre en el servidor.
    const disponibilidad = await calcularDisponibilidad(servicioId, profesionalId, fecha);
    if (!disponibilidad.abierto) {
      return res.status(409).json({ error: disponibilidad.motivo });
    }
    if (!disponibilidad.slots.includes(hora)) {
      return res.status(409).json({ error: 'Ese horario ya no esta disponible' });
    }

    const result = await pool.query(
      `INSERT INTO turnos
         (servicio_id, profesional_id, fecha, nombre_cliente, telefono_cliente, email_cliente, nota)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, codigo, fecha, estado`,
      [
        servicioId,
        profesionalId,
        `${fecha} ${hora}:00`,
        nombreCliente,
        telefonoCliente,
        emailCliente || null,
        nota || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    // 23505 es la violacion del indice unico: alguien reservo ese mismo
    // horario entre nuestra validacion y el insert.
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Ese horario ya no esta disponible' });
    }
    manejarError(res, err, 'Error al guardar el turno');
  }
});

app.listen(PORT, () => {
  console.log(`Backend escuchando en el puerto ${PORT}`);
});