#!/bin/sh
# Backend container entrypoint.
#
# On start-up it applies any pending Prisma migrations (idempotent — a no-op when
# the schema is already current), seeds the catalogue once if it is empty, then
# hands off to the container's command (the API server or the worker).
#
# Only the API runs migrations/seed (RUN_MIGRATIONS=true); the worker skips this
# so the two containers never race on the same migration.
set -e

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "[entrypoint] Applying database migrations…"
  npx prisma migrate deploy

  # Seeds only when the catalogue is empty, so restarts never clobber data.
  node dist/scripts/seed-if-empty.js
fi

echo "[entrypoint] Starting: $*"
exec "$@"
