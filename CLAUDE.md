# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a **monorepo** for a CMS & Translation Platform that enables multi-brand, multi-jurisdiction content management with atomic deployments and feature flags. The platform is built for enterprise-scale content operations with full type safety and real-time collaboration.

### Technology Stack

- **TurboRepo** - Monorepo management and build orchestration
- **Bun** - Runtime, package manager, and test runner
- **TypeScript** - End-to-end type safety
- **Shared Contracts** - TypeBox schemas ensuring API/UI consistency

## Architecture Overview

### Repository Structure

```
cms-platform/
├── apps/
│   ├── api/              # Fastify API server
│   │   ├── src/plugins/  # Plugin-based architecture
│   │   ├── src/routes/   # Domain-organized endpoints  
│   │   ├── test/         # Comprehensive test suite
│   │   └── CLAUDE.md     # API-specific development guide
│   └── admin/            # React admin interface
│       ├── src/app/      # TanStack Router + providers
│       ├── src/features/ # Domain-driven feature modules
│       ├── src/components/ # Shared UI components
│       └── CLAUDE.md     # Admin UI development guide
├── packages/
│   ├── contracts/        # Shared TypeBox schemas and types
│   │   ├── schemas/      # Validation schemas
│   │   └── types/        # TypeScript type definitions
│   └── db/              # Database layer
│       ├── schema/       # Drizzle ORM schema definitions
│       ├── migrations/   # Database migration files
│       └── seed.ts       # Database seeding utilities
├── docker-compose.yml    # Local development services
└── turbo.json           # Monorepo build configuration
```

### Component Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser / Client                        │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS / Auth Tokens
┌─────────────────────▼───────────────────────────────────────┐
│               Admin UI (React)                              │
│  ┌─────────────────┬─────────────────┬─────────────────┐   │
│  │   Auth (MSAL)   │  Routing (TS)   │   UI (shadcn)   │   │
│  └─────────────────┴─────────────────┴─────────────────┘   │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP API Calls
┌─────────────────────▼───────────────────────────────────────┐
│                Shared Contracts                             │
│       ┌─────────────────────────────────────────┐          │
│       │  TypeBox Schemas + TypeScript Types     │          │
│       │  • Users, Roles, Permissions           │          │
│       │  • Brands, Locales, Jurisdictions      │          │
│       │  • Translations, Releases, Flags       │          │
│       │  • Request/Response validation          │          │
│       └─────────────────────────────────────────┘          │
└─────────────────────┬───────────────────┬───────────────────┘
                      │                   │
┌─────────────────────▼───────────────────▼───────────────────┐
│                 API Server (Fastify)                       │
│  ┌──────────────┬──────────────┬──────────────────────────┐ │
│  │ External     │ App Plugins  │       Routes             │ │
│  │ Plugins      │ (Business    │   (Domain Handlers)     │ │
│  │ (Infra)      │  Logic)      │                         │ │
│  │ • Auth/JWT   │ • Users      │   /api/users            │ │
│  │ • Database   │ • Brands     │   /api/brands           │ │
│  │ • Redis      │ • Workflow   │   /api/translations     │ │
│  │ • Security   │ • Features   │   /health               │ │
│  └──────────────┴──────────────┴──────────────────────────┘ │
└─────────────────────┬───────────────────────────────────────┘
                      │ Database Queries
┌─────────────────────▼───────────────────────────────────────┐
│              Database Layer (packages/db)                  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │            Drizzle ORM Schema                          │ │
│  │  • Multi-tenant data model                            │ │
│  │  • RBAC (Users, Roles, Permissions)                   │ │
│  │  • Content hierarchy (Brand → Jurisdiction → Locale)  │ │
│  │  • Translation workflow tracking                      │ │
│  │  • Atomic release management                          │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────┬───────────────────────────────────────┘
                      │ SQL Queries
┌─────────────────────▼───────────────────────────────────────┐
│                PostgreSQL Database                         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Tables: users, roles, brands, translations, releases   │ │
│  │ Features: JSONB, Full-text search, Row-level security  │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────┐
                    │     Redis (Caching)     │
                    │   • Session storage     │
                    │   • Job queues         │
                    │   • Rate limit data    │
                    └─────────────────────────┘
```

## Development Workflow

### Monorepo Commands

**Development**:
- `bun install` - Install all dependencies
- `bun run dev` - Start API server (port 3000)
- `bun run --filter=admin dev` - Start admin UI (port 3000)
- `bun run --filter=api test` - Run API tests
- `bun run --filter=admin test` - Run UI tests

**Database**:
- `bun run db:generate` - Generate migrations from schema changes
- `bun run db:migrate` - Apply pending migrations
- `bun run --filter=db seed` - Seed development data

**Quality**:
- `bun run lint` - Lint all packages
- `bun run check-types` - TypeScript validation
- `bun run format` - Format with Prettier
- `bun run build` - Build all packages

### Local Development Setup

1. **Prerequisites**: Bun runtime, PostgreSQL, Redis
2. **Services**: `docker-compose up -d` (starts PostgreSQL + Redis)
3. **Dependencies**: `bun install`
4. **Database**: `bun run db:migrate`
5. **API**: `bun run dev` (starts on port 3000)
6. **Admin**: `bun run --filter=admin dev` (starts on port 3000)

### Type Safety Flow

```typescript
// 1. Define schema in packages/contracts
import { Type } from '@sinclair/typebox'

