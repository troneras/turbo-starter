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

```bash
# Run all tests
bun test

# Run specific test file
bun test test/integration/auth/login.test.ts

# Run tests in watch mode
bun test --watch
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