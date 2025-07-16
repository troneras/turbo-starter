# 🚀 Unified CMS & Translation Platform Monorepo

A high-performance, extensible platform for **multi-brand, multi-jurisdiction, multilingual content and translation management**—designed for regulated industries and global products.

---

## 🧭 **What Are We Building?**

This project is the **single source of truth** for all product content, translations, releases, and localization assets across all brands, languages, and jurisdictions.

We are solving problems typical CMSs and TMSs can’t:

- **Atomic Content Releases:** Bundle translations, content entries, SEO, and assets—deploy or rollback together.
- **Multi-brand Personalization:** Fine-grained overrides for brands, jurisdictions, and features.
- **Workflow & Audit:** Structured workflow (draft → review → QA → deploy), deep audit logs, and compliance.
- **Feature Flags & Dark Launch:** Decouple code and content, test new features and content safely.
- **Scalable Integrations:** API-first design, ready for SDKs, automation, AI-driven translation, and migration from legacy platforms.

Our goal: **Empower teams to move fast and safely, with transparency and flexibility.**

---

## 🏗️ **Monorepo Structure**

```
.
├── apps/
│   └── api/         # Fastify REST API, background jobs, all business logic
├── packages/
│   └── db/          # Database migrations, schema, and seeding
├── docker-compose.yml
├── bun.lock
├── package.json     # Monorepo scripts/deps
└── turbo.json       # Turborepo config
```

- **apps/api:**
  - REST API (Fastify + Bun) — handles all business logic, RBAC, workflow, content release, and serves OpenAPI docs.
  - Background worker for async jobs (AI, releases, notifications).
  - Plug-and-play plugins for DB, Redis, security, docs, etc.

- **packages/db:**
  - **Drizzle ORM** schema and migrations (Postgres).
  - Database seeds, meta, and config.

---

## ⚡ **Tech Stack**

- **Node.js 18+ / Bun** — Fast builds, modern TS, ESM.
- **Fastify** — High-performance API framework.
- **TypeBox** — Schema validation and TypeScript type generation.
- **PostgreSQL** — Scalable, relational source of truth.
- **Redis** — Caching, job queue, speed.
- **Drizzle ORM** — Type-safe, SQL-first migrations and queries.
- **Swagger/OpenAPI** — Self-documenting APIs.
- **TurboRepo** — Monorepo orchestration, fast CI.

---

## 🧩 **Key Features**

- **Multi-brand & Multilingual**: Override content and translations at any level (global/brand/jurisdiction).
- **Content & Translation Releases**: Atomic, auditable, and roll-back-able.
- **Feature Flags**: Control content visibility for dark launches or staged rollouts.
- **Workflow**: Draft, review, QA, deploy, rollback—every step logged and permissioned.
- **AI-Ready**: Easy integration for AI-powered translation and glossary bootstrapping.
- **Extensible**: Designed to add CMS content, SEO, asset management, and new features as you scale.

---

## 🏃‍♂️ **Getting Started**

### Prerequisites

- [Bun](https://bun.sh/) (JS runtime & package manager)
- PostgreSQL & Redis running (see `docker-compose.yml`)

### Bootstrap

```bash
# Install monorepo dependencies
bun install

# Copy and update environment config
cp .env.example .env
```

### Develop

```bash
# Run API in dev mode
bun run --filter=api dev

# Run DB migrations
bun run --filter=db migrate

# Seed database (optional)
bun run --filter=db seed
```

- API available at [http://localhost:3000](http://localhost:3000)
- Swagger docs at [http://localhost:3000/documentation](http://localhost:3000/documentation)

---

## 📦 **Project Structure Reference**

- `apps/api/src/` — API, routes, plugins, worker
  - `schemas/` — TypeBox schemas organized by domain + common reusable schemas
  - `routes/api/` — Route handlers with inline schema definitions for clarity
  - `plugins/` — Fastify plugins (external infrastructure + app business logic)
- `packages/db/` — Migrations, schema, seeds

---

## 🛠️ **Contributing**

- Follow our [commit style](#).
- Run `bun test` and `bun run check-types` before submitting PRs.
- Open discussions for architectural proposals or major migrations.

### API Development
- Use custom commands for consistent patterns:
  - `/refactor-api-endpoint` - Refactor existing endpoints to use TypeBox
  - `/write-api-route` - Create new API routes following best practices
- Follow TypeBox schema organization patterns (see `CLAUDE.md` for details)
- Use `@fastify/error` for precise error schema definitions and idiomatic error handling

---

## 🌍 **Vision**

This platform will power our **global content & translation infrastructure** for years to come, supporting new markets, brands, regulatory requirements, and emerging technologies.
It is **API-first, workflow-centric, and designed for extension**—with an initial focus on translations and releases, and a clear path to CMS, SEO, asset, and component management.
