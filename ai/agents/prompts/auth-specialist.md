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
2. **Token Exchange**: Frontend automatically exchanges Azure AD token for internal JWT at `/auth/login`
3. **JWT Storage**: JWT stored in localStorage and attached to subsequent API requests
4. **API Authentication**: Backend validates JWT and checks RBAC permissions
5. **User Creation**: New users auto-created on first login with admin bootstrap logic (first 10 users get admin role)
6. **Audit Logging**: All user management actions logged for compliance

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
- Triggers user creation/update and admin bootstrap logic

**Users Routes**: `apps/api/src/routes/api/users/index.ts`

- `GET /api/users/me` - Current user info endpoint
- `GET /api/users` - Enhanced user search with filters (search, role, status)
- `POST /api/users/bulk-assign-role` - Bulk role assignment
- `POST /api/users/bulk-deactivate` - Bulk user deactivation
- `PATCH /api/users/:id/status` - Toggle user active/inactive status
- All admin-only user management endpoints with comprehensive audit logging

### Frontend Authentication Layer

**Auth Provider**: `apps/admin/src/app/providers/auth-provider.tsx`

- MSAL configuration and initialization
- Environment variables: `VITE_MSAL_CLIENT_ID`, `VITE_MSAL_AUTHORITY`

**Auth Hook**: `apps/admin/src/app/hooks/use-auth.ts`

- Central authentication state management with automatic token exchange
- Automatically exchanges MSAL tokens for backend JWTs on login
- Methods: `login()`, `logout()`, `hasRole(role)`, `hasPermission(permission)`
- State: `isAuthenticated`, `user`, `backendUser`, `isLoading`
- JWT storage in localStorage for persistence

**API Client**: `apps/admin/src/lib/api-client.ts`

- Axios interceptor for JWT token attachment (from localStorage)
- Skips auth headers for login endpoint
- 401 error handling and redirect
- No longer uses MSAL token acquisition

**Route Protection**: `apps/admin/src/app/layouts/auth-guard.tsx`

- Protects routes requiring authentication
- Redirects unauthenticated users to `/login`

**RBAC Component**: `apps/admin/src/components/require-role.tsx`

- Component-level role-based access control
- Usage: `<RequireRole roles={['admin']} fallback={<Denied />}>`

### Database Schema

**Core Tables** (in `packages/db/schema/index.ts`):

1. **users**: User profiles with Azure AD integration and status tracking

   ```sql
   - id (uuid, primary key)
   - email (varchar, unique)
   - name (varchar)
   - azure_ad_oid (varchar, nullable) -- Azure Object ID
   - azure_ad_tid (varchar, nullable) -- Azure Tenant ID
   - last_login_at (timestamp, nullable)
   - status (varchar, default 'active') -- 'active' or 'inactive'
   - created_by (uuid, nullable, references users.id) -- Audit tracking
   - created_at (timestamp, default now())
   - updated_at (timestamp, default now())
   ```

2. **roles**: System roles

   ```sql
   - id (serial, primary key)
   - name (text, unique) -- 'admin', 'editor', 'translator', 'viewer', 'user', 'service'
   - description (text) -- Role description
   ```

3. **permissions**: Granular permissions

   ```sql
   - id (serial, primary key)
   - name (varchar, unique) -- 'users:read', 'users:manage', 'translations:publish'
   - description (text)
   - resource (varchar) -- 'users', 'translations', 'brands', 'content', 'roles'
   - action (varchar) -- 'read', 'create', 'update', 'delete', 'manage', 'assign'
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

7. **user_audit_logs**: Comprehensive audit logging for user management
   ```sql
   - id (serial, primary key)
   - target_user_id (uuid, references users.id) -- User being modified
   - performed_by (uuid, references users.id) -- User performing action
   - action (varchar) -- 'role_assigned', 'role_removed', 'status_changed', etc.
   - old_value (jsonb) -- Previous state
   - new_value (jsonb) -- New state
   - reason (text) -- Optional reason for change
   - is_automatic (boolean, default false) -- System vs manual actions
   - created_at (timestamp, default now())
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

