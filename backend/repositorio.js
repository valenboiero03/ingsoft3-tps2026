// Repositorio: el unico lugar donde hay SQL. Recibe el pool de conexiones y
// devuelve funciones que hablan con Postgres. El servicio de turnos depende
// de esta "forma" (los nombres de las funciones), no de Postgres: en los
// tests se la reemplaza por un doble.

function crearRepositorio(pool) {
  return {
    // Datos del negocio: nombre, rubro, direccion, color de acento y horario.
    async obtenerNegocio() {
      const result = await pool.query(
        `SELECT nombre, rubro, direccion, color_acento,
                hora_apertura, hora_cierre, dias_cerrados
           FROM negocio
          LIMIT 1`
      );
      return result.rows[0] || null;
    },

    // Catalogo de servicios, opcionalmente filtrado por categoria.
    async listarServicios(categoria) {
      const result = await pool.query(
        `SELECT id, nombre, categoria, descripcion, duracion_minutos, precio
           FROM servicios
          WHERE activo
            AND ($1::text IS NULL OR categoria = $1)
          ORDER BY categoria, nombre`,
        [categoria || null]
      );
      // NUMERIC vuelve del driver como texto porque no todo decimal entra
      // exacto en un number de JavaScript. Lo convertimos en el borde.
      return result.rows.map((s) => ({ ...s, precio: Number(s.precio) }));
    },

    // Profesionales habilitados para un servicio.
    async listarProfesionales(servicioId) {
      const result = await pool.query(
        `SELECT p.id, p.nombre, p.rol
           FROM profesionales p
           JOIN servicios_profesionales sp ON sp.profesional_id = p.id
          WHERE sp.servicio_id = $1 AND p.activo
          ORDER BY p.nombre`,
        [servicioId]
      );
      return result.rows;
    },

    // Duracion en minutos de un servicio activo, o null si no existe.
    async duracionDelServicio(servicioId) {
      const result = await pool.query(
        'SELECT duracion_minutos FROM servicios WHERE id = $1 AND activo',
        [servicioId]
      );
      return result.rowCount === 0 ? null : result.rows[0].duracion_minutos;
    },

    async profesionalHaceServicio(servicioId, profesionalId) {
      const result = await pool.query(
        `SELECT 1
           FROM servicios_profesionales sp
           JOIN profesionales p ON p.id = sp.profesional_id
          WHERE sp.servicio_id = $1 AND sp.profesional_id = $2 AND p.activo`,
        [servicioId, profesionalId]
      );
      return result.rowCount > 0;
    },

    // Turnos activos (no cancelados) de un profesional en una fecha.
    async turnosDelDia(profesionalId, fecha) {
      const result = await pool.query(
        `SELECT t.fecha, s.duracion_minutos
           FROM turnos t
           JOIN servicios s ON s.id = t.servicio_id
          WHERE t.profesional_id = $1
            AND t.estado <> 'cancelado'
            AND t.fecha >= $2::date
            AND t.fecha <  $2::date + INTERVAL '1 day'`,
        [profesionalId, fecha]
      );
      return result.rows;
    },

    // Listado de turnos, con los nombres resueltos para que sea legible.
    async listarTurnos() {
      const result = await pool.query(
        `SELECT t.id, t.codigo, t.fecha, t.estado,
                t.nombre_cliente, t.telefono_cliente, t.email_cliente, t.nota,
                s.nombre AS servicio, p.nombre AS profesional
           FROM turnos t
           JOIN servicios s ON s.id = t.servicio_id
           JOIN profesionales p ON p.id = t.profesional_id
          ORDER BY t.fecha DESC`
      );
      return result.rows;
    },

    async guardarTurno(turno) {
      const result = await pool.query(
        `INSERT INTO turnos
           (servicio_id, profesional_id, fecha, nombre_cliente, telefono_cliente, email_cliente, nota)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, codigo, fecha, estado`,
        [
          turno.servicioId,
          turno.profesionalId,
          turno.fecha,
          turno.nombreCliente,
          turno.telefonoCliente,
          turno.emailCliente,
          turno.nota,
        ]
      );
      return result.rows[0];
    },

    // Un turno por su codigo (el que ve el cliente), o null si no existe.
    async buscarTurnoPorCodigo(codigo) {
      const result = await pool.query(
        'SELECT id, codigo, fecha, estado FROM turnos WHERE codigo = $1',
        [codigo]
      );
      return result.rows[0] || null;
    },

    // Baja logica: el turno pasa a 'cancelado' y el indice parcial libera el
    // horario. Si ya estaba cancelado no cambia nada y devuelve null.
    async cancelarTurno(id) {
      const result = await pool.query(
        `UPDATE turnos
            SET estado = 'cancelado'
          WHERE id = $1 AND estado <> 'cancelado'
          RETURNING id, codigo, fecha, estado`,
        [id]
      );
      return result.rows[0] || null;
    },
  };
}

export { crearRepositorio };
