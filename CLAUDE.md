# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Monorepo with **two independent applications** in separate folders, each with its own `package.json`:

- **`frontend/`** — React + Vite + Tailwind. Contains (a) a marketing **landing** (`index.html` / `src/App.jsx`) that sells via WhatsApp and calls no API, and (b) a **checkout demo** (`checkout.html` / `src/checkout/`) that DOES call the backend API over `fetch`. Vite is configured multi-page (both `.html` files are build inputs in `vite.config.js`). The checkout's API base URL comes from `VITE_API_URL` (`src/checkout/api.js`), defaulting to `http://localhost:3000/api` when unset.
- **`backend/`** — Node + TypeScript + Express + Prisma (PostgreSQL) + Redis. A headless e-commerce REST API.

The two are **not wired together in production** — the landing's "Comprar" button redirects to `checkout.html`, which is the only part that hits the backend. Don't assume the landing consumes the API.

Root docs worth reading: `README.md` (monorepo overview) and `ARCHITECTURE.md` (backend design + a traced request example).

## Commands

All backend commands run from `backend/`, all frontend commands from `frontend/`. The
repo root also has a `package.json` with `npm run dev` (runs both dev servers at once
via `concurrently`, prefixed `[backend]`/`[frontend]` in the log) and `npm run install:all`
— convenience only, it does not wire the two apps together (see above).

**Backend:**
```bash
npm run dev                 # API with hot reload (tsx watch) on :3000
npm run build               # compile to dist/
npm test                    # all tests (integration needs a live DB)
npm run test:unit           # unit tests only — no DB/Redis needed, fast
npm run test:integration    # integration tests — needs migrated Postgres
npm run lint                # eslint
npm run typecheck           # tsc --noEmit
npm run prisma:migrate      # create+apply migrations (dev)
npm run prisma:deploy       # apply migrations non-interactively (prod/CI)
npm run prisma:seed         # idempotent seed (admin, brands, categories, products, coupon)

# run a single unit test file / test name:
npx jest tests/unit/orders/checkout.test.ts
npx jest -t "aplica cupón porcentual"
```

**Frontend:** `npm run dev` (:5173), `npm run build`, `npm run preview`. No tests.

**Full test stack (db + redis + API + frontend + a fake Mercado Pago):** from the repo root, `docker compose up --build`, then http://localhost:5173. It brings up the whole store so a purchase can be walked end to end: the checkout redirects to `scripts/mercadopago-falso.mjs`, which signs the webhook exactly as Mercado Pago would. Test-only — the root compose carries throwaway secrets and `NODE_ENV=development` on purpose, and `env.ts` refuses that combination under `NODE_ENV=production`.

**Backend only (Postgres + Redis + API):** from `backend/`, `docker compose up --build` (migrates + seeds + starts), reading real credentials from `backend/.env`.

Docker Desktop on this Windows machine lives at `%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe`, not under `Program Files`; WSL2 has Ubuntu installed and the engine works once the app is launched. Unit tests, typecheck, lint, and both builds still run without Docker; only integration tests and a live backend need it.

## Backend architecture (the important part)

**Clean/hexagonal, modular by domain.** Each domain lives in `backend/src/modules/<name>/` with four layers and a strict dependency rule — `interfaces/http → application → domain ← infrastructure`. The domain never imports Express/Prisma/Redis.

```
modules/<domain>/
  domain/          entities + ports (interfaces) + pure business rules. Zero framework imports.
  application/      use cases; receive dependencies via constructor (fully unit-testable with in-memory fakes).
  infrastructure/   concrete adapters implementing the ports (Prisma repos, bcrypt, JWT, Redis).
  interfaces/http/  controllers, Zod DTOs, per-module OpenAPI fragment.
  <domain>.module.ts   composition root: wires adapters → use cases → controllers → Express Router.
```

Modules: `auth`, `catalog` (products/categories/brands), `cart`, `orders` (checkout + addresses), `payments`, `coupons` (admin CRUD — checkout-time redemption logic itself lives in `orders`), `reviews` (verified-purchase, auto-approved), `admin` (sales/top-products/orders-by-status reports). Cross-cutting code is in `backend/src/shared/` (`config/env.ts`, `database/prisma.ts`, `cache/redis.ts`, `errors/`, `logger/`, `middlewares/`, `docs/openapi.ts`). `src/routes.ts` mounts every module's router; `src/app.ts` assembles the Express app (`createApp(prisma)` takes Prisma by param so tests can inject a test DB); `src/main.ts` boots.

**Conventions that matter when adding code:**
- Use **relative imports** — path aliases are intentionally not configured (keeps tsx/jest/tsc/docker resolution simple).
- Use cases throw **domain errors** from `shared/errors/AppError` (`BadRequestError`, `ConflictError`, `NotFoundError`, …), never HTTP codes. The central `errorHandler` maps them (and known Prisma errors P2002/P2003/P2025) to responses.
- A new HTTP module = build the four layers, register its Router in `routes.ts`, and `import` its `*.openapi.ts` there (Swagger is assembled by import side-effects, served at `/api/docs`).
- New domain/business logic must come with **unit tests** using in-memory fakes (see `tests/unit/<domain>/fakes.ts`), especially stock/checkout/coupon/payment logic.

**Non-obvious design decisions (don't "simplify" these away):**
- **Stock is decremented atomically** in the checkout transaction via `updateMany({ where: { id, stock: { gte: qty } } })` + count check — race-safe without locks. Coupon `maxUses` uses the same conditional-update pattern.
- **Catalog cache invalidation is version-namespaced**: keys are `catalog:v{N}:…` and `invalidate()` does a single `INCR` (never `KEYS`). The cache is fault-tolerant (degrades to no-cache if Redis is down); the guest cart store is not.
- **Auth** uses JWT access tokens (HS256, algorithm pinned on verify) + opaque refresh tokens (stored hashed, rotated on use, reuse rejected).
- **Payment webhooks** are verified by HMAC-SHA256 (`x-signature`) and are idempotent; the whole payment provider layer is a **stub per method** (Nequi/Daviplata/CreditCard) ready to swap for a real gateway.
- **`env.ts` validates all config with Zod at startup and fails fast.** In `NODE_ENV=production` it additionally refuses insecure defaults (`PAYMENTS_WEBHOOK_SECRET`, `ADMIN_PASSWORD`) and `CORS_ORIGIN=*`. Adding a new env var means adding it here first.

## CI

`.github/workflows/backend-ci.yml` runs the backend suite (unit + integration) against real Postgres/Redis services on every push — mirror that when changing test setup or env requirements.

## Database & migrations

Schema is `backend/prisma/schema.prisma` (money as `Decimal(12,2)`, currency COP; snapshots stored on `Order`/`OrderItem`). The initial migration was generated with `prisma migrate diff --from-empty` (no DB required) — that technique works to author migrations here without a running database. The seed is idempotent (upserts), safe to re-run.

## Language

Code comments, commit-style messages, and user-facing strings/errors are in **Spanish**. Match that when editing.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
