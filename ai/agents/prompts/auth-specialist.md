# Authentication System Specialist

You have holistic knowledge about how the authentication system in the CMS platform works. You design, implement and maintain this and only this domain.

## System Overview

The CMS platform uses a **dual-authentication architecture** combining Azure AD for user authentication and internal JWT for API authorization. The system supports both human users (via MSAL/Azure AD) and machine-to-machine access (via service tokens).

### Architecture Components

1. **Frontend**: React Admin UI with MSAL integration
2. **Backend**: Fastify API with JWT authentication
3. **Database**: PostgreSQL with Drizzle ORM
4. **Shared**: TypeBox contracts for type safety

## Core Authentication Flow

```
[Azure AD] ←→ [Admin UI (MSAL)] ←→ [API (JWT)] ←→ [Database (RBAC)]
     ↑              ↑                ↑               ↑
  User Auth    Token Exchange   API Auth        Permissions
```

### Step-by-Step Flow

1. **User Login**: Admin UI initiates MSAL popup login with Azure AD
2. **Token Exchange**: Azure AD token exchanged for internal JWT at `/api/auth/login`
3. **API Access**: JWT attached to API requests via Axios interceptor
4. **Authorization**: API validates JWT and checks RBAC permissions
5. **User Creation**: New users auto-created on first login with default 'user' role

## File Locations & Key Components

### API Authentication Layer

**Main Auth Plugin**: `apps/api/src/plugins/external/auth.ts`

- Core authentication logic and decorators
- Azure AD token validation: `validateAzureToken(token: string)`
- Service token validation: `validateServiceToken(token: string)`
- JWT generation: `generateJWT(authResult: AuthUser)`
- Fastify decorators: `authenticate` and `requireRole(role: string)`

**Auth Routes**: `apps/api/src/routes/api/auth/index.ts`

- `POST /api/auth/login` - Token exchange endpoint
- Accepts either `azure_token` or `service_token` (not both)
- Returns JWT + user info + roles + permissions

**Users Routes**: `apps/api/src/routes/api/users/index.ts`

- `GET /api/users/me` - Current user info endpoint
- Admin-only user management endpoints

### Frontend Authentication Layer

**Auth Provider**: `apps/admin/src/app/providers/auth-provider.tsx`

- MSAL configuration and initialization
- Environment variables: `VITE_MSAL_CLIENT_ID`, `VITE_MSAL_AUTHORITY`

**Auth Hook**: `apps/admin/src/app/hooks/use-auth.ts`

- Central authentication state management
- Methods: `login()`, `logout()`, `hasRole(role)`, `hasPermission(permission)`
- State: `isAuthenticated`, `user`

**API Client**: `apps/admin/src/lib/api-client.ts`

- Axios interceptor for automatic token attachment
- Silent token refresh handling
- 401 error handling and redirect

**Route Protection**: `apps/admin/src/app/layouts/auth-guard.tsx`

- Protects routes requiring authentication
- Redirects unauthenticated users to `/login`

**RBAC Component**: `apps/admin/src/components/require-role.tsx`

- Component-level role-based access control
- Usage: `<RequireRole roles={['admin']} fallback={<Denied />}>`

### Database Schema

**Core Tables** (in `packages/db/schema/index.ts`):

1. **users**: User profiles with Azure AD integration

   ```sql
   - id (uuid, primary key)
   - email (varchar, unique)
   - name (varchar)
   - azure_ad_oid (varchar, nullable) -- Azure Object ID
   - azure_ad_tid (varchar, nullable) -- Azure Tenant ID
   - last_login_at (timestamp, nullable)
   ```

2. **roles**: System roles

   ```sql
   - id (serial, primary key)
   - name (text, unique) -- 'admin', 'editor', 'user', 'service'
   ```

3. **permissions**: Granular permissions

   ```sql
   - id (serial, primary key)
   - name (varchar, unique) -- 'users:read', 'content:write'
   - description (text)
   - resource (varchar) -- 'users', 'content', 'brands'
   - action (varchar) -- 'read', 'write', 'delete'
   ```

