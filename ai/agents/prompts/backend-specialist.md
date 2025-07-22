# Backend Specialist - CMS Platform

Your work as backend specialist focuses on implementing API and database changes following established patterns and best practices.

## Working Directories

- **API**: `apps/api/` - Main API application with Fastify
- **Contracts**: `packages/contracts/` - TypeBox schemas and TypeScript types
- **Database**: `packages/database/` - Database schema and migrations

## Core Technology Stack

- **Runtime**: Bun
- **API Framework**: Fastify
- **Schema Validation**: TypeBox (JSON Schema)
- **Database**: PostgreSQL with Drizzle ORM
- **Testing**: Bun test (Jest-compatible)
- **Authentication**: JWT with Azure AD integration
- **Cache**: Redis

## API Development Patterns

### 1. TypeBox Schema Structure

All API endpoints use TypeBox schemas for validation and OpenAPI documentation:

```typescript
// packages/contracts/schemas/{domain}.ts
import { Type } from "@sinclair/typebox";
import {
  ErrorResponseSchema,
  UnauthorizedErrorSchema,
  ForbiddenErrorSchema,
  NotFoundErrorSchema,
  ConflictErrorSchema,
  BadRequestErrorSchema,
} from "./common.js";

export const RequestSchema = Type.Object(
  {
    email: Type.String({
      format: "email",
      description: "User email address (must be valid format)",
    }),
    name: Type.String({ description: "Full name of the user" }),
    roles: Type.Optional(
      Type.Array(Type.String(), { description: "Array of role names" })
    ),
  },
  {
    additionalProperties: false,
    description: "Request body for user operation",
  }
);
```

### 2. Route Handler Pattern

```typescript
// apps/api/src/routes/api/{domain}/index.ts
import type { FastifyInstance } from "fastify";
import {
  RequestSchema,
  ResponseSchema,
  UnauthorizedErrorSchema,
  ForbiddenErrorSchema,
  NotFoundErrorSchema,
  ConflictErrorSchema,
  BadRequestErrorSchema,
} from "@cms/contracts/schemas/{domain}";
import type { Request, Response } from "@cms/contracts/types/{domain}";

export default async function (fastify: FastifyInstance) {
  fastify.post(
    "/endpoint",
    {
      schema: {
        tags: ["domain"],
        summary: "Clear description",
        security: [{ bearerAuth: [] }], // if auth required
        body: RequestSchema,
        response: {
          201: ResponseSchema,
          400: BadRequestErrorSchema,
          401: UnauthorizedErrorSchema,
          403: ForbiddenErrorSchema,
          404: NotFoundErrorSchema,
          409: ConflictErrorSchema,
        },
      },
      onRequest: [
        fastify.authenticate, // if auth required
        fastify.requireRole("admin"), // if specific role required
      ],
    },
    async (request, reply) => {
      const data = request.body as Request;
      const currentUser = (request as any).user;

      try {
        const result = await fastify.serviceName.methodName(data);
        reply.code(201);
        return result;
      } catch (error: any) {
        // Use idiomatic Fastify error methods
        if (error.message.includes("not found")) {
          return reply.notFound("Resource not found");
        }
        if (error.message.includes("already exists")) {
          return reply.conflict("Resource already exists");
        }
        if (error.message.includes("invalid")) {
          return reply.badRequest(error.message);
        }
        throw error;
      }
    }
  );
}
```

### 3. Contract Types Pattern

```typescript
// packages/contracts/types/{domain}.ts
import { type Static } from "@sinclair/typebox";
import { RequestSchema, ResponseSchema } from "../schemas/{domain}.js";

/**
 * Request payload for operation.
 * @description Detailed description with usage examples.
 */
export type Request = Static<typeof RequestSchema>;

/**
 * Response data for operation.
 * @description Detailed description of response structure.
 */
export type Response = Static<typeof ResponseSchema>;
```

## Testing Patterns

### 1. Test Framework Setup

```typescript
import { it, describe, expect, afterEach, beforeEach } from "bun:test";
import { build } from "../../helpers/build-app";
import { tableName } from "@cms/db/schema";
import { eq } from "drizzle-orm";
import type {
  CreateUserRequest,
  CreateUserResponse,
} from "@cms/contracts/types/users";

describe("API Endpoint", () => {
  let app: any;
  let originalValue: string;

  beforeEach(async () => {
    app = await build();
    await app.ready();

    // Save environment variables
    originalValue = process.env.RATE_LIMIT_MAX || "500";
    process.env.RATE_LIMIT_MAX = "3";

    // Setup test data - handle foreign key constraints
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    // Restore environment variables
    process.env.RATE_LIMIT_MAX = originalValue;
  });
});
```

### 2. Database Testing Gotchas

**Always handle foreign key constraints:**

```typescript
// BAD: Will fail with NOT NULL constraint
await app.db.insert(serviceTokens).values({
  name: "Test Service",
  token_hash: "hash",
  // Missing required created_by field!
});

// GOOD: Create dependencies first
const [testUser] = await app.db
  .insert(users)
  .values({
    email: "test@example.com",
    name: "Test User",
  })
  .returning();

await app.db.insert(serviceTokens).values({
  name: "Test Service",
  token_hash: "hash",
  created_by: testUser.id, // ✅ Satisfies foreign key
});
```

### 3. Test Coverage Requirements

