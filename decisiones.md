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


## TP3 - Planificacion y trazabilidad

### Duracion del sprint

Elegi un sprint de 10 dias (aproximadamente 1.5 semanas) en vez de un numero redondo de semanas. El campo Iteration de GitHub Projects solo permite numeros enteros cuando se usa la unidad "weeks", asi que para lograr algo entre una semana y dos semanas cambie la unidad a "days". Esta duracion se ajusta mejor al ritmo con el que voy entregando los TPs de la materia que una semana justa (demasiado corta para completar una historia con dos tareas) o dos semanas completas (demasiado laxo, perderia la presion de terminar rapido).

### Limite de trabajo en progreso

Configure el limite de la columna "In Progress" en 2. La regla de partida es cantidad de personas mas uno: como trabajo solo en este proyecto, eso da 1 + 1 = 2. El "mas uno" funciona como valvula para cuando algo queda esperando (por ejemplo, un PR esperando que corran los checks) y necesito poder avanzar en otra cosa sin quedarme bloqueado, sin llegar a tener cinco tareas a medio hacer en simultaneo.

### Diagnostico de la historia mal escrita

Cree a proposito el issue #18, "Como desarrollador quiero crear la tabla usuarios para guardar los datos", para reconocer el anti-patron de la historia-tarea disfrazada. Tiene la forma de una historia de usuario pero el contenido es una tarea tecnica: "crear una tabla" no es algo que un usuario final quiera, es un paso interno de implementacion, y el "para guardar los datos" no es un beneficio real sino casi la misma frase repetida sin explicar que gana alguien con esto.

Como la reescribiria: la bajaria a tarea, colgada de una historia con valor de usuario real, por ejemplo "Como usuario quiero que mis datos se guarden de forma persistente para no perderlos si la app se reinicia o se actualiza", y "crear la tabla usuarios" pasaria a ser una de las tareas tecnicas de esa historia.

### Problemas que encontre y como los resolvi

- No tenia GitHub CLI instalado en esta maquina. Lo instale con `winget install --id GitHub.cli` y reinicie la terminal para que tomara el PATH nuevo.
- El token de `gh` no tenia el scope `project`, asi que los comandos de `gh project` hubieran fallado. Lo actualice con `gh auth refresh -s project` antes de crear el proyecto.
- Al crear las tres labels (`epic`, `story`, `task`) me salte una sin darme cuenta (`task`). Lo detecte comparando la salida de `gh label list` contra lo que esperaba tener, y corri el comando que faltaba.

### Sobre el uso de IA

Use Claude durante todo este TP: para entender la consigna y la guia paso a paso, para que me explicara conceptos que no tenia claros (por ejemplo la diferencia entre sub-issues y task-lists), para que me armara los comandos de `gh` y PowerShell en cada paso, y para redactar el diagnostico de la historia mal escrita y este mismo archivo. No copie nada a ciegas: corri cada comando yo mismo en mi propia terminal, revise la salida de cada uno antes de seguir al siguiente paso, y verifique visualmente en GitHub (capturas del board, del proyecto publico, del issue #14 cerrado y movido a Done, y del pull request #17 mergeado) que cada cosa quedara como se esperaba antes de avanzar.

## TP4 - Nota
Cambio de relleno para demostrar el boton "Update branch" con dos PRs abiertos en simultaneo.

## TP4 - Pipelines de CI

### Estructura del pipeline
Un workflow (`.github/workflows/ci.yml`) disparado por `pull_request` y `push` a `main`, con dos jobs en paralelo: `build-backend` y `build-frontend`. Cada uno usa el Dockerfile correspondiente del TP2 (`./backend`, `./frontend`) via `docker/build-push-action`, con `push: false` (todavia no se publica en ningun registry, solo se valida que compile).

### Cache de capas
`docker/setup-buildx-action` + `cache-from`/`cache-to: type=gha`, con `scope` distinto por job (`backend` / `frontend`) para que no se pisen entre si. Se confirmo funcionando en la corrida del PR #23 (job `build-frontend`, 31% de las capas reutilizadas) — el cache se guarda en cada push a `main` y lo aprovecha el proximo PR desde su primera corrida.

### Gate obligatorio
Se extendio la proteccion de rama del TP1: `Require status checks to pass before merging` con `build-backend` y `build-frontend` como checks requeridos, mas `Require branches to be up to date before merging` (equivalente a `strict: true`). Se mantuvieron las reglas del TP1 (0 approvals, `Do not allow bypassing the above settings`).

### Demostracion del gate
PR #23: se agrego una dependencia inexistente a `backend/package.json`, lo que hizo fallar el paso `npm ci` del Dockerfile. El check `build-backend` quedo en rojo y el boton de merge se bloqueo (`build-frontend` no se vio afectado, corre independiente). Se abrio un segundo PR (#24) en paralelo para demostrar el boton "Update branch" sobre el PR bloqueado. Se corrigio la dependencia, el pipeline paso a verde, y se mergeo con squash.

### Problemas encontrados
- Docker Desktop no estaba corriendo en el primer intento de build local (mismo problema que en TP2).
- Backend Node/Express no tiene build step, por lo que un error de codigo no alcanza para romper `docker build` — hubo que romper una dependencia en `package.json` en vez de el codigo en si.
- Varias veces el commit se hizo en la rama equivocada (`main` en vez de la feature branch) por olvidar el `git checkout -b` antes de editar — resuelto verificando `git status`/`git branch` antes de cada commit.

### Uso de IA
Se uso Claude para interpretar la consigna del TP4, generar el `ci.yml`, planificar la secuencia de PRs, y depurar problemas de git (ramas desincronizadas, conflictos de merge) durante la ejecucion.