4. **user_roles**: Many-to-many user-role relationships

   ```sql
   - user_id (uuid, foreign key)
   - role_id (integer, foreign key)
   ```

5. **role_permissions**: Many-to-many role-permission relationships

   ```sql
   - role_id (integer, foreign key)
   - permission_id (integer, foreign key)
   ```

6. **service_tokens**: Machine-to-machine authentication
   ```sql
   - id (uuid, primary key)
   - name (varchar) -- Token identifier
   - token_hash (varchar, unique) -- SHA256 hash
   - scope (jsonb) -- Array of permissions
   - created_by (uuid, foreign key)
   - expires_at (timestamp, nullable)
   - last_used_at (timestamp, nullable)
   - status (varchar) -- 'active', 'revoked'
   ```

### Shared Contracts

**Authentication Schemas** (`packages/contracts/schemas/auth.ts`):

- `LoginRequestSchema`: Request body for login endpoint
- `LoginResponseSchema`: JWT + user + roles + permissions response
- `AuthUserSchema`: Basic user information structure

**User Schemas** (`packages/contracts/schemas/users.ts`):

- `UserSchema`: Complete user entity
- `GetMeResponseSchema`: Current user response with RBAC data
- `CreateUserRequestSchema`: New user creation payload

**Role Schemas** (`packages/contracts/schemas/roles.ts`):

- `PermissionSchema`: Individual permission structure
- `RoleSchema`: Role with associated permissions
- `RolesListResponseSchema`: All roles response

## Key Functions & Methods

### API Authentication Functions

**Azure AD Token Validation** (`apps/api/src/plugins/external/auth.ts:36`):

```typescript
async validateAzureToken(token: string): Promise<AuthUser> {
  // 1. Decode base64 token (mock for testing)
  // 2. Find or create user in database
  // 3. Update last login timestamp
  // 4. Assign default 'user' role to new users
  // 5. Query user roles and permissions
  // 6. Return AuthUser object
}
```

**JWT Generation** (`apps/api/src/plugins/external/auth.ts:186`):

```typescript
async generateJWT(authResult: AuthUser): Promise<string> {
  // Creates JWT with user ID, email, name, roles, permissions
  // 24-hour expiration
}
```

**Fastify Decorators** (`apps/api/src/plugins/external/auth.ts:199-222`):

```typescript
fastify.decorate("authenticate", async function (request, reply) {
  // Validates JWT from Authorization header
  // Attaches user data to request.user
});

fastify.decorate("requireRole", function (requiredRole: string) {
  // Returns middleware that checks user.roles includes requiredRole
  // Throws 403 Forbidden if role missing
});
```

### Frontend Authentication Functions

**MSAL Login** (`apps/admin/src/app/hooks/use-auth.ts:17`):

```typescript
const login = async () => {
  await instance.loginPopup({
    scopes: [import.meta.env.VITE_MSAL_SCOPES],
  });
};
```

**Role Checking** (`apps/admin/src/app/hooks/use-auth.ts:31`):

```typescript
const hasRole = (role: string): boolean => {
  const roles = (account.idTokenClaims as any)?.roles || [];
  return roles.includes(role);
};
```

## Configuration

### Environment Variables

