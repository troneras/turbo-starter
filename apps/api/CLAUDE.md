# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## API Architecture Overview

This Fastify-based API server is part of a CMS & Translation Platform monorepo. The API follows a plugin-driven architecture with clear separation between infrastructure and business concerns.

### Tech Stack

- **Fastify** - Web framework with TypeBox type provider
- **TypeBox** - Schema validation and OpenAPI generation
- **Drizzle ORM** - Type-safe database operations
- **Bun** - Runtime and package manager
- **PostgreSQL** - Primary database
- **Redis** - Caching and job queuing

### Directory Structure

```
src/
├── app.ts              # App factory with plugin registration
├── server.ts           # Server startup and graceful shutdown
├── worker.ts           # Background job worker
├── plugins/
│   ├── external/       # Infrastructure plugins (auth, db, redis, security)
│   └── app/           # Business logic plugins (users, brands, etc.)
├── routes/            # API route handlers organized by domain
├── lib/               # Shared utilities (config, logger, utils)
└── test/              # Test files with helpers
```

## Development Commands

### API-specific commands:
- `bun run dev` - Start API server in watch mode
- `bun run build` - Build API server
- `bun run start` - Start production server
- `bun run worker` - Start background worker
- `bun run test` - Run all tests
- `bun run check-types` - TypeScript type checking

### From monorepo root:
- `bun run --filter=api dev` - Start API server
- `bun run --filter=api test` - Run API tests
- `bun run --filter=api build` - Build API only

## Key Architecture Patterns

### Plugin System

**Loading Order**: External plugins → App plugins → Routes

External plugins provide infrastructure:
- `auth.ts` - JWT authentication and Azure AD integration
- `db.ts` - PostgreSQL connection via Drizzle
- `redis.ts` - Redis connection
- `security.ts` - CORS, rate limiting, helmet
- `swagger.ts` - OpenAPI documentation

App plugins provide business logic:
- Domain-specific repositories and services
- Decorators for common operations

### Authentication Flow

1. **Azure AD Token** → Base64 encoded user profile data
2. **Token Validation** → `fastify.auth.validateAzureToken()`
3. **User Creation/Update** → Auto-creates users on first login
4. **JWT Generation** → Internal JWT with roles/permissions
5. **Request Authentication** → `fastify.authenticate` decorator

### Route Development Pattern

```typescript
import type { FastifyInstance } from "fastify";
import {
  CreateRequestSchema,
  CreateResponseSchema,
  UnauthorizedErrorSchema,
  ForbiddenErrorSchema,
  BadRequestErrorSchema
} from "@cms/contracts/schemas/domain";
import type { CreateRequest } from "@cms/contracts/types/domain";

export default async function (fastify: FastifyInstance) {
  fastify.post('/', {
    schema: {
      tags: ['domain'],
      summary: 'Create resource',
      security: [{ bearerAuth: [] }],
      body: CreateRequestSchema,
      response: {
        201: CreateResponseSchema,
        400: BadRequestErrorSchema,
        401: UnauthorizedErrorSchema,
        403: ForbiddenErrorSchema
      }
    },
    onRequest: [
      fastify.authenticate,
      fastify.requireRole('admin')
    ]
  }, async (request, reply) => {
    const data = request.body as CreateRequest;
    
    try {
      const result = await fastify.domainService.create(data);
      reply.code(201);
      return result;
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return reply.notFound('Resource not found');
      }
      if (error.message.includes('already exists')) {
        return reply.conflict('Resource already exists');
      }
      throw error;
    }
  });
}
```

## Testing Patterns

### Test Structure
- Uses Bun's built-in test runner
- Test helper in `test/helpers/build-app.ts` creates test app instances
- Tests directly use `app.db` for database operations
- Authentication testing via mock Azure tokens