**Azure AD Token Validation** with Admin Bootstrap (`apps/api/src/plugins/external/auth.ts:71`):

```typescript
async validateAzureToken(token: string): Promise<AuthUser> {
  // 1. Decode base64 token (mock for testing)
  // 2. Find or create user in database
  // 3. For new users: determine role via admin bootstrap logic (first 10 get admin)
  // 4. Update last login timestamp and Azure AD fields
  // 5. Log audit event for role assignments
  // 6. Query user roles and permissions
  // 7. Return AuthUser object with full RBAC data
}
```

**Admin Bootstrap Logic** (`apps/api/src/plugins/external/auth.ts:35`):

```typescript
async determineNewUserRole(): Promise<string> {
  return await fastify.db.transaction(async (tx) => {
    // Count current admin users with SELECT FOR UPDATE (race condition protection)
    const adminCount = await tx.select({ count: sql`count(*)` })
      .from(users)
      .innerJoin(userRoles, eq(users.id, userRoles.userId))
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(roles.name, 'admin'))
    
    // First 10 users get admin role, rest get user role
    return adminCount[0].count < 10 ? 'admin' : 'user'
  })
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

**Enhanced Login with Token Exchange** (`apps/admin/src/app/hooks/use-auth.ts:98`):

```typescript
const login = async () => {
  try {
    await instance.loginPopup({
      scopes: [import.meta.env.VITE_MSAL_SCOPES],
    });
    // Token exchange happens automatically in useEffect
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

**Automatic Token Exchange** (`apps/admin/src/app/hooks/use-auth.ts:36`):

```typescript
useEffect(() => {
  const exchangeToken = async () => {
    if (!isAuthenticated || !account || backendUser) return;
    
    // Create Azure token for backend (base64 encoded user info)
    const azureTokenData = {
      email: account.username,
      name: account.name || account.username,
      oid: account.localAccountId,
      tid: account.tenantId,
    };
    
    const azureToken = btoa(JSON.stringify(azureTokenData));
    
    // Exchange with backend
    const response = await apiClient.post('/auth/login', {
      azure_token: azureToken
    });
    
    const { jwt, user, roles, permissions } = response.data;
    localStorage.setItem('auth_jwt', jwt);
    setBackendUser({ ...user, roles, permissions });
  };
  
  exchangeToken();
}, [isAuthenticated, account, instance, backendUser]);
```

**Backend-Based Role Checking** (`apps/admin/src/app/hooks/use-auth.ts:122`):

```typescript
const hasRole = (role: string): boolean => {
  if (!backendUser?.roles) return false;
  return backendUser.roles.includes(role);
};

const hasPermission = (permission: string): boolean => {
  if (!backendUser?.permissions) return false;
  return backendUser.permissions.includes(permission);
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
const azureToken = btoa(JSON.stringify(azureTokenData)); // Browser-compatible
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

### Test Data (`packages/db/seed.ts`)

**Comprehensive Role System**:
- **6 roles**: admin, editor, translator, viewer, user, service
- **16 permissions**: Granular RBAC with user management, translations, content, brands
- **32 role-permission assignments**: Hierarchical permission structure

**Test Users** (8 diverse users for UI testing):
- **Alice Johnson** - Admin + Editor (active, 2 hours ago)
- **Bob Smith** - Editor + Translator (active, 1 day ago) 
- **Carol Davis** - Translator (active, 3 days ago)
- **David Wilson** - Viewer (INACTIVE, 1 week ago)
- **Eve Brown** - Editor (active, 2 weeks ago)
- **Frank Miller** - User, no Azure AD (active, never logged in)
- **Grace Lee** - Editor + Viewer (active, 6 hours ago)
- **Henry Taylor** - Translator (active, 30 minutes ago)

**Key Features**:
- Multiple role assignments per user
- Mix of active/inactive users
- Realistic login timestamps
- Azure AD and local user variations
- Admin bootstrap demonstration ready

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
