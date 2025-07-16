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
import { ErrorResponseSchema } from "./common.js"

export const {Name}RequestSchema = Type.Object({
    // Define request properties with appropriate types
    // Use Type.Optional() for optional fields
    // Add validation constraints as needed
}, {
    additionalProperties: false
})

export const {Name}ResponseSchema = Type.Object({
    // Define response properties
})

// Re-export common schemas
export { ErrorResponseSchema }

// Generate TypeScript types
export type {Name}Request = Static<typeof {Name}RequestSchema>
export type {Name}Response = Static<typeof {Name}ResponseSchema>
```

### Step 3: Create Route Handler
Create `apps/api/src/routes/api/{domain}/index.ts` with this structure:
```typescript
import type { FastifyInstance } from "fastify";
import { 
    {Name}RequestSchema,
    {Name}ResponseSchema,
    ErrorResponseSchema,
    type {Name}Request 
} from "../../../schemas/{domain}.js";

export default async function (fastify: FastifyInstance) {
    fastify.{method}('/{endpoint}', {
        schema: {
            tags: ['{domain}'],
            summary: 'Clear description of what this endpoint does',
            body: {Name}RequestSchema, // for POST/PUT
            querystring: QuerySchema, // for GET with query params
            params: ParamsSchema, // for path parameters
            response: {
                200: {Name}ResponseSchema,
                400: ErrorResponseSchema,
                401: ErrorResponseSchema,
                403: ErrorResponseSchema, // if auth required
                404: ErrorResponseSchema, // if resource lookup
                500: ErrorResponseSchema
            }
        }
    }, async (request, reply) => {
        const data = request.body as {Name}Request
        
        // Business logic validation (if needed beyond schema)
        
        try {
            // Implementation logic
            return result
        } catch (error: any) {
            fastify.log.error(error, 'Error in {endpoint}')
            return reply.code(500).send({ error: error.message || 'Internal server error' })
        }
    })
}
```

### Step 4: Best Practices Application
- **Schema Design**: Use descriptive, consistent naming conventions
- **Validation**: Leverage TypeBox features (Optional, String patterns, etc.)
- **Error Handling**: Use appropriate HTTP status codes and meaningful messages
- **Security**: Include rate limiting for sensitive endpoints, validate all inputs
- **Documentation**: Add clear summaries and consistent tag naming

### Step 5: Write Tests First (TDD Approach)
Create `apps/api/test/api/{domain}/{endpoint}.test.ts` following these patterns:

```typescript
import { it, describe, expect, afterEach, beforeEach } from "bun:test";
import { build } from "../../helpers/build-app";
import { users, /* other tables */ } from "@cms/db/schema";
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
      // Test cases
    });
    
    it("should return 401 for invalid token", async () => {
      // Test cases
    });
  });

  // Test success cases
  describe("Success Cases", () => {
    it("should successfully {action} when valid data provided", async () => {
      // Test successful operation
      const response = await app.inject({
        method: '{METHOD}',
        url: '/api/{domain}/{endpoint}',
        payload: validPayload
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