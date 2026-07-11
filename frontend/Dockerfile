# ─────────────────────────────────────────────────────────────────────────────
# Frontend image — multi-stage.
#
# Builds the Vite app to static assets, then serves them with nginx. nginx also
# reverse-proxies /api to the backend so the browser makes same-origin requests.
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
RUN npm ci --workspace frontend --include-workspace-root

COPY frontend ./frontend
# The API is reached via nginx at the same origin, so the base path is relative.
ENV VITE_API_BASE_URL=/api
RUN npm run build --workspace frontend

# ── Stage 2: serve ──────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