export const CreateUserSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  name: Type.String({ minLength: 1 })
})

// 2. Generate types automatically
export type CreateUser = Static<typeof CreateUserSchema>

// 3. Use in API (apps/api)
fastify.post('/users', {
  schema: { body: CreateUserSchema }
}, async (request) => {
  const userData = request.body // Fully typed CreateUser
})

// 4. Use in Admin UI (apps/admin)
import type { CreateUser } from '@cms/contracts/types/users'

const createUser = async (data: CreateUser) => {
  return apiClient.post<User>('/api/users', data) // Type-safe
}
```

## Core Domain Model

### Multi-Tenant Content Architecture

- **Brands** - Different product lines or companies
- **Jurisdictions** - Legal/regulatory regions (US, EU, etc.)  
- **Locales** - Language + region combinations (en-US, fr-CA)
- **Translations** - Content with hierarchical overrides
- **Releases** - Atomic content deployments with rollback
- **Feature Flags** - Granular content visibility control

### Role-Based Access Control

- **Roles**: `admin`, `editor`, `user`, `service`
- **Permissions**: Action-based (`users:create`, `translations:publish`)
- **Inheritance**: Roles can inherit permissions from other roles
- **Multi-brand**: Users can have different roles per brand

### Authentication Flow

1. **Admin UI** authenticates with Azure AD via MSAL
2. **Azure Token** exchanged for internal JWT at `/api/auth/login`
3. **JWT** contains user info, roles, and permissions
4. **API** validates JWT on protected endpoints
5. **Service Tokens** for machine-to-machine access

## Shared Contracts System

### Purpose
- **Single Source of Truth** - Schema definitions shared between API and UI
- **Type Safety** - End-to-end TypeScript safety
- **API Documentation** - Auto-generated OpenAPI specs
- **Validation** - Consistent request/response validation

### Usage Patterns

**API Server**:
```typescript
import { CreateUserRequestSchema } from '@cms/contracts/schemas/users'
import type { CreateUserRequest } from '@cms/contracts/types/users'
```

**Admin UI**:
```typescript
// Import only types to avoid bundling TypeBox
import type { CreateUserRequest, User } from '@cms/contracts/types/users'
```

### Package Structure
- `schemas/` - TypeBox validation schemas
- `types/` - Generated TypeScript types with TSDoc
- Auto-exports via index files

## Database Layer

### Drizzle ORM Integration
- **Type Safety** - Schema definitions generate TypeScript types
- **Migration System** - Version-controlled schema changes
- **Query Builder** - SQL-like syntax with type inference
- **Multi-database** - PostgreSQL primary, extensible to others

### Schema Organization
- **Core Tables** - users, roles, brands, locales
- **Content Tables** - translations, releases, feature_flags
- **Relationship Tables** - user_roles, role_permissions
- **Audit Tables** - Change tracking and history

## Testing Strategy

### API Testing
- **Unit Tests** - Plugin and service testing
- **Integration Tests** - Full request/response cycles
- **Authentication Tests** - Mock Azure tokens and JWT validation
- **Database Tests** - Repository pattern testing

### Admin UI Testing
- **Component Tests** - React Testing Library
- **Hook Tests** - Custom hook behavior
- **Integration Tests** - User flow testing
- **Accessibility Tests** - ARIA compliance

## Security Considerations

### Authentication
- **Azure AD** integration for user authentication
- **JWT tokens** for API authentication
- **Service tokens** for machine access
- **Token rotation** and expiration handling

### Authorization
- **RBAC** at route and component level
- **Permission checks** before sensitive operations
- **Multi-brand isolation** - users see only permitted brands

### API Security
- **Rate limiting** on all endpoints
- **CORS** configuration for admin UI
- **Input validation** via TypeBox schemas
- **SQL injection** prevention via Drizzle ORM

## Performance Optimization

### API Performance
- **Database indexing** on frequently queried columns
- **Redis caching** for session data and computed results
- **Connection pooling** for database efficiency
- **Pagination** for large result sets

### UI Performance  
- **Code splitting** automatic via TanStack Router
- **Lazy loading** for route components
- **Bundle optimization** via Vite
- **Asset caching** with fingerprinted filenames

## Deployment Architecture

### Development
- **Local services** via Docker Compose
- **Hot reloading** for API and UI development
- **Database migrations** applied automatically

### Production (Future)
- **Container deployment** via Docker
- **Database migrations** via CI/CD pipeline  
- **Asset serving** via CDN
- **Monitoring** and logging integration

## App-Specific Documentation

For detailed development guidance:

- **API Development** - See `apps/api/CLAUDE.md`
  - Fastify plugin architecture
  - Authentication and RBAC patterns
  - Testing with Bun
  - Database operations

- **Admin UI Development** - See `apps/admin/CLAUDE.md`  
  - React + TanStack Router patterns
  - MSAL authentication integration
  - shadcn/ui component usage
  - Feature-driven architecture

## Contributing Guidelines

1. **Schema First** - Define TypeBox contracts before implementation
2. **Type Safety** - Leverage TypeScript throughout the stack  
3. **Testing** - Write tests for new features and bug fixes
4. **Documentation** - Update relevant CLAUDE.md files
5. **Migration** - Include database migrations for schema changes
6. **Review** - Code review required for all changes