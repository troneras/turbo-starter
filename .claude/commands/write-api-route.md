---
description: Create a new API route following established TypeBox patterns and best practices
allowed-tools: [Read, Edit, Write, Glob, Grep, Bash, TodoWrite, LS]
---

# Write New API Route with TypeBox

## Context

- Current working directory: !`pwd`
- Existing routes structure: !`find apps/api/src/routes -type d`
- Available schemas: !`find apps/api/src/schemas -name "*.ts" -type f 2>/dev/null || echo "No schemas directory yet"`

## Your task

Create a new API route at `$ARGUMENTS` following Test-Driven Development (TDD) with established TypeBox patterns and best practices.

### Step 1: Plan Route Structure

- Determine domain, endpoint name, and HTTP method
- Identify required request/response schemas
- Plan error handling and validation requirements
- Define test scenarios and expected behaviors

### Step 2: Create Schema File

Create `apps/api/src/schemas/{domain}.ts` with this structure:

```typescript
import { Type, type Static } from "@sinclair/typebox"
import {
    ErrorResponseSchema,
    UnauthorizedErrorSchema,
    ForbiddenErrorSchema,
    NotFoundErrorSchema,
    ConflictErrorSchema,
    BadRequestErrorSchema
} from "./common.js"

export const {Name}RequestSchema = Type.Object({
    // Define request properties with appropriate types and descriptions
    email: Type.String({ format: 'email', description: 'User email address (must be valid email format)' }),
    name: Type.String({ description: 'Full name of the user' }),
    // Use Type.Optional() for optional fields
    roles: Type.Optional(Type.Array(Type.String(), { description: 'Array of role names to assign' }))
    // Add validation constraints as needed (format: 'email', minimum, maximum, etc.)
}, {
    additionalProperties: false,
    description: 'Request body for {action} operation - provide clear description of purpose'
})

export const {Name}ResponseSchema = Type.Object({
    // Define response properties with specific types and descriptions
    id: Type.String({ description: 'Unique identifier of the created/updated resource' }),
    name: Type.String({ description: 'Name of the resource' }),
    createdAt: Type.String({ description: 'ISO timestamp when resource was created' })
}, {
    description: 'Successful {action} response with resource information'
})

// Query/Params schemas (if needed)
export const {Name}QuerySchema = Type.Object({
    page: Type.Optional(Type.Number({ default: 1, description: 'Page number for pagination (starts at 1)' })),
    pageSize: Type.Optional(Type.Number({ default: 20, description: 'Number of items per page (max 100)' }))
}, {
    description: 'Query parameters for pagination and filtering'
})

export const {Name}ParamsSchema = Type.Object({
    id: Type.String({ description: 'Unique identifier of the resource' }) // Use appropriate type/format for IDs
}, {
    description: 'Path parameters for resource identification'
})

// Re-export common error schemas
export {
    ErrorResponseSchema,
    UnauthorizedErrorSchema,
    ForbiddenErrorSchema,
    NotFoundErrorSchema,
    ConflictErrorSchema,
    BadRequestErrorSchema
}

// Generate TypeScript types
export type {Name}Request = Static<typeof {Name}RequestSchema>
export type {Name}Response = Static<typeof {Name}ResponseSchema>
export type {Name}Query = Static<typeof {Name}QuerySchema>
export type {Name}Params = Static<typeof {Name}ParamsSchema>
```

### Step 3: Create Route Handler

Create `apps/api/src/routes/api/{domain}/index.ts` with this structure:

