-- ---------------------------------------------------------------------------
-- Turnero - esquema de base de datos
-- Se ejecuta una unica vez, cuando el volumen de Postgres esta vacio.
-- Para reconstruirlo: docker compose down -v && docker compose up -d --build
-- ---------------------------------------------------------------------------

-- Datos del negocio. Una sola fila: el mismo frontend sirve para cualquier
-- rubro (peluqueria, veterinaria, academia) cambiando este registro.
CREATE TABLE IF NOT EXISTS negocio (
    id            SERIAL PRIMARY KEY,
    nombre        TEXT NOT NULL,
    rubro         TEXT NOT NULL,
    direccion     TEXT NOT NULL,
    color_acento  TEXT NOT NULL DEFAULT '#A9583C',
    hora_apertura TIME NOT NULL DEFAULT '09:00',
    hora_cierre   TIME NOT NULL DEFAULT '19:30',
    -- 0 = domingo ... 6 = sabado. Si el negocio necesitara un horario distinto
    -- por dia, esto se normaliza en una tabla "horarios".
    dias_cerrados INTEGER[] NOT NULL DEFAULT '{0,1}'
);

CREATE TABLE IF NOT EXISTS servicios (
    id               SERIAL PRIMARY KEY,
    nombre           TEXT NOT NULL UNIQUE,
    categoria        TEXT NOT NULL,
    descripcion      TEXT NOT NULL DEFAULT '',
    duracion_minutos INTEGER NOT NULL CHECK (duracion_minutos > 0),
    precio           NUMERIC(10, 2) NOT NULL CHECK (precio >= 0),
    -- Baja logica: un servicio que ya no se ofrece se desactiva, no se borra,
    -- para no romper los turnos historicos que lo referencian.
    activo           BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS profesionales (
    id     SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    rol    TEXT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- Relacion muchos a muchos: que profesional puede hacer que servicio.
CREATE TABLE IF NOT EXISTS servicios_profesionales (
    servicio_id    INTEGER NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
    profesional_id INTEGER NOT NULL REFERENCES profesionales(id) ON DELETE CASCADE,
    PRIMARY KEY (servicio_id, profesional_id)
);

-- Codigo de reserva visible para el cliente (ej: TRN-2026-0001).
CREATE SEQUENCE IF NOT EXISTS turnos_codigo_seq;

CREATE TABLE IF NOT EXISTS turnos (
    id               SERIAL PRIMARY KEY,
    codigo           TEXT NOT NULL UNIQUE
                     DEFAULT 'TRN-' || to_char(now(), 'YYYY') || '-' ||
                             lpad(nextval('turnos_codigo_seq')::TEXT, 4, '0'),
    servicio_id      INTEGER NOT NULL REFERENCES servicios(id),
    profesional_id   INTEGER NOT NULL REFERENCES profesionales(id),
    fecha            TIMESTAMP NOT NULL,
    nombre_cliente   TEXT NOT NULL,
    telefono_cliente TEXT NOT NULL,
    email_cliente    TEXT,
    nota             TEXT,
    estado           TEXT NOT NULL DEFAULT 'pendiente'
                     CHECK (estado IN ('pendiente', 'confirmado', 'cancelado')),
    creado_en        TIMESTAMP NOT NULL DEFAULT now()
);

-- Un profesional no puede tener dos turnos activos a la misma hora.
-- Es indice parcial: si el turno se cancela, ese horario vuelve a quedar libre.
CREATE UNIQUE INDEX IF NOT EXISTS turnos_profesional_fecha_uk
    ON turnos (profesional_id, fecha)
    WHERE estado <> 'cancelado';

-- Acelera la consulta de disponibilidad, que siempre filtra por profesional y dia.
CREATE INDEX IF NOT EXISTS turnos_profesional_fecha_idx
    ON turnos (profesional_id, fecha);

-- ---------------------------------------------------------------------------
-- Datos de ejemplo
-- ---------------------------------------------------------------------------

INSERT INTO negocio (nombre, rubro, direccion, color_acento, hora_apertura, hora_cierre, dias_cerrados)
SELECT 'Duval', 'Peluquería', 'Av. Rivadavia 4820, CABA', '#A9583C', '09:00', '19:30', '{0,1}'
WHERE NOT EXISTS (SELECT 1 FROM negocio);

INSERT INTO servicios (nombre, categoria, descripcion, duracion_minutos, precio) VALUES
    ('Corte y brushing',    'Corte',        'Lavado, corte a tijera y brushing con terminación a elección.', 50,  18000),
    ('Corte masculino',     'Corte',        'Corte con máquina y tijera, perfilado de patillas y nuca.',     30,  12000),
    ('Coloración completa', 'Color',        'Aplicación de color en raíz y largos, con tratamiento de sellado.', 135, 46000),
    ('Balayage',            'Color',        'Aclarado a mano alzada, matizado y corte de puntas incluido.',  180, 72000),
    ('Peinado de fiesta',   'Peinado',      'Recogido o semi recogido con fijación de larga duración.',      70,  29000),
    ('Nutrición profunda',  'Tratamiento',  'Tratamiento reconstructor para cabello poroso o teñido.',       90,  34000)
ON CONFLICT DO NOTHING;

INSERT INTO profesionales (nombre, rol) VALUES
    ('Valeria Sosa',   'Colorista senior'),
    ('Nicolás Ruiz',   'Estilista'),
    ('Camila Ferrer',  'Tratamientos')
ON CONFLICT DO NOTHING;

-- Que hace cada profesional
INSERT INTO servicios_profesionales (servicio_id, profesional_id)
SELECT s.id, p.id
FROM servicios s
JOIN profesionales p ON (
       (s.categoria IN ('Corte', 'Peinado') AND p.nombre IN ('Nicolás Ruiz', 'Valeria Sosa'))
    OR (s.categoria = 'Color'               AND p.nombre IN ('Valeria Sosa'))
    OR (s.categoria = 'Tratamiento'         AND p.nombre IN ('Camila Ferrer', 'Valeria Sosa'))
)
ON CONFLICT DO NOTHING;