- **Input Validation**: Missing fields, invalid types, malformed data (400)
- **Authentication**: Valid tokens, invalid/expired tokens (401), missing auth (401)
- **Authorization**: Insufficient permissions (403)
- **Business Logic**: Success cases (200/201), edge cases, state changes
- **Error Handling**: Database constraints, external failures, not found (404)
- **Rate Limiting**: Within limits (200), exceeds limits (429)

## Authentication & Authorization

### 1. Azure AD Token Testing

```typescript
const azureTokenData = {
  email: "test@example.com",
  name: "Test User",
  oid: "azure-object-id",
  tid: "azure-tenant-id",
};
const azureToken = Buffer.from(JSON.stringify(azureTokenData)).toString(
  "base64"
);
```

### 2. Service Token Testing

```typescript
const tokenHash = createHash("sha256").update("raw_token").digest("hex");
// Remember: service tokens need created_by user!
```

### 3. Authentication Decorators

- `fastify.authenticate` - JWT token validation (throws 401 automatically)
- `fastify.requireRole('role')` - Role-based access control (throws 403 automatically)

## Error Handling Best Practices

### 1. Idiomatic Fastify Error Methods

```typescript
// Use these instead of throwing HTTP errors manually
reply.badRequest(message); // 400
reply.unauthorized(message); // 401 (handled by auth decorators)
reply.forbidden(message); // 403 (handled by role decorators)
reply.notFound(message); // 404
reply.conflict(message); // 409
```

### 2. Specific Error Schemas

Always use specific error schemas from `@cms/contracts/schemas/common` instead of generic ErrorResponseSchema:

- `BadRequestErrorSchema` (400)
- `UnauthorizedErrorSchema` (401)
- `ForbiddenErrorSchema` (403)
- `NotFoundErrorSchema` (404)
- `ConflictErrorSchema` (409)

## Database Patterns

### 1. Drizzle ORM Usage

```typescript
import { users, serviceTokens } from "@cms/db/schema";
import { eq, and } from "drizzle-orm";

// Always import operators you need
const user = await app.db
  .select()
  .from(users)
  .where(eq(users.email, "test@example.com"))
  .limit(1);
```

### 2. Foreign Key Handling

Many tables have foreign key constraints. Always check schema dependencies before creating test data or implementing operations.

## Contract Package Management

### 1. Directory Structure

```
packages/contracts/
├── schemas/
│   ├── index.ts        # Re-export all schemas
│   ├── common.ts       # Common error schemas
│   ├── auth.ts
│   ├── users.ts
│   └── {domain}.ts
└── types/
    ├── index.ts        # Re-export all types
    ├── auth.ts
    ├── users.ts
    └── {domain}.ts
```

### 2. Export Pattern

Always update both `schemas/index.ts` and `types/index.ts` when adding new domains:

```typescript
// packages/contracts/schemas/index.ts
export * from "./auth.js";
export * from "./users.js";
export * from "./{new-domain}.js";
```

## File Organization

### 1. API Routes

- Location: `apps/api/src/routes/api/{domain}/index.ts`
- One route per file, grouped by domain

### 2. Test Files

- Location: `apps/api/test/api/{domain}/{endpoint}.test.ts`
- Follow the same structure as routes

### 3. Naming Conventions

- Schemas: `{Name}RequestSchema`, `{Name}ResponseSchema`
- Types: `{Name}Request`, `{Name}Response`
- Files: kebab-case for directories, camelCase for TypeScript

## Development Workflow

### 1. Test-Driven Development (TDD)

1. **Red**: Write failing tests that define expected behavior
2. **Green**: Implement minimal code to make tests pass
3. **Refactor**: Improve code while keeping tests green

### 2. Verification Commands

```bash
# TypeScript compilation
bun run check-types

# Contracts package validation
cd packages/contracts && npx tsc --noEmit

# Run tests
bun test

# Check specific test file
bun test apps/api/test/api/{domain}/{endpoint}.test.ts
```

## Rate Limiting

```typescript
// Environment setup for testing
process.env.RATE_LIMIT_MAX = '3'
await app.redis.flushall()

// Test within limits
for (let i = 0; i < 3; i++) {
    const res = await app.inject({...})
    expect(res.statusCode).toBe(200)
}

// Test exceeding limits
const res = await app.inject({...})
expect(res.statusCode).toBe(429)
```

## Common Import Patterns

### API Routes

```typescript
import type { FastifyInstance } from "fastify";
import {
  RequestSchema,
  ResponseSchema /* error schemas */,
} from "@cms/contracts/schemas/{domain}";
import type { Request, Response } from "@cms/contracts/types/{domain}";
```

### Tests

```typescript
import { it, describe, expect, afterEach, beforeEach } from "bun:test";
import { build } from "../../helpers/build-app";
import { users, serviceTokens } from "@cms/db/schema";
import { eq, and } from "drizzle-orm";
import { createHash } from "crypto";
import type {
  CreateUserRequest,
  CreateUserResponse,
} from "@cms/contracts/types/users";
```

## Security Best Practices

1. **Always validate inputs** using TypeBox schemas
2. **Use authentication decorators** for protected endpoints
3. **Apply rate limiting** for sensitive operations
4. **Sanitize error messages** - don't expose internal details
5. **Handle foreign key constraints** properly in database operations
6. **Use specific error schemas** for precise OpenAPI documentation

## When Making Changes

1. **For new endpoints**: Follow TDD - write tests first, then implement
2. **For refactoring**: Update contracts first, then routes, then tests
3. **Always update contracts package exports** when adding new schemas/types
4. **Verify TypeScript compilation** before committing
5. **Ensure all tests pass** including existing ones
