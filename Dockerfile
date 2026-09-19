# ==============================================================================
# Multi-stage Dockerfile para PiMusic Frontend
# Stage 1: Build de la aplicación con Vite
# Stage 2: Servidor Nginx Alpine ultraligero para producción
# ==============================================================================

# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias con caché óptima
COPY package*.json ./
RUN npm ci

# Copiar código fuente
COPY . .

# Argumento para inyectar URL de backend en tiempo de compilación si se desea
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}

# Compilar SPA estática
RUN npm run build

# Stage 2: Production Server
FROM nginx:alpine

# Copiar archivos compilados al directorio de Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer puerto HTTP estándar
EXPOSE 80

# Verificación de salud del contenedor
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