```typescript
import type { FastifyInstance } from "fastify";
import {
    {Name}RequestSchema,
    {Name}ResponseSchema,
    {Name}QuerySchema,
    {Name}ParamsSchema,
    UnauthorizedErrorSchema,
    ForbiddenErrorSchema,
    NotFoundErrorSchema,
    ConflictErrorSchema,
    BadRequestErrorSchema,
    type {Name}Request,
    type {Name}Query,
    type {Name}Params
} from "../../../schemas/{domain}.js";

export default async function (fastify: FastifyInstance) {
    fastify.{method}('/{endpoint}', {
        schema: {
            tags: ['{domain}'],
            summary: 'Clear description of what this endpoint does',
            security: [{ bearerAuth: [] }], // if auth required
            body: {Name}RequestSchema, // for POST/PUT/PATCH
            querystring: {Name}QuerySchema, // for GET with query params
            params: {Name}ParamsSchema, // for path parameters like /:id
            response: {
                200: {Name}ResponseSchema, // or 201 for CREATE
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
        const data = request.body as {Name}Request
        const query = request.query as {Name}Query // if query params
        const params = request.params as {Name}Params // if path params
        const currentUser = (request as any).user // if auth required

        try {
            // Implementation logic using fastify plugins/services
            const result = await fastify.{serviceName}.{methodName}(data)

            // Set appropriate status code
            reply.code(201) // for CREATE operations
            return result
        } catch (error: any) {
            // Handle specific business logic errors
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

### Step 4: Best Practices Application

- **Schema Design**: Use descriptive, consistent naming conventions
- **Schema Descriptions**: Add descriptions to both individual fields and the overall schema for better Swagger documentation
- **Validation**: Leverage TypeBox features (Optional, String patterns, format validation, etc.)
- **Error Handling**: Use idiomatic Fastify error methods (`reply.badRequest()`, `reply.conflict()`, etc.)
- **Error Schemas**: Use specific fastify-error schemas instead of generic ErrorResponseSchema
- **Authentication**: Use `fastify.authenticate` and `fastify.requireRole()` decorators
- **Security**: Include rate limiting for sensitive endpoints, validate all inputs
- **Documentation**: Add clear summaries and consistent tag naming

### Step 5: Write Tests First (TDD Approach)

Create `apps/api/test/api/{domain}/{endpoint}.test.ts` following these patterns:

```typescript
import { it, describe, expect, afterEach, beforeEach } from "bun:test";
import { build } from "../../helpers/build-app";
import { users /* other tables */ } from "@cms/db/schema";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";

describe("{Domain} API - {Endpoint}", () => {
  let app: any;
  let originalEnvValue: string;

  beforeEach(async () => {
    app = await build();
    await app.ready();

    // Setup test data - handle foreign key constraints
    // Create dependent records first (users, brands, etc.)
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    // Restore environment variables
  });

  // Test input validation
  describe("Input Validation", () => {
    it("should return 400 for missing required fields", async () => {
      // Test cases
    });

    it("should return 400 for invalid field types", async () => {
      // Test cases
    });
  });

  // Test authentication (if required)
  describe("Authentication", () => {
    it("should return 401 for missing authentication", async () => {
      const res = await app.inject({
        method: "{METHOD}",
        url: "/api/{domain}/{endpoint}",
      });

      expect(res.statusCode).toBe(401);
      const response = JSON.parse(res.payload);
      expect(response.message).toBe("Unauthorized");
    });

    it("should return 401 for invalid token", async () => {
      const res = await app.inject({
        method: "{METHOD}",
        url: "/api/{domain}/{endpoint}",
        headers: {
          authorization: "Bearer invalid-token",
        },
      });

      expect(res.statusCode).toBe(401);
      const response = JSON.parse(res.payload);
      expect(response.message).toBe("Unauthorized");
    });

    it("should return 403 for insufficient permissions", async () => {
      // Create user token without required role
      const res = await app.inject({
        method: "{METHOD}",
        url: "/api/{domain}/{endpoint}",
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(res.statusCode).toBe(403);
      const response = JSON.parse(res.payload);
      expect(response.message).toBe("Forbidden");
    });
  });

  // Test success cases
  describe("Success Cases", () => {
    it("should successfully {action} when valid data provided", async () => {
      // Test successful operation
      const response = await app.inject({
        method: "{METHOD}",
        url: "/api/{domain}/{endpoint}",
        payload: validPayload,
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      // Validate response structure and content
    });
  });

  // Test error cases
  describe("Error Handling", () => {
    it("should handle database constraint violations gracefully", async () => {
      // Test cases
    });
  });

  // Test rate limiting (if applicable)
  describe("Rate Limiting", () => {
    it("should enforce rate limits", async () => {
      // Test rate limiting behavior
    });
  });
});
```

### Step 6: Implement Route Handler

Now implement the actual route handler in `apps/api/src/routes/api/{domain}/index.ts` to make the tests pass.

### Step 7: Integration & Verification

- Ensure the route directory exists or create it
- Verify schema imports and TypeScript types
- Run `bun run check-types` to validate TypeScript compilation
- Run `bun test` to ensure all tests pass
- Verify the endpoint works as expected

### TDD Workflow Summary:

1. **Red**: Write failing tests that define expected behavior
2. **Green**: Implement minimal code to make tests pass
3. **Refactor**: Improve code while keeping tests green

### Test File Location:

- Tests go in: `apps/api/test/api/{domain}/{endpoint}.test.ts`
- Follow existing patterns in `apps/api/test/` directory

### Usage Examples:

- `$ARGUMENTS` could be: `users/profile POST` or `translations/bulk-update PUT`
- Command will parse the input to determine domain, endpoint, and method
- Always write tests first, then implement the route
