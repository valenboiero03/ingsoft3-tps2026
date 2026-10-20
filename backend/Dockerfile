# ---- Etapa 1: build (acá instalamos TODO, incluidas devDependencies) ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# ---- Etapa 2: tests (parte del build: ya tiene Node, el codigo y vitest) ----
# No corre al construir: corre cuando el pipeline hace `docker run` de esta
# etapa. Si un test falla o la cobertura no llega al umbral, sale con error.
FROM build AS test
ENTRYPOINT ["npm", "run", "test:ci"]

# ---- Etapa 3: imagen final, sin herramientas de desarrollo ----
FROM node:22-alpine
WORKDIR /app
COPY --from=build /app ./
RUN npm prune --omit=dev
# El commit que produjo esta imagen: lo pasa el pipeline con build-args.
# Va al final para no invalidar la cache de las capas de arriba.
ARG GIT_COMMIT
ENV GIT_COMMIT=${GIT_COMMIT}
EXPOSE 3000
CMD ["node", "index.js"]