# Andisor — Inventory Platform

A full-stack product inventory system built for the Andisor assessment.

- **Backend** — Express + TypeScript CRUD API over a three-level product
  hierarchy (Product → Colour variant → Size variant), persisted with
  **Prisma + PostgreSQL**, plus an **asynchronous bulk-import** endpoint backed
  by a **BullMQ (Redis)** queue.
- **Frontend** — a **Vite + React + TypeScript** inventory page with a nested
  expand/collapse table, **inline editing at every level**, **5-per-page
  pagination**, and **session-persisted edits** (they survive a refresh).
- **One-command run** — `docker compose up --build` brings up the whole stack.

The UI is themed to the [andisor.com](https://andisor.com) brand palette.

---

## Table of contents

- [Quick start (Docker)](#quick-start-docker)
- [Architecture](#architecture)
- [Local development](#local-development-without-docker-for-the-app)
- [API reference](#api-reference)
- [Environment variables](#environment-variables)
- [Testing & quality](#testing--quality)
- [Project structure](#project-structure)
- [Design decisions](#design-decisions)
- [Improvements & innovations](#improvements--innovations)

---

## Quick start (Docker)

**Prerequisites:** Docker + Docker Compose (Docker Desktop on macOS/Windows).

```bash
# From the repository root:
cp .env.example .env        # optional — sane defaults are baked in
docker compose up --build
```

That single command starts **five services**:

| Service    | Description                                  | URL / Port              |
| ---------- | -------------------------------------------- | ----------------------- |
| `frontend` | React UI served by nginx                     | http://localhost:8080   |
| `api`      | Express REST API                             | http://localhost:4000   |
| `worker`   | BullMQ background job processor              | (internal)              |
| `postgres` | PostgreSQL 16                                | localhost:5432          |
| `redis`    | Redis 7 (queue backing store)                | localhost:6379          |

On first boot the **API container applies database migrations and seeds the
catalogue automatically** (10 products, 30 colour variants, 120 size variants) —
no manual steps. On restart it applies only *new* migrations and skips seeding
if data already exists, so your changes are never clobbered.

Open **http://localhost:8080** and you're in.

- API docs (Swagger UI): **http://localhost:4000/docs**
- Health check: **http://localhost:4000/health**

To tear everything down (including volumes):

```bash
docker compose down -v
```

> **Port conflicts?** If `5432`/`6379`/`8080`/`4000` are in use, override them in
> `.env` (`POSTGRES_PORT`, `REDIS_PORT`, `FRONTEND_PORT`, `API_PORT`).

---

## Architecture

```
                    ┌─────────────┐        HTTP        ┌──────────────┐
   Browser ───────▶ │  frontend   │ ─────/api proxy──▶ │     api      │
                    │  (nginx)    │                    │  (Express)   │
                    └─────────────┘                    └──────┬───────┘
                                                              │
                            enqueue job (202 Accepted)        │  Prisma
                                                              ▼
                    ┌─────────────┐   BullMQ jobs      ┌──────────────┐
                    │   worker    │ ◀──────────────────│    redis     │
                    │  (BullMQ)   │                    └──────────────┘
                    └──────┬──────┘
                           │  Prisma (create products)
                           ▼
                    ┌──────────────┐
                    │   postgres   │
                    └──────────────┘
```

**Why a separate worker?** The bulk-import endpoint accepts a file, enqueues one
job per product, and returns `202 Accepted` **immediately** — it never waits for
creation. A dedicated worker process (its own container) drains the queue and
creates the products. This keeps the API responsive under large imports, which
is the core requirement of the async task.

**The data model** is a single self-referential `Product` table (`parentId` +
`level` enum: `PRODUCT | PRIMARY_VARIANT | SECONDARY_VARIANT`). One recursive
model captures the whole tree, mirrors the recursive UI exactly, and keeps
queries/imports uniform. See [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma).

**Backend layering** (per module): `router → controller → service → repository`,
with a `mapper` translating between the flat DB rows and the nested API shape,
and `schema` (Zod) as the single source of truth for validation.

---

## Local development (without Docker for the app)

Run PostgreSQL and Redis in containers, but the API/worker/frontend on your host
for fast iteration.

```bash
# 1. Install dependencies (npm workspaces — installs backend + frontend)
npm install

# 2. Start just the database and Redis
npm run infra:up            # docker compose up -d postgres redis

# 3. Configure env for host-run services
cp .env.example .env
#    Then edit .env: change the `postgres`/`redis` hostnames in DATABASE_URL and
#    REDIS_URL to `localhost` (they default to the Docker service names).

# 4. Set up the database
npm --workspace backend run db:migrate      # apply migrations
npm --workspace backend run db:seed         # seed the catalogue

# 5. Run the app (in separate terminals)
npm run dev:backend         # API at http://localhost:4000
npm --workspace backend run dev:worker      # BullMQ worker
npm run dev:frontend        # UI at http://localhost:5173 (proxies /api → :4000)
```

Stop the infra with `npm run infra:down`.

> If ports 5432/6379 are taken locally, set `POSTGRES_PORT`/`REDIS_PORT` in
> `.env` and update `DATABASE_URL`/`REDIS_URL` to match.

---

## API reference

Base URL: `http://localhost:4000/api`. Interactive docs at `/docs`.

| Method   | Endpoint                          | Description                                             |
| -------- | --------------------------------- | ------------------------------------------------------ |
| `GET`    | `/products`                       | Paginated list of products (`?page=&pageSize=&search=`, default 5/page) |
| `POST`   | `/products`                       | Create a product with nested variants                  |
| `GET`    | `/products/:id`                   | A single product with its full variant subtree         |
| `PATCH`  | `/products/:id`                   | Update **any** attribute of **any** node (product or variant) |
| `DELETE` | `/products/:id`                   | Delete a node (cascades to its subtree)                |
| `POST`   | `/products/bulk-import`           | Enqueue a batch of products (JSON body **or** file upload) → `202` |
| `GET`    | `/products/bulk-import/:batchId`  | Poll a bulk-import batch's status                      |
| `GET`    | `/health`                         | Liveness probe                                         |

**List response** shape:

```jsonc
{
  "data": [ /* products, each with nested primaryVariants[].secondaryVariants[] */ ],
  "meta": { "page": 1, "pageSize": 5, "total": 10, "totalPages": 2,
            "hasNextPage": true, "hasPreviousPage": false }
}
```

**Bulk import** — the fast path:

```bash
# Returns 202 immediately with a batchId; the worker creates products async.
curl -X POST http://localhost:4000/api/products/bulk-import \
  -F "file=@data/products.json;type=application/json"

# Poll progress:
curl http://localhost:4000/api/products/bulk-import/<batchId>
```

---

## Environment variables

All variables are documented in [`.env.example`](.env.example) with defaults.
The key ones:

| Variable            | Default (Docker)                          | Purpose                              |
| ------------------- | ----------------------------------------- | ------------------------------------ |
| `DATABASE_URL`      | `postgresql://…@postgres:5432/andisor`    | Prisma connection string             |
| `REDIS_URL`         | `redis://redis:6379`                      | BullMQ backing store                 |
| `API_PORT`          | `4000`                                    | API listen port                      |
| `FRONTEND_PORT`     | `8080`                                    | Host port for the UI                 |
| `CORS_ORIGIN`       | `http://localhost:8080`                   | Allowed CORS origins (comma list)    |
| `RATE_LIMIT_MAX`    | `300`                                     | Requests per window per IP           |
| `VITE_API_BASE_URL` | `/api`                                    | API base the browser calls           |

Environment is validated at boot with Zod ([`backend/src/config/env.ts`](backend/src/config/env.ts)) —
the app fails fast with a readable error if anything is missing or malformed.

---

## Testing & quality

```bash
# Everything (both workspaces) — requires postgres + redis running (npm run infra:up)
npm test
npm run lint
npm run typecheck
npm run format:check
```

- **Backend** — 23 tests (Vitest + supertest): e2e coverage of every endpoint
  (happy + error paths), the async bulk-import flow verified end-to-end with an
  in-process worker, plus mapper/schema units.
- **Frontend** — 10 tests (Vitest + Testing Library): 3-level expand/collapse,
  inline edit commit/cancel/validation, and session-persistence rehydration.
- Strict TypeScript, ESLint, and Prettier are enforced across both packages.

---

## Project structure

```
andisor-assessment/
├── docker-compose.yml          # 5 services: frontend, api, worker, postgres, redis
├── .env.example                # documented environment reference
├── data/products.json          # seed dataset (the source JSON)
├── backend/
│   ├── Dockerfile              # multi-stage; shared by api + worker
│   ├── docker-entrypoint.sh    # migrate + seed-if-empty on boot, then exec
│   ├── prisma/schema.prisma    # self-referential Product model
│   └── src/
│       ├── app.ts / server.ts / worker.ts
│       ├── config/ lib/ middleware/
│       └── modules/
│           ├── products/       # router→controller→service→repository→mapper→schema
│           ├── bulk-import/     # queue producer + worker processor
│           └── health/
└── frontend/
    ├── Dockerfile              # Vite build → nginx (+ /api reverse proxy)
    └── src/
        ├── api/                # typed client + React Query hooks
        ├── store/              # Zustand session-persisted edit store
        └── features/inventory/ # nested table, inline cells, pagination
```

---

## Design decisions

- **Self-referential product model** — one recursive table for arbitrary variant
  depth instead of three parallel tables; mirrors the recursive UI and keeps
  imports uniform.
- **Zod as the single source of truth** — the same schemas validate API DTOs,
  the seed file, and bulk-import payloads, so validation never drifts.
- **Layered backend** — thin controllers, business logic in services,
  persistence isolated in repositories; easy to test and to swap out.
- **Async by design** — bulk import returns `202` with a queryable `batchId`;
  jobs retry with exponential backoff; a dedicated worker keeps the API fast.
- **Optimistic inline editing** — edits update the React Query cache instantly
  and `PATCH` the server, rolling back on failure. They're also written to
  `sessionStorage`, so a refresh preserves them.
- **Migrate-on-boot** — the API container runs `prisma migrate deploy` (idempotent)
  and seeds an empty DB at startup, so `docker compose up` needs zero manual steps.

---

## Improvements & innovations

Enhancements delivered beyond the brief, and ideas for where this would go next.

**Delivered**

1. **Layered, testable architecture** (router → controller → service → repository).
2. **Zod-driven validation** shared across API, seed, and imports.
3. **Async bulk import returns `202` + a pollable batch status** — real job
   semantics, not fire-and-forget.
4. **Optimistic UI + session persistence** — instant edits that survive refresh.
5. **Structured logging** (pino) and **centralized typed error handling** with a
   consistent JSON error envelope.
6. **Self-documenting API** via Swagger UI at `/docs`.
7. **Accessibility** — keyboard-navigable expand/collapse and inline edit, ARIA
   roles, and a `role="switch"` toggle.
8. **Brand-faithful theming** — palette extracted from andisor.com, exposed as
   both Tailwind tokens and CSS variables for easy re-theming.
9. **Full one-command Docker orchestration** with healthchecks, ordered startup,
   and idempotent migrate-on-boot.

**Next steps (not built)**

1. **Live import progress** via Server-Sent Events / WebSocket (per-batch bar).
2. **Optimistic concurrency** (`updatedAt` version checks) to reconcile concurrent
   edits between the session store and the server.
3. **Undo/redo** for inline edits, leveraging the existing edit store.
4. **CSV/XLSX import** with a dry-run validation preview.
5. **Audit log** of every field change (who / what / when).
6. **Row virtualization** for very large catalogues.
7. **Auth & RBAC** (JWT) and **idempotency keys** on create/bulk endpoints.
8. **Dead-letter queue** with an admin retry view for failed import jobs.

---

## Notes

- Base-image CVEs reported by scanners originate from upstream `node:alpine` /
  `nginx:alpine` and are out of scope to fully remediate for this exercise.
- Dev-only audit warnings (Vite/Vitest transitive) don't ship in the production
  build.
