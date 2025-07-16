# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a **monorepo** for a CMS & Translation Platform built with:
- **TurboRepo** for monorepo management
- **Bun** runtime and package manager
- **Fastify** API framework with plugin architecture
- **PostgreSQL** with **Drizzle ORM**
- **Redis** for caching and job queuing

### Core Structure

```
apps/
├── api/          # Main Fastify API server
│   ├── src/
│   │   ├── plugins/
│   │   │   ├── external/    # Infrastructure plugins (db, redis, auth, etc.)
│   │   │   └── app/         # Business logic plugins (brands, translations, etc.)
│   │   ├── routes/          # API route handlers
│   │   ├── lib/             # Shared utilities (config, logger, utils)
│   │   ├── app.ts           # App factory with plugin registration
│   │   ├── server.ts        # Server startup
│   │   └── worker.ts        # Background job worker
│   └── test/
packages/
└── db/           # Database schema, migrations, and utilities
    ├── schema/   # Drizzle schema definitions
    ├── migrations/ # Database migrations
    └── seed.ts   # Database seeding
```

## Common Development Commands

### Root-level commands (using Turbo):
- `bun run dev` - Start API in development mode
- `bun run build` - Build all packages
- `bun run lint` - Run linting across all packages
- `bun run check-types` - TypeScript type checking
- `bun run format` - Format code with Prettier
- `bun run db:generate` - Generate database migrations
- `bun run db:migrate` - Run database migrations

### API-specific commands:
- `bun run --filter=api dev` - Start API server in watch mode
- `bun run --filter=api test` - Run API tests
- `bun run --filter=api build` - Build API server
- `bun run --filter=api start` - Start production server
- `bun run --filter=api worker` - Start background worker

### Database commands:
- `bun run --filter=db db:generate` - Generate new migration
- `bun run --filter=db db:migrate` - Apply migrations
- `bun run --filter=db seed` - Seed database

## Key Architecture Patterns

### Plugin System
The API uses Fastify's plugin architecture with two main categories:
- **External plugins** (`plugins/external/`): Infrastructure concerns (DB, Redis, Auth, Security)
- **App plugins** (`plugins/app/`): Business logic (Brands, Translations, Users, Workflow)

### Database Design
Multi-tenant architecture supporting:
- **Brands** - Different product brands
- **Locales** - Languages/regions
- **Jurisdictions** - Legal/regulatory regions
- **Translations** - Content with brand/jurisdiction/locale specificity
- **Releases** - Atomic deployments with rollback capability
- **Feature Flags** - Content visibility control

### API Structure
- Routes organized by domain (`/api/brands`, `/api/translations`, etc.)
- Health check endpoint at `/health`
- Auto-generated OpenAPI docs at `/documentation`
- Webhook endpoints for external integrations

## Development Environment

### Prerequisites
- Bun runtime (package manager and runtime)
- PostgreSQL and Redis (via `docker-compose.yml`)
- Node.js 18+ (fallback runtime)

### Local Setup
1. `bun install` - Install dependencies
2. `cp .env.example .env` - Configure environment
3. Start services with `docker-compose up -d`
4. Run migrations: `bun run db:migrate`
5. Start API: `bun run dev`

### Environment Configuration
- API runs on port 3000 by default
- Configuration via environment variables (handled by `@fastify/env`)
- Swagger documentation available at `/documentation`

## Database Workflow

### Schema Changes
1. Modify schema in `packages/db/schema/index.ts`
2. Generate migration: `bun run db:generate`
3. Apply migration: `bun run db:migrate`

### Key Tables
- `translations` - Core content with hierarchical overrides
- `releases` - Atomic deployment tracking
- `feature_flags` - Content visibility control
- `users` + `roles` - RBAC system
- `brands` + `locales` + `jurisdictions` - Multi-tenant structure

## Testing & Quality

- Tests: `bun test` (uses Bun's built-in test runner)
- Type checking: `bun run check-types`
- Linting: `bun run lint`
- Code formatting: `bun run format`

## Deployment

- Production build: `bun run build`
- Server: `bun run start`
- Worker: `bun run worker`
- All builds output to `dist/` directory