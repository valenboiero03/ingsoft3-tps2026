# ---- Etapa 1: build (acá instalamos TODO, incluidas devDependencies) ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# ---- Etapa 2: imagen final, sin herramientas de desarrollo ----
FROM node:22-alpine
WORKDIR /app
COPY --from=build /app ./
RUN npm prune --omit=dev
EXPOSE 3000
CMD ["node", "index.js"]