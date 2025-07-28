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

```mermaid
graph TB
    subgraph "Client Tier"
        BROWSER[Browser / Client<br/>HTTPS / Auth Tokens]
    end

    subgraph "Presentation Tier"
        ADMIN_UI[Admin UI - React<br/>Port: 3000]
        
        subgraph "UI Components"
            AUTH_UI[Auth MSAL<br/>Azure AD Integration]
            ROUTING[TanStack Router<br/>Type-safe Routing]
            COMPONENTS[shadcn/ui<br/>Component Library]
        end
    end

    subgraph "Contract Layer"
        CONTRACTS[Shared Contracts<br/>packages/contracts]
        
        subgraph "Schema Types"
            SCHEMAS[TypeBox Schemas<br/>• Users, Roles, Permissions<br/>• Brands, Locales, Jurisdictions<br/>• Translations, Releases, Flags<br/>• Request/Response validation]
        end
    end

    subgraph "Application Tier"
        API_SERVER[API Server - Fastify<br/>Port: 3000]
        
        subgraph "External Plugins Infrastructure"
            AUTH_JWT[Auth/JWT<br/>Token Validation]
            DB_PLUGIN[Database<br/>Connection Pool]
            REDIS_PLUGIN[Redis<br/>Cache & Sessions]
            SECURITY[Security<br/>Rate Limiting, CORS]
        end
        
        subgraph "App Plugins Business Logic"
            USERS_PLUGIN[Users<br/>User Management]
            BRANDS_PLUGIN[Brands<br/>Multi-brand Config]
            WORKFLOW[Workflow<br/>Translation Pipeline]
            FEATURES[Features<br/>Feature Flags]
        end
        
        subgraph "Routes Domain Handlers"
            USERS_ROUTES[/api/users<br/>User CRUD]
            BRANDS_ROUTES[/api/brands<br/>Brand Management]
            TRANSLATIONS_ROUTES[/api/translations<br/>Content Management]
            HEALTH_ROUTES[/health<br/>System Status]
        end
    end

    subgraph "Data Access Tier"
        DB_LAYER[Database Layer<br/>packages/db]
        
        subgraph "ORM Schema"
            DRIZZLE[Drizzle ORM Schema<br/>• Multi-tenant data model<br/>• RBAC Users, Roles, Permissions<br/>• Content hierarchy Brand → Jurisdiction → Locale<br/>• Translation workflow tracking<br/>• Atomic release management]
        end
    end

    subgraph "Data Tier"
        POSTGRES[(PostgreSQL Database<br/>Primary Data Store<br/>• Tables: users, roles, brands, translations, releases<br/>• Features: JSONB, Full-text search, Row-level security)]
        REDIS[(Redis Caching<br/>• Session storage<br/>• Job queues<br/>• Rate limit data)]
    end

    %% Client to UI
    BROWSER --> ADMIN_UI

    %% UI Internal Components
    ADMIN_UI --> AUTH_UI
    ADMIN_UI --> ROUTING
    ADMIN_UI --> COMPONENTS

    %% UI to Contracts
    ADMIN_UI --> CONTRACTS
    CONTRACTS --> SCHEMAS

    %% UI to API
    ADMIN_UI -.->|HTTP API Calls| API_SERVER

    %% Contracts to API
    CONTRACTS --> API_SERVER

    %% API Internal Flow
    API_SERVER --> AUTH_JWT
    API_SERVER --> DB_PLUGIN
    API_SERVER --> REDIS_PLUGIN
    API_SERVER --> SECURITY

    API_SERVER --> USERS_PLUGIN
    API_SERVER --> BRANDS_PLUGIN
    API_SERVER --> WORKFLOW
    API_SERVER --> FEATURES

    API_SERVER --> USERS_ROUTES
    API_SERVER --> BRANDS_ROUTES
    API_SERVER --> TRANSLATIONS_ROUTES
    API_SERVER --> HEALTH_ROUTES

    %% API to Data Layer
    API_SERVER --> DB_LAYER
    DB_LAYER --> DRIZZLE

    %% Data Layer to Storage
    DB_LAYER -.->|SQL Queries| POSTGRES
    API_SERVER -.->|Cache Operations| REDIS

    %% Styling
    classDef clientTier fill:#e1f5fe
    classDef presentationTier fill:#f3e5f5
    classDef contractTier fill:#fff3e0
    classDef applicationTier fill:#e8f5e8
    classDef dataTier fill:#fff8e1
    classDef storageTier fill:#fce4ec

    class BROWSER clientTier
    class ADMIN_UI,AUTH_UI,ROUTING,COMPONENTS presentationTier
    class CONTRACTS,SCHEMAS contractTier
    class API_SERVER,AUTH_JWT,DB_PLUGIN,REDIS_PLUGIN,SECURITY,USERS_PLUGIN,BRANDS_PLUGIN,WORKFLOW,FEATURES,USERS_ROUTES,BRANDS_ROUTES,TRANSLATIONS_ROUTES,HEALTH_ROUTES applicationTier
    class DB_LAYER,DRIZZLE dataTier
    class POSTGRES,REDIS storageTier
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
  return apiClient.post<User>('/users', data) // Type-safe
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