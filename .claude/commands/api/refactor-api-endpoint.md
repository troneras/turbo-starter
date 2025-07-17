---
description: Refactor an existing API endpoint to use TypeBox schemas following established patterns
allowed-tools: [Read, Edit, Write, Glob, Grep, Bash, TodoWrite]
---

# Refactor API Endpoint to Use TypeBox

## Context

- Current working directory: !`pwd`
- Available route files: !`find apps/api/src/routes -name "*.ts" -type f`

## Your task

Refactor the API endpoint at `$ARGUMENTS` to use TypeBox schemas following these established patterns:

### Step 1: Analyze Current Implementation

- Read the existing route file
- Identify current schema structure (JSON Schema or inline objects)
- Note request/response patterns and validation logic

### Step 2: Update Contracts Package

- Add or update schemas in `packages/contracts/schemas/{domain}.ts`
- Add or update types in `packages/contracts/types/{domain}.ts`
- Use TypeBox format with descriptions for better Swagger documentation
- Update the main contracts exports in `packages/contracts/index.ts`
- Use specific error schemas from common.js instead of generic ErrorResponseSchema

#### Schema File Pattern (`packages/contracts/schemas/{domain}.ts`):

```typescript
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

export const ResponseSchema = Type.Object(
  {
    id: Type.String({ description: "Unique identifier" }),
    email: Type.String({ description: "User email address" }),
    name: Type.String({ description: "Full name" }),
    roles: Type.Array(Type.String(), { description: "Assigned roles" }),
  },
  {
    description: "Successful operation response",
  }
);

// Re-export common schemas
export {
  ErrorResponseSchema,
  UnauthorizedErrorSchema,
  ForbiddenErrorSchema,
  NotFoundErrorSchema,
  ConflictErrorSchema,
  BadRequestErrorSchema,
};
```

#### Types File Pattern (`packages/contracts/types/{domain}.ts`):

```typescript
import { type Static } from "@sinclair/typebox";
import {
  RequestSchema,
  ResponseSchema,
  QuerySchema,
  ParamsSchema,
} from "../schemas/{domain}.js";

/**
 * Request payload for {operation}.
 *
 * @description Detailed description of the request structure and usage.
 */
export type Request = Static<typeof RequestSchema>;

/**
 * Response data for {operation}.
 *
 * @description Detailed description of the response structure.
 */
export type Response = Static<typeof ResponseSchema>;

export type Query = Static<typeof QuerySchema>;
export type Params = Static<typeof ParamsSchema>;
```

### Step 3: Update Route Structure

Apply this pattern:

```typescript
import type { FastifyInstance } from "fastify";
import {
    RequestSchema,
    ResponseSchema,
    QuerySchema,
    ParamsSchema,
    UnauthorizedErrorSchema,
    ForbiddenErrorSchema,
    NotFoundErrorSchema,
    ConflictErrorSchema,
    BadRequestErrorSchema
} from "@cms/contracts/schemas/{domain}";
import type {
    Request,
    Response,
    Query,
    Params
} from "@cms/contracts/types/{domain}";

export default async function (fastify: FastifyInstance) {
    fastify.{method}('/endpoint', {
        schema: {
            tags: ['domain'],
            summary: 'Clear description',
            security: [{ bearerAuth: [] }], // if auth required
            body: RequestSchema, // for POST/PUT/PATCH
            querystring: QuerySchema, // for GET with query params
            params: ParamsSchema, // for path parameters
            response: {
                200: ResponseSchema, // or 201 for CREATE
                400: BadRequestErrorSchema,
                401: UnauthorizedErrorSchema, // if auth required
                403: ForbiddenErrorSchema, // if authorization required
                404: NotFoundErrorSchema, // if resource lookup
                409: ConflictErrorSchema // if uniqueness constraints
            }
        },
        onRequest: [
            fastify.authenticate, // if auth required
            fastify.requireRole('admin') // if specific role required
        ]
    }, async (request, reply) => {
        const data = request.body as Request
        const query = request.query as Query // if query params
        const params = request.params as Params // if path params

        try {
            // Implementation logic
            const result = await fastify.{serviceName}.{methodName}(data)
            return result
        } catch (error: any) {
            // Handle specific business logic errors with idiomatic Fastify methods
            if (error.message.includes('not found')) {
                return reply.notFound('Resource not found')
            }
            if (error.message.includes('already exists')) {
                return reply.conflict('Resource already exists')
            }
            if (error.message.includes('invalid')) {
                return reply.badRequest(error.message)
            }

            // Let other errors bubble up to global error handler
            throw error
        }
    })
}
```

### Step 4: Authentication & Authorization

- Use `fastify.authenticate` decorator for JWT token validation
- Use `fastify.requireRole('role')` decorator for role-based access control
- Authentication throws `fastify.httpErrors.unauthorized()` automatically
- Authorization throws `fastify.httpErrors.forbidden()` automatically

### Step 5: Error Handling Best Practices

- Use idiomatic Fastify error methods:
  - `reply.badRequest(message)` for 400 errors
  - `reply.unauthorized(message)` for 401 errors (handled by auth decorators)
  - `reply.forbidden(message)` for 403 errors (handled by role decorators)
  - `reply.notFound(message)` for 404 errors
  - `reply.conflict(message)` for 409 errors
- Use specific error schemas from `@cms/contracts/schemas/common` for precise OpenAPI documentation
- Let unexpected errors bubble up to global error handler

### Step 6: TypeScript Integration

- Import schemas from `@cms/contracts/schemas/{domain}`
- Import types from `@cms/contracts/types/{domain}`
- Use TSDoc-documented types for better developer experience
- Maintain type safety throughout the handler
- Keep business logic validation separate from schema validation

### Step 7: Update Contracts Package Exports

Update `packages/contracts/index.ts` to include new schemas/types:

```typescript
// Export all schemas
export * as schemas from "./schemas/index.js";

// Export all types
export * as types from "./types/index.js";

// Re-export common schemas for backward compatibility
export * from "./schemas/index.js";
```

Update `packages/contracts/schemas/index.ts` and `packages/contracts/types/index.ts` to include your new domain files.

### Step 8: Verification

- Run `bun run check-types` to verify TypeScript compilation
- Run existing tests to ensure functionality is preserved
- Ensure all imports are correct and types are properly generated
- Verify OpenAPI documentation reflects the new schema structure
- Check that contracts package builds correctly: `cd packages/contracts && npx tsc --noEmit`
