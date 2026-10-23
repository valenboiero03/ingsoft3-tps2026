## Enlaces de este TP (TP7)
- **Paquetes** (una etiqueta por imagen, `sha-<commit>`): [backend](https://github.com/valenboiero03/ingsoft3-tps2026/pkgs/container/ingsoft3-tps2026-backend) y [frontend](https://github.com/valenboiero03/ingsoft3-tps2026/pkgs/container/ingsoft3-tps2026-frontend).
- **Integracion VERDE + e2e ROJA:** [corrida #55](https://github.com/valenboiero03/ingsoft3-tps2026/actions/runs/39779212385), por el [commit 9f90c83](https://github.com/valenboiero03/ingsoft3-tps2026/commit/9f90c83da9a55744e61a07dc7e33d93604dfd3c2) que rompio la app. Reportes: [playwright-report-integracion](https://github.com/valenboiero03/ingsoft3-tps2026/actions/runs/39779212385/artifacts/12425289862) (verde) y [playwright-report-e2e](https://github.com/valenboiero03/ingsoft3-tps2026/actions/runs/39779212385/artifacts/12426221397) (rojo).
- **Corrida completa en verde hasta PROD:** [corrida #57](https://github.com/valenboiero03/ingsoft3-tps2026/actions/runs/39782260084), con el arreglo `a884d64`.
- **QA:** [api](https://turnero-api-qa-i3gd.onrender.com/health) y [front](https://turnero-front-qa-crex.onrender.com).
- **PROD:** [api](https://turnero-api-prod-am2s.onrender.com/health) y [front](https://turnero-front-prod-y4rx.onrender.com).

## Enlaces de este TP (TP6)
- **Paquetes:**
  - [backend](https://github.com/valenboiero03/ingsoft3-tps2026/pkgs/container/ingsoft3-tps2026-backend)
  - [frontend](https://github.com/valenboiero03/ingsoft3-tps2026/pkgs/container/ingsoft3-tps2026-frontend)
- **Cadena:**
  1. [PR #34](https://github.com/valenboiero03/ingsoft3-tps2026/actions/runs/38603583706/job/115988683701): "Entrar al registry" salteado.
  2. [Corrida de main](https://github.com/valenboiero03/ingsoft3-tps2026/actions/runs/38605227688/job/115994265753): publicar es el ultimo paso.
- **QA:** [api](https://turnero-api-qa-i3gd.onrender.com/health) y [front](https://turnero-front-qa-crex.onrender.com).
- **PROD:** [api](https://turnero-api-prod-am2s.onrender.com/health) y [front](https://turnero-front-prod-y4rx.onrender.com).

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

Usé Claude en este TP: para diseñar el modelo de datos, escribir el código del backend y frontend, para algunos comandos de Docker fuera de los basicos como docker compose up , y para comandos como nginx y tambien para debuggear cada error que fui encontrando en el camino. No copié nada a ciegas: cada pieza la probé yo mismo antes de darla por buena (corriendo los contenedores, pegándole a los endpoints con `curl`, verificando en la base de datos directamente que los datos persistían, comparando tamaños de imagen reales). Cada Dockerfile tiene dos etapas, por qué el `healthcheck` es necesario y no alcanza con `depends_on` solo, y por qué el proxy de nginx usa una variable en vez del nombre del servicio escrito directo.


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

## TP5 - Calidad automatizada: tests, coverage y el umbral que frena un merge

### Que logica elegi testear y por que
El bug que mas duele en un turnero es dar un turno que no se puede cumplir: dos clientes a la misma hora con el mismo profesional, un servicio que termina despues del cierre, o un turno en un dia que el negocio no abre. Por eso la suite esta sobre el calculo de disponibilidad, la reserva y la cancelacion, y no sobre los endpoints que solo listan.

- **Backend** (50 tests, `backend/src/*.test.js`): el servicio tiene que terminar antes del cierre, dos turnos no se pisan, no se ofrecen horas que ya pasaron, no se reserva en dias cerrados ni fechas pasadas, la reserva se revalida antes de guardar, datos obligatorios y formato, y cancelacion hasta 4 horas antes. Cada regla tiene su caso de borde.
- **Frontend** (23 tests, `frontend/src/lib/*.test.js`): formato de duracion y horario, filtro del catalogo, y el cliente de la API.
- Las tres tecnicas estan de los dos lados: parametrizado (`it.each`), caso de error y mock.

Para comprobar que los tests verifican y no solo ejecutan, se invirtieron a mano 13 reglas de a una (`<=` por `<`, `&&` por `||`) y en las 13 algun test se puso en rojo.

### Refactor para poder mockear
Toda la logica estaba en `backend/index.js`, pegada a la base (`pool.query`) y al reloj (`new Date()`): no se podia llamar desde un test sin Postgres levantado, y el resultado dependia de la hora. La separe en `src/horarios.js` y `src/validaciones.js` (funciones puras), `src/turnos.js` (el servicio, que ahora **recibe** el repositorio y el reloj por parametro) y `repositorio.js` (todo el SQL). `index.js` quedo como arranque.

En `turnos.test.js` el repositorio es un doble hecho con `vi.fn()`. El assert que lo hace un mock y no un stub es `expect(repo.guardarTurno).not.toHaveBeenCalled()`: comprueba que si el horario ya esta tomado no se guarda nada. En el frontend era el mismo problema: `api.js` llamaba a `fetch` adentro; ahora `lib/cliente.js` lo recibe por parametro.

### Stack
Mi app es Node/Express + React/Vite, no .NET. Use **vitest 5** en los dos lados: `it.each` para parametrizar, `vi.fn()` para los dobles, `vitest run --coverage` (`@vitest/coverage-v8`) para medir, `coverage.thresholds` para el umbral que rompe el build y `coverage.include` para decir que entra en la cuenta.

### Como corre en el pipeline
Sin jobs ni checks nuevos. Cada Dockerfile tiene una etapa `test` en el medio (`FROM build AS test`) y cada job del TP4 suma cuatro pasos: construir esa etapa, correrla con `docker run`, armar la tabla en el Summary y publicar el reporte como artefacto. El pipeline no sabe como se testea la app: se lo pide al Dockerfile.

- PR donde entro todo esto: https://github.com/valenboiero03/ingsoft3-tps2026/pull/30
- Corrida con el resumen y los reportes descargables: https://github.com/valenboiero03/ingsoft3-tps2026/actions/runs/37553435590

### Mi umbral: 90 % de lineas y 90 % de ramas, en los dos lados
Hoy mido 98,80 % de lineas y 98,33 % de ramas en el backend, y 100 % y 100 % en el frontend. Puse 90 porque quiero que me frene cuando entra codigo sin tests y no cuando agrego una linea suelta: deja entrar unas 8 lineas nuevas sin tests en el backend y 3 en el frontend. Lo puse sobre las dos metricas porque la de lineas sola miente mas: un `if` recorrido por un solo camino da 100 % de linea y 50 % de rama. Subirlo a 95 no me pediria tests nuevos hoy, pero dejaria un margen de 3 lineas y el gate frenaria cambios chicos y legitimos.

### Que deje afuera de la cuenta
Entra `backend/src/**` y `frontend/src/lib/**`; un archivo nuevo en esas carpetas entra solo, tenga tests o no.

- `backend/index.js` y `db.js`: arranque, rutas y conexion. No les quedaron reglas.
- `backend/repositorio.js`: es SQL. **Aca si queda logica sin verificar** (por ejemplo, que un turno cancelado libera el horario): eso pide pruebas de integracion, no unitarias.
- Frontend: los componentes de React, `main.jsx` y `api.js`. La UI se verifica end-to-end en el TP7.

### Por que un coverage alto no garantiza calidad
Mi frontend mide 100 % y eso no prueba que la pantalla funcione: el doble de `fetch` contesta lo que yo le dije, asi que si el backend cambia el formato del error los tests siguen verdes y la app falla. Y la cobertura mide ejecucion, no verificacion: si le borro los `expect` a un test, sigue pasando y el codigo sigue figurando cubierto. Lo que me dice si un test verifica es invertir la regla y ver si se pone rojo.

### La rama sin cubrir
1. **Que linea**: `backend/src/turnos.js`, linea 21: `crearServicioDeTurnos({ repo, ahora = () => new Date() })`. La rama la abre el valor por defecto: todos los tests pasan un reloj fijo, asi que el camino del reloj real no se recorre.
2. **Que entrada la recorreria**: crear el servicio sin reloj, `crearServicioDeTurnos({ repo })`.
3. **Que decidi**: no agregar el test. Recorrerla es usar el reloj real, y el resultado cambiaria segun el dia y la hora en que corra la suite.

### El Pull Request bloqueado por cobertura
- **PR #31, la secuencia completa**: https://github.com/valenboiero03/ingsoft3-tps2026/pull/31. Agregue `backend/src/cancelaciones.js` sin tests. Compilaba y los 43 tests pasaban, pero `build-backend` quedo en rojo y el merge bloqueado. Freno en las dos metricas: `Coverage for lines (82.14%)` y `Coverage for branches (85%)` contra un umbral de 90 ([corrida roja](https://github.com/valenboiero03/ingsoft3-tps2026/actions/runs/37551467260)). Lo arregle con 7 tests, uno por cada camino de la funcion mas los bordes ([corrida verde](https://github.com/valenboiero03/ingsoft3-tps2026/actions/runs/37553002901)), y se mergeo.
- **PR #32, abierto y en rojo hasta la defensa**: https://github.com/valenboiero03/ingsoft3-tps2026/pull/32. El mismo problema del lado del frontend (`lib/contacto.js` sin tests): `build-frontend` en rojo con 79,54 % de lineas y 61,29 % de ramas ([corrida](https://github.com/valenboiero03/ingsoft3-tps2026/actions/runs/37556381609)).

La diferencia con el gate del TP4: alla frenaba que la imagen no se construyera; aca todo compila y los tests pasan, y lo que frena es un numero que elegi yo. Lo que igual deja pasar: un requisito mal entendido y un test que ejecuta sin verificar.

### Problemas encontrados
- La cobertura del backend daba mal con CommonJS: vitest y el `require` de Node cargaban dos copias del mismo archivo y habia lineas ejecutadas que figuraban sin cubrir. Se resolvio pasando el backend a modulos ES (`import`).
- El script `test:ci` usa una expansion de `sh` que en Windows no funciona; en mi maquina corro `npm test -- --run --coverage`.

### Uso de IA
Use Claude para el refactor, los tests, la configuracion de cobertura, los cambios en los Dockerfiles y el `ci.yml`, y el borrador de esta seccion. Los commits, los push y los Pull Requests los hice yo desde mi terminal, revisando `git status` y `git branch` antes de cada commit. Lei cada archivo antes de subirlo, mire los checks de cada PR en GitHub y abri el log de las corridas rojas para leer la tabla de cobertura y las lineas de error.

## TP6 - CD: environments, aprobaciones y deployment patterns

### Por que el artefacto se publica solo con verde
La imagen sale solo si se cumplen tres cosas:
1. Nada entra a `main` sin verde.
2. Solo `main` publica.
3. Publicar es el ultimo paso del job que corre los tests.

Si se publicara igual, una imagen del registry ya no significaria "paso la verificacion".

### Continuous Delivery vs Deployment
Implemente Continuous Delivery. QA se despliega solo y PROD solo con mi aprobacion, porque no tengo tests e2e ni monitoreo que reemplacen esa revision.

### Cadena y secrets
`deploy-qa` tiene `needs` de los dos builds y `if` de `main`, asi que los PR no despliegan. `deploy-prod` tiene `needs: deploy-qa` y `environment: production`, que lo frena hasta la aprobacion. Los hooks de QA son secrets del environment `qa` y los de PROD del environment `production`: solo los lee un job de ese environment, y en PROD recien despues de aprobar.

### Que quedo por variable
La imagen trae el front compilado y la plantilla de nginx. Por variable van:
- `BACKEND_URL` y `DNS_RESOLVER` en el front.
- `DATABASE_URL` y `TZ` en la api.

Asi la misma imagen sirve en QA y en PROD. Comprobe que las bases son distintas creando un dato solo en `app_prod`: aparece en PROD y no en QA.

### Criterios del gate
Antes de aprobar miro:
- Que el smoke de QA este verde con el commit correcto.
- Que el cambio se vea bien en QA.
- Que no haya cambios de base o variables nuevas que PROD no tenga.

Rechace la corrida #37 porque su smoke dio verde sin verificar que version corria.

### Free tier
Render Free:
- Duerme los servicios a los 15 min y tarda hasta un minuto en despertar.
- Da 750 horas y 500 minutos de build por mes.

El smoke lo maneja con 30 reintentos cada 20 s. Use Neon porque el Postgres gratis de Render vence a los 30 dias.

### Lo que se pierde porque Render reconstruye
Render construye de nuevo el commit en vez de usar mi imagen. Es el mismo codigo pero no el mismo artefacto: una imagen base distinta o un build fallido pueden dar otro resultado que el que paso los tests.

### Que prueba el smoke y que no
Prueba que la api responde con el commit desplegado, que llega a su base y que el front llega a la api. No prueba que reservar un turno funcione.

### Deployment pattern y rollback
Para produccion real usaria **blue-green**: es barato duplicar dos servicios chicos y el rollback es instantaneo. No canary, porque con pocos usuarios no hay trafico para comparar. Me falta un router delante y metricas de errores.

Rollback actual:
1. Tomar el commit bueno anterior de Deployments.
2. Disparar los hooks de PROD con `&ref=<sha>`.
3. Esperar Live en Render y verificar `/health`.

Medido el 16/10/2026, de `69874c1` a `23e5843`: hook a las 18:29:04, api Live a las 18:29:36. **Total: 32 s.**

No deshace los datos: lo que cambio en la base queda cambiado.

### Problemas encontrados
- Un 502 en los fronts: era el backend dormido.
- Faltaban variables en PROD (`TZ`, `DNS_RESOLVER`).
- El primer build en Render estuvo 1 h 22 min en cola.

### Uso de IA
Use Claude para el `ci.yml`, la plantilla de nginx, los comandos y este texto, y para corregir variables de PROD en Render desde mi navegador. Los commits, los PR, la aprobacion y el rechazo los hice yo, y verifique cada paso en Actions, en Render y en `/health`.

## TP7 - Contenedores en el pipeline + integracion y e2e

### Build once, deploy many
En el TP6 Render reconstruia cada commit: QA y PROD corrian dos builds distintos del mismo codigo, y ninguno era la imagen que paso los tests. Si entre el deploy a QA y la aprobacion se actualizaba `node:22-alpine`, PROD recibia otro binario que el probado. Ahora el pipeline construye una vez, publica `sha-<commit>` y los cuatro servicios ejecutan esa imagen: lo verificado en QA es exactamente lo que llega a PROD.

### Etiquetas
- `sha-<commit>` en el registry: dice de que commit salio cada imagen. Es la unica que usa el pipeline para desplegar.
- `v7.0.0` en git: nombra la version que anduvo en PROD.
- No publico `latest`: se mueve con cada merge, asi que no dice que esta corriendo ni sirve para volver atras.
- Les cambie la fuente a los cuatro servicios existentes (no cree nuevos) y quedaron configurados con `sha-4d09423...`. No es la que corre: cada deploy le pasa su imagen con `imgURL`. Por eso no uso Manual Deploy, que desplegaria esa imagen vieja.

### De la release a la imagen
`git rev-list -n1 v7.0.0` da el commit, y la imagen `sha-<ese commit>` esta en los dos paquetes. Volver a esa version es mandarle esa imagen a los hooks.

### Como se comprueba que el entorno ejecuta mi imagen
- En Events de cada servicio, el deploy dice "Deploy Hook" y nombra el `sha-<commit>` de la corrida.
- La imagen del backend lleva el commit horneado (`ARG GIT_COMMIT` + `build-args`) y `/health` lo devuelve. Un servicio de imagen no tiene `RENDER_GIT_COMMIT`, asi que si el smoke ve el commit de la corrida, la api ejecuta esa imagen.
- El smoke no prueba que la app funcione: en la corrida #55 paso en verde con el formulario de reserva roto.

### Que prueba cada suite
Integracion (`api.spec.js`, sin navegador, contra la api de QA):
1. Reservar: el GET lo devuelve y el horario deja de ofrecerse; cancelar: no queda activo y el horario vuelve.
2. Reserva sin telefono: 400 y no se crea nada.
3. Elegida: el mismo horario dos veces da 409 y queda un solo turno. Lo garantiza el indice unico de Postgres, que un unitario con doble no ve. Si se rompe, dos clientes caen al mismo horario.

E2E (`turnos.spec.js`, Chromium contra el front de QA):
1. Reservar desde el catalogo, ver la confirmacion con su nombre y codigo, cancelar, y el horario vuelve.
2. Un dia que el negocio no atiende: se ve el motivo, no hay horarios ni boton de confirmar, y no se crea nada.
3. Elegida: lo que reserva un cliente deja de ofrecerse a otro, en otro navegador. Es el flujo de todos los dias: si falla, me escriben dos clientes con el mismo turno.

No puse en e2e los bordes de la agenda (solapamientos, horarios pasados, las 4 horas), que ya cubren los unitarios, ni en integracion nada de pantalla. Cancelar es baja logica, asi que "ya no esta" se comprueba como "no hay turno activo y el horario vuelve a ofrecerse".

### El par verde/rojo
Rompi el front: `Reserva.jsx` mandaba `telefono` en vez de `telefonoCliente`. En la corrida #55 el smoke y la integracion quedaron verdes, la e2e roja y `deploy-prod` ni pidio aprobacion. La integracion le habla a la api con el campo correcto y la base reservo y cancelo: la api esta sana, el que la usa mal es el front. En la traza se ve el `POST /api/turnos` con `telefono` y el 400. Si hubiera roto la api, la integracion quedaba roja y la e2e no corria.

### Integracion amplia
Le hablo a la api de QA ya desplegada. Gana: prueba la imagen real contra el Postgres real, con muy poca configuracion. Pierde: llega despues del deploy, depende de Render y comparte la base de QA. La estrecha (api y Postgres dentro del job) avisaria antes y aislada, a costa de bastante mas configuracion.

### Cold start, flaky y QA compartido
- El smoke ya despierta QA. Playwright espera hasta 60 s por test y 15 s por asercion, sin sleeps, con un reintento.
- Un test flaky es el que pasa recien al reintentar. Si se repite, se arregla el test: uno que a veces falla ensena a ignorar el rojo.
- Ninguna prueba fija horario: piden un dia habil a 3 a 5 dias y un horario libre, usan un nombre unico, cancelan aunque fallen (`afterEach`) y corren de a una.
- Limite conocido: dos merges seguidos pueden redesplegar QA en medio de las pruebas del otro. Se reconoce en Events (que imagen corria y a que hora). Hago un merge por vez y rechazo la corrida vieja.

### Misma imagen del front en QA y PROD
Como en el TP6, `BACKEND_URL` y `DNS_RESOLVER` van por variable del servicio. En cambio `TZ` de la api ahora va en la imagen: es un dato del negocio, igual en todos los entornos, y en el TP6 se habia olvidado en PROD. Probe la api sin `TZ`: ofrecia solo los horarios de las 18 en adelante.

### Problemas encontrados
- El smoke tomaba el commit de `RENDER_GIT_COMMIT`, que no existe en un servicio de imagen: lo hornee en la imagen.
- La api no podia cancelar un turno, y las pruebas no tenian como limpiar: agregue `DELETE /api/turnos/:codigo` con la regla de 4 horas, y subi la pagina de reserva pendiente desde el TP5.
- Se filtro un deploy hook en una captura: lo regenere y actualice el secret.
- Cancele una corrida despues de aprobar PROD y el deploy ya habia salido: cancelar no es rollback, el freno es rechazar antes de aprobar.

### Uso de IA
Use Claude para el endpoint, la pagina de reserva, las dos suites, los cambios del `ci.yml` y este texto; edito los archivos directamente en mi repo. Antes de cada PR corrio los unitarios, probo el endpoint contra un Postgres y las suites en un Chromium real, incluida la rotura. Los commits, los PR, el `ci.yml`, las aprobaciones y la release los hice yo, y verifique cada paso en Actions, en los reportes, en Render y en QA.

## TP8 - Infraestructura como Codigo

### Riel y versiones
Riel canonico: Terraform 1.16.6 con `kislerdm/neon` 0.18.0 y `render-oss/render` 1.9.1, fijados por version y con el `.terraform.lock.hcl` commiteado. `infra/` declara un entorno nuevo, `preprod`: un proyecto de Neon propio (`turnero-preprod`, region `aws-us-east-2`) y dos servicios free de Render en Ohio con la imagen del merge `a23f8b7` del TP7. QA y PROD no se tocaron.

- Las claves (`NEON_API_KEY`, `RENDER_API_KEY`, `RENDER_OWNER_ID`) y el `TF_VAR_neon_org_id` van por variables de entorno, nunca en el HCL.
- `DATABASE_URL` se arma en un `locals` con el rol, la contrasena, el host y la base que devuelve Neon. `BACKEND_URL` sale del `url` de la api, con `trimsuffix` para no dejar la barra final.
- El estado vive en `infra/terraform.tfstate`, ignorado por git porque tiene la contrasena del rol en texto plano.

### Problemas encontrados
- El primer `apply` fallo con `org_id is required`: mi cuenta de Neon esta dentro de una organizacion. Lo resolvi agregando `org_id` al proyecto, pasado como `TF_VAR_neon_org_id`.
- Al recrear preprod, Render le dio otro sufijo a las URLs (`-4m9x` paso a `-u57a`): por eso las leo del `output` y no las guardo.
- La base volvio en otra region (`us-east-2` paso a `us-east-1`) porque no la habia fijado. Agregue `region_id` y despues de un `destroy` → `apply` volvio en `us-east-2`. Lo agregue con preprod destruido: cambiar la region reemplaza el proyecto y cambia la `DATABASE_URL` de la api, que en Render free no se puede actualizar.
- Terraform se instalo con winget pero PowerShell no lo encontraba hasta reiniciar la terminal.

### Uso de IA
Use Claude para interpretar la guia, escribir el HCL y diagnosticar los errores; edito los archivos directamente en mi repo. Los comandos de Terraform los corri yo y lei cada plan antes de aplicarlo: `init`, `plan`, `apply`, la segunda pasada con "No changes", el drift en Neon (base borrada, detectada y reparada, y una base no declarada que el plan no ve), `prevent_destroy` y el ciclo `destroy` → `apply`. Verifique cada paso en las consolas de Neon y Render y con `curl` a `/health` y `/api/servicios` por la api y por el front. Los commits, el PR y la release los hice yo.
