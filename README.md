# 🚀 Unified CMS & Translation Platform Monorepo

A high-performance, extensible platform for **multi-brand, multi-jurisdiction, multilingual content and translation management**—designed for regulated industries and global products.

---

## 🧭 **What Are We Building?**

This project is the **single source of truth** for all product content, translations, releases, and localization assets across all brands, languages, and jurisdictions.

We are solving problems typical CMSs and TMSs can’t:

- **Atomic Content Releases:** Bundle translations, content entries, SEO, and assets—deploy or rollback together using Git-like branching.
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
│   ├── api/         # Fastify REST API, background jobs, all business logic
│   └── admin/       # Admin UI (Vite + React + TanStack ecosystem)
├── packages/
│   ├── db/          # Database migrations, schema, and seeding
│   └── contracts/   # Shared TypeBox schemas and types between API and UI
├── docker-compose.yml
├── bun.lock
├── package.json     # Monorepo scripts/deps
└── turbo.json       # Turborepo config
```

- **apps/api:**
  - REST API (Fastify + Bun) — handles all business logic, RBAC, workflow, content release, and serves OpenAPI docs.
  - Background worker for async jobs (AI, releases, notifications).
  - Plug-and-play plugins for DB, Redis, security, docs, etc.

- **apps/admin:**
  - Modern React admin interface built with Vite and the TanStack ecosystem.
  - Features domain-driven architecture with feature-based modules.
  - MSAL authentication, RBAC authorization, and comprehensive UI components.
  - Route-centric code-splitting and TanStack Query for server state management.

- **packages/db:**
  - **Drizzle ORM** schema and migrations (Postgres).
  - Database seeds, meta, and config.

- **packages/contracts:**
  - **Shared TypeBox schemas** and TypeScript type definitions used by both API and admin UI.
  - Organized into separate `schemas/` (validation) and `types/` (TypeScript types) directories.
  - Types include comprehensive TSDoc documentation for better developer experience.
  - Ensures type safety and consistency across the entire platform.
  - Single source of truth for request/response types and validation schemas.

---

## 🎨 **Admin UI Architecture**

The admin application follows a **feature-driven, domain-centric architecture** designed for scalability and maintainability:

### 📁 **Directory Structure**

```
apps/admin/
├── public/            # Static assets copied as‑is → dist/
├── src/
│   ├── app/           # Top‑level app wiring
│   │   ├── providers/ # Context + TanStack Query, MSAL, RBAC
│   │   ├── router/    # TanStack Router route tree & loaders
│   │   ├── hooks/     # Shared hooks (useAuth, usePermissions, etc.)
│   │   ├── layouts/   # Shell, sidebar, auth guard layouts
│   │   └── main.tsx   # ReactDOM entry point
│   │
│   ├── features/      # Domain modules (one folder per bounded context)
│   │   ├── auth/      # Authentication & authorization
│   │   ├── users/     # User management
│   │   ├── brands/    # Brand management
│   │   ├── translations/ # Translation workflows
│   │   ├── releases/  # Release management
│   │   ├── feature‑flags/ # Feature flag controls
│   │   └── glossary/  # Glossary management
│   │
│   ├── components/    # Shared UI widgets (buttons, modals, tables)
│   ├── lib/           # Utilities: date, axios, i18n, RBAC helpers
│   ├── types/         # TypeScript types (generated from OpenAPI)
│   └── styles/        # Tailwind base + shadcn/ui overrides
│
├── tests/             # Unit/integration tests (bun test)
└── vite.config.ts     # Build configuration
```

### 🏛️ **Architectural Conventions**

- **Route-centric code-splitting**: Each `features/*/pages/` exports lazy-loaded TanStack Router routes
- **TanStack Query**: All API calls in `features/*/hooks/useXxxQuery.ts` with automatic token management
- **RBAC integration**: `useHasRole('admin')` guards and `<RequireRole>` wrapper components
- **shadcn/ui + Tailwind**: Design system with theme customization in `tailwind.config.ts`
- **MSAL authentication**: Azure AD integration with `api://cms-scope` token scope
- **Shared type contracts**: TypeBox schemas from `@cms/contracts` ensure API/UI type consistency

### 🎯 **Key Features**

- **Feature-based organization**: Each domain (users, brands, translations) owns its pages, hooks, and components
- **Comprehensive RBAC**: Role-based access control integrated at component and route levels
- **Modern UI/UX**: Built with shadcn/ui components and Tailwind CSS for consistent, accessible design
- **Performance optimized**: Code-splitting, lazy loading, and efficient state management
- **End-to-end type safety**: Shared TypeBox contracts eliminate type drift between API and UI
- **Testing ready**: Configured with React Testing Library, MSW for API mocking

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
- **Content & Translation Releases**: Atomic, auditable, and roll-back-able using Git-like branching system.
- **Feature Flags**: Control content visibility for dark launches or staged rollouts.
- **Workflow**: Draft, review, QA, deploy, rollback—every step logged and permissioned.
- **AI-Ready**: Easy integration for AI-powered translation and glossary bootstrapping.
- **Extensible**: Designed to add CMS content, SEO, asset management, and new features as you scale.

### 🚀 Release Management System

The platform implements a sophisticated **Git-like branching model** for content management:

- **Edition-Based Design**: Every change is made within a "release" (similar to a Git branch)
- **Atomic Deployments**: Deploy all changes in a release together, or none at all
- **Instant Rollback**: Switch back to any previously deployed release instantly
- **Release Context**: View and edit content within any open or deployed release
- **Deploy Sequence**: Monotonic ordering ensures consistent deployment history
- **Zero-Downtime**: Session-based release switching with PostgreSQL session variables

#### How It Works:

1. **Create a Release**: Start a new release based on the current production state
2. **Make Changes**: All content edits are versioned within that release
3. **Preview & Test**: View the release in isolation before deployment
4. **Deploy**: Atomically deploy all changes to production
5. **Rollback**: Instantly revert to any previous release if needed

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

# Run admin UI in dev mode
bun run --filter=admin dev

# Run DB migrations
bun run --filter=db migrate

# Seed database (optional)
bun run --filter=db seed

# Build shared contracts (if needed)
bun run --filter=contracts build
```

- API available at [http://localhost:3000](http://localhost:3000)
- Swagger docs at [http://localhost:3000/documentation](http://localhost:3000/documentation)

---

## 📦 **Project Structure Reference**

- `apps/api/src/` — API, routes, plugins, worker
  - `routes/api/` — Route handlers importing schemas from contracts package
  - `plugins/` — Fastify plugins (external infrastructure + app business logic)
- `packages/contracts/` — Shared TypeBox schemas and TypeScript types
  - `schemas/` — TypeBox schema definitions for validation
  - `types/` — TypeScript type definitions with TSDoc documentation
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
