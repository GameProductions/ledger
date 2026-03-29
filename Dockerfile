# --- BASE STAGE ---
FROM node:22-slim AS base
WORKDIR /app
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/
# Install all dependencies (including dev) for building
RUN npm install

# --- BUILD API ---
FROM base AS build-api
COPY apps/api ./apps/api
COPY packages/db ./packages/db
# No explicit build script for API since we use tsx in production stage
# but we need the source files.

# --- BUILD WEB ---
FROM base AS build-web
COPY apps/web ./apps/web
# Set Vite env for the build
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN cd apps/web && npm run build

# --- PRODUCTION API ---
FROM node:22-slim AS api
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Create data directory and set permissions
RUN mkdir -p /data && chown -R node:node /data /app
COPY --from=base --chown=node:node /app/node_modules ./node_modules
COPY --from=build-api --chown=node:node /app/apps/api ./apps/api
COPY --from=build-api --chown=node:node /app/packages/db ./packages/db
WORKDIR /app/apps/api
USER node
EXPOSE 8787
ENV DATABASE_PATH=/data/ledger.db

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8787/ledger/ping || exit 1

CMD ["npx", "tsx", "src/serve.ts"]

# --- PRODUCTION WEB ---
FROM nginx:alpine AS web
COPY --from=build-web /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O - http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