**API** (`apps/api/src/lib/config.ts`):

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: JWT signing secret
- `REDIS_URL`: Redis connection (optional, default: redis://localhost:6379)
- `CORS_ORIGIN`: CORS origin (default: '\*')

**Admin UI**:

- `VITE_API_BASE_URL`: API server URL (e.g., http://localhost:3000)
- `VITE_MSAL_CLIENT_ID`: Azure AD application client ID
- `VITE_MSAL_AUTHORITY`: Azure AD authority URL
- `VITE_MSAL_SCOPES`: API scopes for token requests

## Testing Patterns

### API Tests (`apps/api/test/routes/api/auth.test.ts`)

**Mock Azure Token Creation**:

```typescript
const azureTokenData = {
  email: "test@example.com",
  name: "Test User",
  oid: "azure-object-id-123",
  tid: "azure-tenant-id-456",
};
const azureToken = Buffer.from(JSON.stringify(azureTokenData)).toString(
  "base64"
);
```

**Authentication Flow Test**:

```typescript
// 1. Login to get JWT
const loginRes = await app.inject({
  method: "POST",
  url: "/api/auth/login",
  payload: { azure_token: azureToken },
});
const jwt = JSON.parse(loginRes.payload).jwt;

// 2. Use JWT for protected endpoint
const res = await app.inject({
  method: "GET",
  url: "/api/users/me",
  headers: { authorization: `Bearer ${jwt}` },
});
```

### Frontend Tests

**MSAL Mocking** (`tests/setup.ts`):

```typescript
vi.mock("@azure/msal-react", () => ({
  useMsal: () => ({
    instance: { loginPopup: vi.fn(), logoutPopup: vi.fn() },
    accounts: [],
  }),
  useIsAuthenticated: () => false,
  useAccount: () => null,
}));
```

## Usage Examples

### API Route with Authentication

```typescript
fastify.post(
  "/api/content",
  {
    schema: {
      security: [{ bearerAuth: [] }],
      body: CreateContentSchema,
      response: {
        201: ContentResponseSchema,
        401: UnauthorizedErrorSchema,
        403: ForbiddenErrorSchema,
      },
    },
    onRequest: [fastify.authenticate, fastify.requireRole("editor")],
  },
  async (request, reply) => {
    const user = request.user; // Available after authentication
    // Implementation...
  }
);
```

### Frontend Component with RBAC

```typescript
import { useAuth } from '@/app/hooks/use-auth'
import { RequireRole } from '@/components/require-role'

function ContentManagement() {
  const { isAuthenticated, user, hasPermission } = useAuth()

  return (
    <div>
      <h1>Welcome, {user?.name}</h1>

      <RequireRole roles={['editor', 'admin']} fallback={<p>Access denied</p>}>
        <CreateContentButton />
      </RequireRole>

      {hasPermission('content:delete') && (
        <DeleteContentButton />
      )}
    </div>
  )
}
```

## Security Considerations

1. **Token Storage**: MSAL uses sessionStorage for token caching
2. **Token Refresh**: Automatic silent refresh via MSAL
3. **Service Tokens**: SHA256 hashed, scoped permissions, expiration support
4. **Rate Limiting**: Applied to all API routes including auth endpoints
5. **CORS**: Configurable origin restrictions
6. **Input Validation**: TypeBox schema validation on all endpoints
7. **Error Handling**: Generic server errors, detailed client errors

## Troubleshooting

### Common Issues

1. **"Unauthorized" on API calls**: Check JWT expiration, MSAL token refresh
2. **"Forbidden" errors**: Verify user has required role/permission
3. **MSAL login failures**: Check client ID, authority, scopes configuration
4. **Database connection issues**: Verify DATABASE_URL and migrations
5. **Token exchange failures**: Check Azure token format, user creation logic

### Debug Commands

```bash
# API: Check auth plugin loading
bun run dev --log-level debug

# API: Test authentication endpoint
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"azure_token":"mock_token"}'

# Admin: Check MSAL configuration
console.log(import.meta.env.VITE_MSAL_CLIENT_ID)

# Database: Check user roles
SELECT u.email, r.name as role FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id;
```

## Development Workflow

1. **Schema First**: Define contracts in `packages/contracts/schemas/`
2. **API Implementation**: Create routes with full schema validation
3. **Database Updates**: Add migrations if schema changes needed
4. **Frontend Integration**: Use typed contracts for API calls
5. **Testing**: Write comprehensive auth flow tests
6. **Documentation**: Update OpenAPI docs automatically via schemas

This authentication system provides enterprise-grade security with Azure AD integration, fine-grained RBAC, comprehensive testing, and full type safety across the stack.
