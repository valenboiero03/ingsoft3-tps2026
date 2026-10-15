# ---- Etapa 1: build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Etapa 2: tests (parte del build: ya tiene Node y las dependencias) ----
# No corre al construir: corre cuando el pipeline hace `docker run` de esta
# etapa. Si un test falla o la cobertura no llega al umbral, sale con error.
FROM build AS test
ENTRYPOINT ["npm", "run", "test:ci"]

# ---- Etapa 3: nginx sirve los estaticos (queda ULTIMA: es la que se despliega) ----
FROM nginx:alpine
# Va en templates/ (no en conf.d/): la imagen oficial de nginx reemplaza los
# ${VARIABLE} al arrancar y deja el resultado en conf.d/default.conf.
COPY default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
# Valores por defecto = los de docker compose. Render los pisa por entorno.
ENV BACKEND_URL=http://backend:3000 \
    DNS_RESOLVER=127.0.0.11
EXPOSE 80