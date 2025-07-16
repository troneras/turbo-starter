---
description: Generate comprehensive API tests following project patterns and best practices
allowed-tools: edit_file, read_file, codebase_search
---

# API Test Writing Guide

Generate a comprehensive test suite for the specified API endpoint following the established patterns in this project.

## Key Testing Patterns

### 1. **Test Framework Setup (Bun + Jest-compatible)**

```typescript
import { it, describe, expect, afterEach, beforeEach } from "bun:test";
import { build } from "../../helpers/build-app";
import { tableName } from "@cms/db/schema";
import { eq } from "drizzle-orm"; // Always import drizzle operators
```

### 2. **App Lifecycle Management**

```typescript
describe("API Endpoint", () => {
  let app: any;

  beforeEach(async () => {
    app = await build();
    await app.ready();
    // Setup test data here
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    // Clean up environment variables
  });
});
```

### 3. **Environment Variable Management**

Always save and restore environment variables:

```typescript
let originalValue: string;

beforeEach(async () => {
  originalValue = process.env.RATE_LIMIT_MAX || "500";
  process.env.RATE_LIMIT_MAX = "3";
});

afterEach(async () => {
  process.env.RATE_LIMIT_MAX = originalValue;
});
```

## Database Testing Gotchas

### 1. **Foreign Key Constraints**

Many tables require related records. Always check schema dependencies:

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

### 2. **Handle Existing Data**

Tests may run multiple times or in parallel:

```typescript
// Find existing or create new
let testUser
try {
    const existing = await app.db.select().from(users)
        .where(eq(users.email, 'test@example.com')).limit(1)

    if (existing.length > 0) {
        testUser = existing[0]
    } else {
        [testUser] = await app.db.insert(users).values({...}).returning()
    }
} catch (error) {
    // Handle race conditions
    const existing = await app.db.select().from(users)
        .where(eq(users.email, 'test@example.com')).limit(1)
    testUser = existing[0]
}
```

## Authentication Testing Patterns

### 1. **Azure AD Token Testing**

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

### 2. **Service Token Testing**

```typescript
const tokenHash = createHash("sha256").update("raw_token").digest("hex");
// Remember: service tokens need created_by user!
```

## Test Coverage Checklist

### ✅ **Input Validation**

- [ ] Missing required fields (400)
- [ ] Invalid field types (400)
- [ ] Malformed request bodies (400)
- [ ] Both mutually exclusive fields provided (400)

### ✅ **Authentication & Authorization**

- [ ] Valid token success cases (200)
- [ ] Invalid/expired tokens (401)
- [ ] Missing authentication (401)
- [ ] Insufficient permissions (403)

### ✅ **Business Logic**

- [ ] Successful operations (200/201)
- [ ] Edge cases and boundaries
- [ ] State changes (create → update scenarios)
- [ ] Data relationships and cascading effects

### ✅ **Error Handling**

- [ ] Database constraint violations
- [ ] External service failures
- [ ] Race conditions
- [ ] Resource not found (404)

### ✅ **Rate Limiting** (if applicable)

- [ ] Within limits (200)
- [ ] Exceeds limits (429)
- [ ] Rate limit reset behavior

## Response Validation Patterns

### 1. **Structure Validation**

```typescript
expect(response).toHaveProperty("jwt");
expect(response).toHaveProperty("user");
expect(Array.isArray(response.roles)).toBe(true);
```

### 2. **Content Validation**

```typescript
expect(response.user.email).toBe("expected@example.com");
expect(response.statusCode).toBe(200);
expect(JSON.parse(response.payload)).toEqual({
  error: "Expected error message",
});
```

### 3. **JWT Token Validation**

```typescript
// Verify JWT structure
expect(response.jwt.split(".").length).toBe(3);

// Verify JWT contents
const decoded = app.jwt.decode(response.jwt);
expect(decoded.email).toBe("test@example.com");
```

## Rate Limiting Test Pattern

```typescript
// Setup rate limit
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

## Common Import Requirements

```typescript
// Core testing
import { it, describe, expect, afterEach, beforeEach } from "bun:test";

// App setup
import { build } from "../../helpers/build-app"; // Adjust path as needed

// Database
import { users, serviceTokens, roles } from "@cms/db/schema";
import { eq, and } from "drizzle-orm";

// Crypto for tokens
import { createHash } from "crypto";
```

## File Naming Convention

- API tests: `apps/api/test/api/{route-path}/{endpoint}.test.ts`
- App tests: `apps/api/test/app/{feature}.test.ts`

## Your Task

Based on the endpoint specified in $ARGUMENTS, create comprehensive tests covering:

1. **Input validation** for all request parameters
2. **Authentication scenarios** (if auth-protected)
3. **Success cases** with proper response validation
4. **Error cases** with appropriate status codes
5. **Database interactions** with proper foreign key handling
6. **Rate limiting** (if applicable)

Follow the patterns above and ensure all database dependencies are properly handled.

Remember: Always check the database schema for foreign key constraints before creating test data!
