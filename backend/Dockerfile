# ─────────────────────────────────────────────────────────────────────────────
# Backend image — multi-stage.
#
# Builds the API + worker (they share one image, differing only by start command)
# and produces a slim runtime with production dependencies + Prisma client.
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: install deps (with dev) and build ──────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Prisma needs OpenSSL present to detect the correct query engine on Alpine.
RUN apk add --no-cache openssl

# Copy manifests first for better layer caching.
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
# Install the backend workspace's full dependency tree.
RUN npm ci --workspace backend --include-workspace-root

# Copy sources and generate the Prisma client, then compile TypeScript.
COPY backend ./backend
RUN npm run db:generate --workspace backend \
  && npm run build --workspace backend

# ── Stage 2: production dependencies only ───────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
RUN npm ci --workspace backend --include-workspace-root --omit=dev

# ── Stage 3: runtime ────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# dumb-init gives us proper PID-1 signal handling for graceful shutdown;
# openssl is required by the Prisma query engine at runtime.
RUN apk add --no-cache dumb-init openssl

# Production node_modules, compiled output, and the Prisma schema/engine.
# In this npm workspace the generated Prisma client is hoisted to the ROOT
# node_modules/.prisma, so we copy it from there.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY backend/package.json ./backend/
COPY package.json ./

# Run as the built-in unprivileged user.
USER node

WORKDIR /app/backend
EXPOSE 4000

# Default command runs the API; the worker service overrides this in compose.
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
