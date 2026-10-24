// Arranque de la aplicacion. Aca no hay reglas de negocio: se arman las
// piezas (pool -> repositorio -> servicio) y cada endpoint pide, delega y
// responde. Las reglas viven en src/ y son las que tienen tests.

import { readFile } from 'node:fs/promises';
import express from 'express';
import * as Sentry from '@sentry/node';
import cors from 'cors';
import pool from './db.js';
import { crearRepositorio } from './repositorio.js';
import { crearServicioDeTurnos } from './src/turnos.js';
import { validarConsultaDeDisponibilidad, validarReserva } from './src/validaciones.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Inyeccion de dependencias: el servicio recibe el repositorio real.
const repo = crearRepositorio(pool);
const turnos = crearServicioDeTurnos({ repo });

app.use(cors());
app.use(express.json());

function manejarError(res, err, mensajeGenerico) {
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }
  // Un error inesperado: ademas del log, se lo manda a Sentry (Issues). Los
  // errores con status (400/404/409) son respuestas esperadas, no fallas.
  console.error(err);
  Sentry.captureException(err);
  return res.status(500).json({ error: mensajeGenerico });
}

// Lo usan el healthcheck de Render y el smoke test del pipeline. Devuelve
// ademas el commit que esta corriendo: lo trae la imagen (GIT_COMMIT, horneado
// por el pipeline); si la construyo Render desde el repo, RENDER_GIT_COMMIT
// al desplegar. Asi el smoke puede comprobar que contesta la version que se
// acaba de desplegar y no la anterior. En compose no existe y dice 'local'.
app.get('/health', (req, res) => {
  res.json({ status: 'ok', commit: process.env.GIT_COMMIT || process.env.RENDER_GIT_COMMIT || 'local' });
});

// Datos del negocio. Es lo que permite que el mismo frontend sirva para otro rubro.
app.get('/api/negocio', async (req, res) => {
  try {
    const negocio = await repo.obtenerNegocio();
    if (!negocio) {
      return res.status(404).json({ error: 'No hay un negocio configurado' });
    }
    res.json(negocio);
  } catch (err) {
    manejarError(res, err, 'Error al consultar el negocio');
  }
});

// Catalogo de servicios. Acepta ?categoria= para el filtro de la pantalla.
app.get('/api/servicios', async (req, res) => {
  try {
    res.json(await repo.listarServicios(req.query.categoria));
  } catch (err) {
    manejarError(res, err, 'Error al consultar el catalogo');
  }
});

// Profesionales habilitados para un servicio (paso 1 de la reserva).
app.get('/api/servicios/:id/profesionales', async (req, res) => {
  try {
    res.json(await repo.listarProfesionales(req.params.id));
  } catch (err) {
    manejarError(res, err, 'Error al consultar los profesionales');
  }
});

// Horarios libres para un servicio, un profesional y una fecha.
app.get('/api/disponibilidad', async (req, res) => {
  const error = validarConsultaDeDisponibilidad(req.query);
  if (error) {
    return res.status(400).json({ error });
  }

  const { servicioId, profesionalId, fecha } = req.query;
  try {
    res.json(await turnos.calcularDisponibilidad(servicioId, profesionalId, fecha));
  } catch (err) {
    manejarError(res, err, 'Error al calcular la disponibilidad');
  }
});

// Listado de turnos.
app.get('/api/turnos', async (req, res) => {
  try {
    res.json(await repo.listarTurnos());
  } catch (err) {
    manejarError(res, err, 'Error al consultar los turnos');
  }
});

// Reserva de turno.
app.post('/api/turnos', async (req, res) => {
  const error = validarReserva(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  try {
    res.status(201).json(await turnos.reservar(req.body));
  } catch (err) {
    manejarError(res, err, 'Error al guardar el turno');
  }
});

// Cancelacion de un turno por su codigo (el que ve el cliente). No borra la
// fila: la pasa a 'cancelado'. 404 si no existe, 409 si la regla no lo permite.
app.delete('/api/turnos/:codigo', async (req, res) => {
  try {
    res.json(await turnos.cancelar(req.params.codigo));
  } catch (err) {
    manejarError(res, err, 'Error al cancelar el turno');
  }
});

// TEMPORAL (TP9): endpoint que falla a proposito para ver un error llegar a
// Sentry. Se saca al terminar el practico.
app.get('/api/falla', () => {
  throw new Error('Falla de prueba del TP9');
});

// Lo que tire una ruta y no maneje ella misma llega aca: Sentry lo registra
// y despues Express responde 500. Va despues de todas las rutas.
Sentry.setupExpressErrorHandler(app);

// Y despues respondemos nosotros: un JSON generico, como el resto de la api.
// Sin esto Express contesta con su pagina de error, que muestra el stack
// (rutas y lineas del servidor) porque NODE_ENV no esta en 'production'.
app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Esquema de la base: lo crea la propia app al arrancar. init.sql se puede
// correr las veces que sea sin duplicar nada (IF NOT EXISTS, ON CONFLICT DO
// NOTHING), asi que cada entorno (QA, PROD) arma su base solo en su primer
// deploy, sin pasos a mano. Reintenta porque la base puede estar despertando
// (Neon suspende el computo sin uso) o terminando de arrancar (compose).
async function prepararBase(intentos = 10, esperaMs = 3000) {
  const sql = await readFile(new URL('./db/init.sql', import.meta.url), 'utf8');
  for (let i = 1; ; i++) {
    try {
      await pool.query(sql);
      console.log('Esquema de la base listo');
      return;
    } catch (err) {
      if (i >= intentos) throw err;
      console.log(`La base no respondio (intento ${i} de ${intentos}): ${err.message}`);
      await new Promise((r) => setTimeout(r, esperaMs));
    }
  }
}

// Si la base no queda lista, el proceso termina con error: mejor un deploy que
// falla a la vista que una app que arranca y responde 500 en cada pedido.
prepararBase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend escuchando en el puerto ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('No se pudo preparar la base:', err);
    process.exit(1);
  });
