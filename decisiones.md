## Git no pudo resolver el conflicto solo ya que no no tiene la capacidad de decidir por nosotros cual es el cambio que verdaderamente queremos aplicar o si queremos combinar los dos cambios, sino que eso lo tenemos que decidir nosotros.
## Lo que tendria que haber pasado para que nunca apareciera es que , no cambien la misma linea de main dos ramas o que la version b haya actuado sobre los cambios de la version a con sus cambios ya realizados ya que al hacer cada uno alguna operacion sobre la misma linea se estarian pisando como fue este el caso.

## Lo que me costo fue justamente la parte de la version a y la version b, ya que al realizarse con copilot y realizar las cosas tan rapidas en el video a veces no entendia que habia accionado, despues de verlo un par de veces pude resolver ese problema.
## Acerca de la IA no estuve usando ya que segui el video precisamente para entender el tema de la mejor manera posible.

## TP2 — Contenedores

### Qué app elegí y por qué

Armé un turnero con catálogo básico de servicios (pensado para negocios chicos tipo peluquerías, veterinarias, academias) como proyecto nuevo, separado en dos servicios reales: backend en Node/Express con PostgreSQL, y frontend en React/Vite servido por nginx.

Lo evalué contra los 4 puntos que pide la cátedra:
- **Build local sin magia**: sí, todo corre con `docker compose up -d --build` y `cp .env.example .env` — no depende de ninguna cuenta externa (nada de OAuth, pagos ni servicios de terceros).
- **Tests**: todavía no tiene, queda pendiente para el TP5.
- **Entender el código**: elegí armar la app de cero en vez de reciclar un proyecto anterior (evalué uno tipo e-commerce que ya tenía, pero era un monolito Next.js sin backend y frontend separados — no cumplía el requisito de dos servicios reales, así que arranqué de nuevo).
- **Tamaño**: CRUD chico a propósito — catálogo de servicios + reserva de turnos, sin pagos, sin login social, sin IA. Todo eso queda para después de la materia.

### Decisiones de contenerización

- **Backend**: multi-stage con `node:22-alpine` en las dos etapas. La primera instala todo (`npm ci`), la segunda copia el resultado y corre `npm prune --omit=dev` para sacar las dependencias de desarrollo (nodemon). Como las dos etapas comparten la misma imagen base, la reducción de tamaño es chica (~4MB) — el ahorro grande de Node no viene de cambiar de imagen, viene de podar lo que no se usa en producción.
- **Frontend**: multi-stage con `node:22-alpine` para compilar (`npm run build`) y `nginx:alpine` para servir los estáticos ya compilados. Acá la reducción es grande (~80%, de 467MB a 93.7MB) porque sí cambia la imagen base completa — nginx ni siquiera tiene Node instalado.
- **Qué persiste y qué no**: la base de datos usa un volumen (`db_data`) para que los turnos sobrevivan a un `docker compose down`. Los contenedores en sí no persisten nada — se pueden borrar y recrear sin perder datos, siempre que el volumen quede intacto.
- **`depends_on` + `healthcheck`**: el backend no arranca hasta que Postgres esté realmente aceptando conexiones (no solo "el contenedor existe"), para no arrancar en carrera contra una base que todavía no está lista.
- **`nginx.conf`**: el proxy hacia el backend usa una variable (`set $backend_api`) en vez del nombre del servicio escrito directo, para que nginx no intente resolver el nombre al arrancar (fallaría si el frontend levanta antes que el backend) sino recién cuando llega un pedido real.

### Problemas que encontré y cómo los resolví

- Git Bash (MinTTY) no soporta menús interactivos: tanto `npm create vite@latest` como `docker login` se realizaban de forma vanilla/default. Lo resolvi evitando la interactividad: `--template react` como argumento directo, y `--password-stdin` para el login.
- El `Dockerfile` del backend se guardó vacío la primera vez (nunca llegué a crearlo) — lo detecté con `ls -la` antes de asumir que el problema era otra cosa.
- El tag `v1.0.0` del TP1 apuntaba a un commit anterior a que existieran `decisiones.md` y `evidencias.md` — lo recreé apuntando al commit correcto antes de arrancar este TP.

### Sobre el uso de IA

Usé Claude en este TP: para diseñar el modelo de datos, escribir el código del backend y frontend, para algunos comandos de Docker fuera de lso basicos como docker compose up , y para comandos como nginx y tambien para debuggear cada error que fui encontrando en el camino. No copié nada a ciegas: cada pieza la probé yo mismo antes de darla por buena (corriendo los contenedores, pegándole a los endpoints con `curl`, verificando en la base de datos directamente que los datos persistían, comparando tamaños de imagen reales). Cada Dockerfile tiene dos etapas, por qué el `healthcheck` es necesario y no alcanza con `depends_on` solo, y por qué el proxy de nginx usa una variable en vez del nombre del servicio escrito directo.
