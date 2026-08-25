const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Endpoint de salud: lo usa el healthcheck de docker-compose
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Catálogo de servicios: ahora sale de la base de datos real
app.get('/api/servicios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM servicios ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar el catálogo' });
  }
});

// Listado de turnos guardados
app.get('/api/turnos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM turnos ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar los turnos' });
  }
});

// Reserva de turno: ahora se guarda en la base de datos real
app.post('/api/turnos', async (req, res) => {
  const { servicioId, fecha, nombreCliente, telefonoCliente } = req.body;

  if (!servicioId || !fecha || !nombreCliente || !telefonoCliente) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO turnos (servicio_id, fecha, nombre_cliente, telefono_cliente)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [servicioId, fecha, nombreCliente, telefonoCliente]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar el turno' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend escuchando en el puerto ${PORT}`);
});
