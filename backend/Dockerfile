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
# Disable Prisma's update check so it never attempts a network write at runtime
# (the node_modules tree is owned by root / read-only for the app user).
ENV CHECKPOINT_DISABLE=1

# dumb-init gives us proper PID-1 signal handling for graceful shutdown;
# openssl is required by the Prisma query engine at runtime.
RUN apk add --no-cache dumb-init openssl

# Production node_modules, compiled output, and the Prisma schema/engine.
# In this npm workspace the generated Prisma client is hoisted to the ROOT
# node_modules/.prisma, so we copy it from there.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
# The Prisma CLI (a dev dep) is needed at runtime for `migrate deploy`, so copy
# it, its `prisma` binary, and the migration/query engines from the builder.
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma/engines ./node_modules/@prisma/engines
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY backend/package.json ./backend/
COPY package.json ./

# Entrypoint runs migrations + conditional seed, then execs the given command.
COPY backend/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Run as the built-in unprivileged user.
USER node

WORKDIR /app/backend
EXPOSE 4000

# dumb-init handles signals; the entrypoint script runs migrations + conditional
# seed (when RUN_MIGRATIONS=true) before exec-ing the command below. The worker
# service overrides CMD with the worker process and leaves RUN_MIGRATIONS unset.
ENTRYPOINT ["dumb-init", "--", "docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
