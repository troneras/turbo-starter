# API Tests

This directory contains all tests for the CMS Platform API following Test-Driven Development (TDD) principles.

## Test Structure

```
test/
├── helpers/              # Test utilities and helpers
│   ├── build-app.ts     # Test app factory
│   ├── db.ts            # Database test utilities
│   ├── auth.ts          # Mock authentication helpers
│   └── factories.ts     # Test data factories
├── integration/         # Integration tests
│   ├── api-versioning.test.ts
│   ├── auth/
│   │   ├── login.test.ts
│   │   └── me.test.ts
│   └── users/
│       ├── crud.test.ts
│       └── roles.test.ts
└── unit/               # Unit tests (to be added)
```

## Running Tests

### Prerequisites

First, set up the test database:

```bash
# Start the test database and run migrations
bun run test:setup
```

This will:

1. Start the `postgres_test` container on port 5433
2. Run database migrations on the test database
3. Prepare it for testing

### Running Tests

```bash
# Run all tests (uses test database automatically)
bun run test

# Run specific test file
bun run test test/routes/health.test.ts

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage

# Run only integration tests
bun run test:integration
```

### Database Isolation

Each test automatically gets a **clean database** before it runs. The test helpers will:

1. **Clean all tables** - Remove all data from the previous test
2. **Seed basic data** - Add any default data needed for tests
3. **Close connections** - Properly cleanup database connections

### Manual Database Control

If you need more control over the database state:

```typescript
import { build, buildWithoutCleanDb } from "../helpers/build-app.js";
import { cleanDatabase, setupTestDatabase, getDbStats } from "../helpers/db.js";

test("with auto-clean (default)", async (t) => {
  const app = await build(t); // Automatically cleans DB
  // Test with clean database
});

test("without auto-clean", async (t) => {
  const app = await buildWithoutCleanDb(t); // Keeps existing data
  // Test with existing data
});

test("manual cleanup", async (t) => {
  const app = await buildWithoutCleanDb(t);

  // Do some setup
  await cleanDatabase(); // Manual clean
  // Continue with clean database
});
```

### Teardown

```bash
# Stop the test database when done
bun run test:teardown
```

## Test Implementation Status

### ✅ Completed Tests (Failing - TDD)

1. **API Versioning** (`test/integration/api-versioning.test.ts`)
   - All endpoints should be under `/api/v1/`
   - OpenAPI docs should reflect versioned endpoints
   - Non-versioned API routes should return 404

2. **Database Schema** (`packages/db/test/schema.test.ts`)
   - Users table extensions (Azure AD fields, last_login_at)
   - Service tokens table
   - Permissions table
   - Role permissions junction table

3. **Auth Endpoints**
   - `POST /api/v1/auth/login` - Exchange Azure/service tokens for JWT
   - `GET /api/v1/users/me` - Get current user info

4. **User Management Endpoints**
   - `GET /api/v1/users` - List users (admin only)
   - `POST /api/v1/users` - Create user (admin only)
   - `PATCH /api/v1/users/:id` - Update user (admin only)
   - `DELETE /api/v1/users/:id` - Delete user (admin only)
   - `GET /api/v1/roles` - List all roles

### 🔄 Pending Tests

5. **Unit Tests**
   - Azure AD JWT validation plugin
   - Service token plugin
   - RBAC middleware

6. **Service Token Management**
   - CRUD endpoints for service tokens

7. **Security & Edge Cases**
   - Rate limiting
   - SQL injection prevention
   - Audit logging

## Test Helpers

### Authentication Mocks

- `mockAzureToken()` - Generate mock Azure AD tokens
- `mockServiceToken()` - Generate mock service tokens
- `mockJWT()` - Generate mock JWTs for our API
- `withAuth()` - Add auth header to requests

### Database Helpers

- `cleanDatabase()` - Clear all test data
- `seedTestData()` - Insert basic test data
- `getTestDb()` - Get test database connection

### Data Factories

- `createUser()` - Generate user test data
- `createBrand()` - Generate brand test data
- `createRole()` - Generate role test data
- `createServiceToken()` - Generate service token test data

## Database Configuration

### Test Database Setup

The test suite uses a **separate PostgreSQL database** to ensure complete isolation from development data:

- **Development DB**: `cms_platform_dev` on port 5432
- **Test DB**: `cms_platform_test` on port 5433

### Environment Variables for Testing

The test helpers automatically configure the environment when tests run:

```bash
# What you set in npm scripts:
TEST_DATABASE_URL="postgresql://dev:dev123@localhost:5433/cms_platform_test"

# What the test helpers automatically set for Fastify:
DATABASE_URL="postgresql://dev:dev123@localhost:5433/cms_platform_test"  # ← Points to test DB
JWT_SECRET="test_jwt_secret_for_testing_only"
REDIS_URL="redis://localhost:6379"
NODE_ENV="test"
```

**Important**: The test helpers automatically override `DATABASE_URL` to point to the test database. This ensures that the Fastify `env.ts` plugin connects to the test database instead of your development database.

### Docker Compose Services

```yaml
# Development database
postgres:
  ports: ["5432:5432"]
  environment:
    POSTGRES_DB: cms_platform_dev

# Test database
postgres_test:
  ports: ["5433:5432"] # Note: Different host port
  environment:
    POSTGRES_DB: cms_platform_test
```

## Best Practices

### Writing Tests with Database Isolation

1. **Default behavior** - Use `build(t)` for automatic database cleanup
2. **Performance** - Use `buildWithoutCleanDb(t)` when you need to preserve data between operations
3. **Debugging** - Use `getDbStats()` to check database state
4. **Custom setup** - Modify `seedTestData()` in `test/helpers/db.ts` for default test data

### Example Test Pattern

```typescript
import { test } from "node:test";
import assert from "node:assert";
import { build } from "../helpers/build-app.js";
import { getTestDb } from "../helpers/db.js";

test("user creation flow", async (t) => {
  const app = await build(t); // Clean database
  const db = getTestDb(); // Direct database access

  // Test your API endpoints
  const res = await app.inject({
    method: "POST",
    url: "/api/users",
    payload: { email: "test@example.com" },
  });

  assert.strictEqual(res.statusCode, 201);

  // Verify database state if needed
  const users = await db.select().from(schema.users);
  assert.strictEqual(users.length, 1);
});
```
