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
  - Common schemas (ErrorResponseSchema) go in `apps/api/src/schemas/common.ts`
  - Domain-specific schemas go in `apps/api/src/schemas/{domain}.ts`
  - Keep inline schema structure in routes for clarity

### Step 3: Update Route Structure
Apply this pattern:
```typescript
import type { FastifyInstance } from "fastify";
import { 
    RequestSchema, 
    ResponseSchema, 
    ErrorResponseSchema,
    type RequestType 
} from "../../../schemas/{domain}.js";

export default async function (fastify: FastifyInstance) {
    fastify.{method}('/endpoint', {
        schema: {
            tags: ['domain'],
            summary: 'Clear description',
            body: RequestSchema,
            querystring: QuerySchema, // if needed
            params: ParamsSchema, // if needed
            response: {
                200: SuccessResponseSchema,
                400: ErrorResponseSchema,
                401: ErrorResponseSchema
            }
        }
    }, async (request, reply) => {
        const data = request.body as RequestType
        // Handler logic
    })
}
```

### Step 4: TypeScript Integration
- Import schemas and types from schema files
- Use `Static<typeof Schema>` for type generation
- Maintain type safety throughout the handler
- Keep business logic validation separate from schema validation

### Step 5: Verification
- Run `bun run check-types` to verify TypeScript compilation
- Ensure all imports are correct and types are properly generated