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

### Step 2: Create TypeBox Schemas
- Convert existing JSON Schema to TypeBox format
- Organize schemas properly:
  - Common schemas (ErrorResponseSchema, fastify-error schemas) go in `apps/api/src/schemas/common.ts`
  - Domain-specific schemas go in `apps/api/src/schemas/{domain}.ts`
  - Keep inline schema structure in routes for clarity
- Use specific error schemas from `@fastify/error` instead of generic ErrorResponseSchema

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
    BadRequestErrorSchema,
    type RequestType,
    type QueryType,
    type ParamsType
} from "../../../schemas/{domain}.js";

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
        const data = request.body as RequestType
        const query = request.query as QueryType // if query params
        const params = request.params as ParamsType // if path params
        
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
- Use specific error schemas from `@fastify/error` for precise OpenAPI documentation
- Let unexpected errors bubble up to global error handler

### Step 6: TypeScript Integration
- Import schemas and types from schema files
- Use `Static<typeof Schema>` for type generation
- Maintain type safety throughout the handler
- Keep business logic validation separate from schema validation

### Step 7: Verification
- Run `bun run check-types` to verify TypeScript compilation
- Run existing tests to ensure functionality is preserved
- Ensure all imports are correct and types are properly generated
- Verify OpenAPI documentation reflects the new schema structure