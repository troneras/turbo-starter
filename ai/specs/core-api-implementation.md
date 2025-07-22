# Core API Spec: Auth & User Management (with Azure AD and Read/Service Tokens)

This specification defines the authentication and user management endpoints for your Fastify-based API, with Microsoft Azure AD SSO integration and support for read/service tokens. All code should follow **Test Driven Development** using Bun’s built-in test runner, and leverage Fastify’s plugin and decorator systems as per the monorepo’s architecture.

---

## Libraries & Plugins to Use

- **Azure AD Auth:**  
  - [`@fastify/passport`](https://github.com/fastify/fastify-passport) with [`passport-azure-ad`](https://www.npmjs.com/package/passport-azure-ad)  
    _OR_  
  - [`@fastify/jwt`](https://github.com/fastify/fastify-jwt) + [`jwks-rsa`](https://www.npmjs.com/package/jwks-rsa) for JWT validation against Azure AD public keys  
  - [MSAL.js](https://github.com/AzureAD/microsoft-authentication-library-for-js) for frontend integration

- **Service Tokens / Read Tokens:**  
  - Custom `service_tokens` table and middleware for API key-style tokens  
  - (Optionally, use Azure AD “client credentials” flow for bot/service accounts)

- **OpenAPI & Validation:**  
  - `@fastify/swagger` for auto-generating docs  
  - Use JSON schema for every route (as in `health/index.ts` or `brands/index.ts`)

---

## API Versioning

- **All endpoints should be under `/api/v1/`**
- Update `apps/api/src/app.ts` to route all requests to `/api/v1/…`
- OpenAPI documentation should reflect versioned endpoints

---

## Endpoints

### `POST /api/v1/auth/login`
- **Description:**  
  Exchange Microsoft OAuth token (from frontend SSO) or (for bots) service token for a JWT session in your API.
- **Body:**  
  - `{ azure_token: string }` **or** `{ service_token: string }`
- **Responses:**  
  - `200 OK` with `{ jwt, user, roles, permissions }`
  - `401 Unauthorized` on invalid token

### `GET /api/v1/users/me`
- **Description:**  
  Return current authenticated user info, roles, permissions.
- **Auth:**  
  - Requires valid JWT (from Azure AD or service token)
- **Response:**  
  - `200 OK` with `{ user: {...}, roles: [...], permissions: [...] }`

### **User Management (Admin-Only)**

- **All endpoints require RBAC check for `admin` role.**
- Use Azure AD groups/roles, mapped to your app’s roles in DB.

#### `GET /api/v1/users`
- List all users

#### `POST /api/v1/users`
- Create a new user (usually by invite, or sync with AD)
- Body: `{ email, name, roles: [...] }`

#### `PATCH /api/v1/users/:id`
- Update user info/roles

#### `DELETE /api/v1/users/:id`
- Remove a user (soft-delete recommended)

#### `GET /api/v1/roles`
- List all possible roles in the system

---

## Implementation Details

- **Decorators/Repositories:**  
  - Implement core business logic as reusable decorators/plugins under `apps/api/src/plugins/app/` (e.g. `users`, `roles`, `auth`).
  - Make user/role info accessible as `fastify.users`, `fastify.roles` etc.
- **External Plugins:**  
  - Add DB, Redis, JWT/JWKS, and (if using) Passport strategies under `apps/api/src/plugins/external/`
- **Schemas:**  
  - Every endpoint **must** use JSON schema for input/output, for validation and OpenAPI docs.
- **API Versioning:**  
  - Enforce `/api/v1/` base path in `app.ts`.

---

## Service Token System

- Add a `service_tokens` table:
  - `id`, `token_hash`, `scope`, `created_by`, `last_used_at`, `status`
- Endpoints to create/revoke/list service tokens (admin-only).
- Service tokens may be passed in `Authorization: Bearer` or custom header.

---

## Testing

- Use Bun’s test runner (`bun test`) for **both unit and integration tests**.
- Tests in `apps/api/test/`, structured by module (`auth/`, `users/`, etc.).
- Use `fastify-inject` to test endpoints and plugin logic.
- Cover RBAC, Azure token validation, service token auth, error cases.

---