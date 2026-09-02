const { Pool, types } = require('pg');

// El OID 1114 es "timestamp without time zone". Por defecto el driver lo
// convierte a un Date de JavaScript usando la zona horaria del proceso, lo que
// puede correr el turno una o dos horas al serializarlo a JSON. Al devolverlo
// como texto, lo que guardamos es exactamente lo que mostramos.
types.setTypeParser(1114, (valor) => valor);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = pool;