### Example Test Pattern
```typescript
import { it, describe, expect, beforeEach, afterEach } from 'bun:test'
import { build } from '../helpers/build-app'

describe('Domain API', () => {
  let app: any

  beforeEach(async () => {
    app = await build()
    await app.ready()
  })

  afterEach(async () => {
    if (app) await app.close()
  })

  it('should handle authenticated request', async () => {
    // Create mock Azure token
    const azureToken = Buffer.from(JSON.stringify({
      email: 'test@example.com',
      name: 'Test User',
      oid: 'azure-oid',
      tid: 'azure-tid'
    })).toString('base64')

    // Login to get JWT
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { azure_token: azureToken }
    })

    const jwt = JSON.parse(loginRes.payload).jwt

    // Test authenticated endpoint
    const res = await app.inject({
      method: 'GET',
      url: '/api/endpoint',
      headers: { authorization: `Bearer ${jwt}` }
    })

    expect(res.statusCode).toBe(200)
  })
})
```

## Error Handling

### Global Error Handler
- Maps status codes to appropriate error names (400 → 'Bad Request')
- Client errors (4xx) show actual error message
- Server errors (5xx) show generic message for security
- All errors logged with request context

### Best Practices
- Use Fastify's error reply methods: `reply.badRequest()`, `reply.notFound()`, `reply.conflict()`
- Let unexpected errors bubble to global handler
- Include specific error schemas in route definitions

## Database Patterns

### Schema Access
Import from shared database package: `@cms/db/schema`

### Query Patterns
```typescript
// Via decorated instance
const users = await fastify.db.select().from(usersTable)

// Repository pattern (in plugins)
export class UsersRepository {
  constructor(private db: Database) {}
  
  async findByEmail(email: string) {
    return this.db.select().from(users).where(eq(users.email, email)).limit(1)
  }
}
```

## Environment Configuration

### Required Variables
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret

### Optional Variables (with defaults)
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (default: 'development')
- `REDIS_URL` - Redis connection (default: redis://localhost:6379)
- `CORS_ORIGIN` - CORS origin (default: '*')

## Security Features

### Built-in Protection
- **Rate Limiting** - Applied to all routes and 404 handler
- **CORS** - Configurable origin restrictions  
- **Helmet** - Security headers
- **Input Validation** - TypeBox schema validation
- **JWT Authentication** - Stateless token-based auth

### RBAC System
- Roles: `admin`, `editor`, `user`, `service`
- Permissions: Granular action-based permissions
- Decorators: `fastify.authenticate`, `fastify.requireRole(role)`

## Shared Contracts Integration
Shared countracts may be found inside packages/contracts

### Schema Usage
```typescript
import { CreateUserRequestSchema } from '@cms/contracts/schemas/users'
import type { CreateUserRequest } from '@cms/contracts/types/users'
```

### Benefits
- Consistent validation between API and admin UI
- Auto-generated TypeScript types
- OpenAPI documentation generation
- Prevents type drift between frontend/backend

## App Factory Pattern

The `app.ts` file implements a factory pattern:

1. **Plugin Registration** - External → App → Routes (via autoload)
2. **Global Error Handler** - Centralized error mapping and logging
3. **404 Handler** - Rate-limited for security
4. **TypeBox Integration** - Automatic validation and OpenAPI generation

## Background Jobs

### Worker Process
(under development, will use bullMQ)
- Separate worker process (`worker.ts`) for background jobs
- Redis-backed job queuing
- Handles async operations (email, file processing, etc.)

### Job Patterns
```typescript
// Enqueue job
await fastify.jobs.add('processUpload', { fileId: 'uuid' })

// Process job (in worker)
fastify.jobs.process('processUpload', async (job) => {
  const { fileId } = job.data
  // Process file...
})
```

## Development Best Practices

1. **Schema First** - Define TypeBox schemas in contracts package before implementation
2. **Plugin Dependencies** - Declare plugin dependencies explicitly
3. **Error Schemas** - Include all possible error responses in route schemas
4. **Authentication** - Always use decorators, never manual JWT handling
5. **Testing** - Test authentication, authorization, and error cases
6. **Logging** - Use structured logging with request context
7. **Type Safety** - Leverage TypeBox and Drizzle for end-to-end type safety