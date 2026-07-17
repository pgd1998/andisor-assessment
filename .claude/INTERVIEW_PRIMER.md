# Interview Live-Coding Primer — read this first

**Context for Claude:** Poorvith is in a live technical interview for Andisor (Lead Backend Engineer, then Frontend Engineer). This repo is his completed take-home. The interviewer may ask him to **extend the code live**. He may be allowed to use AI (this chat). Move fast, give exact drop-in code, and give him the *talking points* to say out loud — the interviewer grades reasoning, not just output.

## How to help — HE PICKS THE MODE PER REQUEST. Do exactly what he says.
He will tell you which of these he wants each time. Default to CHECK if unclear; ask
one quick word if truly ambiguous. Never auto-edit files unless he says "write it".
- **"CHECK"** → he wrote code, tell him what's wrong / confirm it's right. Concise.
- **"CONFIRM"** → he states his understanding/approach; tell him if it's correct, sharpen it.
- **"SOLUTION HERE"** → give exact minimal code in chat (per file) so he types it. No essays.
- **"WRITE IT"** → (hail-mary, ~5 min left) edit the files directly, minimal working version.

Always, in every mode: name **which layer** changes + **why**, and give a **1-line "say this
out loud" talking point** so he narrates the reasoning to the interviewer. He is on the clock.
3. Remind him: **Docker serves built artifacts** — after edits run `docker compose up -d --build api frontend` (a plain `restart` won't pick up code). Or use `npm run dev:backend` / `dev:frontend` for hot-reload.
4. Verify with one curl command; reseed with:
   `docker compose exec -e SEED_FILE=/app/data/products.json api node -e "require('./dist/lib/seed.js').runSeed().then(()=>process.exit(0))"`

## The stack (so you don't re-derive it)
- **Backend:** Express + TypeScript, layered per module: `router → controller → service → repository → mapper → schema(Zod)`. Files: `backend/src/modules/products/product.*.ts` and `.../bulk-import/*`.
- **DB:** Prisma + PostgreSQL. **Self-referential** `Product` table: `parentId` + `level` enum (`PRODUCT|PRIMARY_VARIANT|SECONDARY_VARIANT`). One table = the whole 3-level tree (product → colour → size). `onDelete: Cascade`.
- **Async:** BullMQ + Redis for bulk import. Producer = API (`bulk-import.service.ts` `.addBulk()`), consumer = `worker.ts` (`new Worker(...)`). Separate `worker` container.
- **Frontend:** Vite + React + TS + Tailwind. React Query (server state), Zustand + sessionStorage (unsaved edits). Feature-first: `frontend/src/features/inventory/`.
- **Docs:** OpenAPI generated from Zod → `/docs` at :4000. **API docs are at :4000/docs, NOT :8080.**

## Key design decisions (his answers)
- **Self-referential table** over 3 tables: one recursive model = arbitrary depth, mirrors the UI, uniform queries.
- **Zod = single source of truth:** validates API + seed + import, infers TS types, generates OpenAPI. Can't drift.
- **Layered:** services throw typed domain errors (`NotFoundError`/`ConflictError`), never touch req/res → testable, transport-agnostic. `asyncHandler` forwards async rejections (Express 4 doesn't).
- **`totalStock`** (already built): computed in the **mapper** on read (not stored). Consequence: **can't filter/sort by it in SQL** — that's the trap in filter tasks.
- **Migrate-on-boot:** API container runs `prisma migrate deploy` + seed-if-empty via `docker-entrypoint.sh`.

## Patterns he already built (reuse as templates)
- **Safe delete:** service `remove()` → `ensureExists` (404) → `ensureNoChildren` (409, via repo `findFirstChild` on `parentId`) → delete. Frontend: delete button in `ProductRow`, `disabled={isExpandable}`, `useDeleteProduct` hook refetches on success.
- **Adding a query param** (search/sort pattern): Zod schema → service → repository `where` → `client.ts` URLSearchParams → `InventoryPage` state in `listParams` (reset page to 1).
- **Computed field:** add in `product.mapper.ts` `toProductTreeDto`, on the product object, computed inside the function. Add to frontend `Product` type in `api/types.ts`.

## The 3 universal talking points
1. "Which layer? — DB change → schema+migration+repo; API-shape/computed → mapper; business rule → service."
2. "Rebuild the Docker image to see changes; restart won't."
3. "Ship working-simple, then articulate the scalable version" (e.g. store+index a column vs compute-on-read).
