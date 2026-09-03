# Turnero + Catálogo

Sistema de turnos con catálogo de servicios para negocios independientes (peluquerías, veterinarias, academias, etc.). Backend en Node/Express, frontend en React/Vite, base de datos PostgreSQL — los tres como servicios separados, orquestados con Docker Compose.

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo
- Git

## Cómo levantar el sistema (máquina limpia)

```bash
git clone https://github.com/valenboiero03/ingsoft3-tps2026.git
cd ingsoft3-tps2026
cp .env.example .env
docker compose up -d --build
```

Esperá unos segundos y confirmá que los tres servicios están arriba:

```bash
docker compose ps
```

El servicio `db` tiene que decir **healthy** antes de que `backend` termine de arrancar — es esperado, es el `healthcheck` haciendo su trabajo.

## Usar el sistema

- **Frontend**: [http://localhost:8080](http://localhost:8080)
- **API del backend**: [http://localhost:3000](http://localhost:3000)

Endpoints disponibles:
| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/health` | Chequeo de salud del backend |
| GET | `/api/servicios` | Lista el catálogo de servicios |
| GET | `/api/turnos` | Lista los turnos reservados |
| POST | `/api/turnos` | Crea un turno nuevo |

## Levantar con las imágenes publicadas (sin buildear local)

```bash
cp .env.example .env
docker compose -f docker-compose.registry.yml up -d
```

Usa las imágenes ya publicadas en `ghcr.io/valenboiero03/mi-backend` y `ghcr.io/valenboiero03/mi-frontend` en vez de construirlas desde el código.

## Apagar el sistema

```bash
docker compose down       # apaga los contenedores, los datos persisten
docker compose down -v    # apaga Y borra los datos (vuelve a foja cero)
```

## Estructura del repo

```
backend/     → API en Node/Express + conexión a PostgreSQL
frontend/    → SPA en React/Vite, servida por nginx en producción
docker-compose.yml            → orquestación local (buildea las imágenes)
docker-compose.registry.yml   → orquestación con imágenes publicadas
decisiones.md  → decisiones técnicas de cada TP
evidencias.md  → evidencia de funcionamiento de cada TP
```


## Estado del CI
```
[![CI](https://github.com/valenboiero03/ingsoft3-tps2026/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/valenboiero03/ingsoft3-tps2026/actions/workflows/ci.yml)
```

