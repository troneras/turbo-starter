# Project Structure

The CMS Platform uses a monorepo structure managed by TurboRepo. This provides efficient builds, shared dependencies, and atomic versioning across all packages.

## Directory Layout

```
cms-platform/
├── apps/                    # Application packages
│   ├── api/                # Fastify API server
│   ├── admin/              # React admin interface
│   └── docs/               # Documentation (you are here!)
├── packages/               # Shared packages
│   ├── contracts/          # TypeBox schemas and types
│   └── db/                # Database layer (Drizzle ORM)
├── docker-compose.yml      # Local development services
├── turbo.json             # TurboRepo configuration
└── package.json           # Root package configuration
```

## Applications

### API Server (`apps/api`)

The Fastify-based API server provides:
- RESTful endpoints for all platform operations
- Plugin-based architecture for modularity
- JWT authentication with Azure AD integration
- Comprehensive test coverage

Key directories:
- `src/plugins/` - Fastify plugins (auth, database, etc.)
- `src/routes/` - API route handlers
- `test/` - Integration and unit tests

### Admin UI (`apps/admin`)

The React-based admin interface features:
- TanStack Router for type-safe routing
- MSAL integration for Azure AD authentication
- shadcn/ui components
- Feature-driven architecture

Key directories:
- `src/app/` - Application setup and providers
- `src/features/` - Domain-specific features
- `src/components/` - Shared UI components

### Documentation (`apps/docs`)

VitePress-powered developer documentation with:
- Markdown-based content
- API reference generation
- Architecture diagrams
- Code examples

## Shared Packages

### Contracts (`packages/contracts`)

Shared TypeBox schemas and TypeScript types ensure type safety across the stack:

```typescript
// Schema definition
export const UserSchema = Type.Object({
  id: Type.String(),
  email: Type.String({ format: 'email' }),
  name: Type.String()
})

// Type generation
export type User = Static<typeof UserSchema>
```

### Database (`packages/db`)

Drizzle ORM-based database layer with:
- Type-safe schema definitions
- Migration management
- Seed data utilities
- Repository patterns

## Configuration Files

### `turbo.json`

Defines the build pipeline and task dependencies:

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"]
    }
  }
}
```

### `docker-compose.yml`

Local development services:
- PostgreSQL database
- Redis cache
- Optional monitoring tools

## Development Workflow

1. **Make changes** in the appropriate package
2. **Run tests** with `bun test`
3. **Build all packages** with `bun run build`
4. **Start development** with `bun run dev`

The monorepo structure ensures that changes to shared packages automatically trigger rebuilds in dependent applications.