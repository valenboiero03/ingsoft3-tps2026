CREATE TABLE IF NOT EXISTS servicios (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    duracion_minutos INTEGER NOT NULL,
    precio NUMERIC(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS turnos (
    id SERIAL PRIMARY KEY,
    servicio_id INTEGER NOT NULL REFERENCES servicios(id),
    fecha TIMESTAMP NOT NULL,
    nombre_cliente TEXT NOT NULL,
    telefono_cliente TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pendiente'
);

INSERT INTO servicios (nombre, duracion_minutos, precio) VALUES
    ('Corte de pelo', 30, 5000),
    ('Coloración', 90, 15000)
ON CONFLICT DO NOTHING;