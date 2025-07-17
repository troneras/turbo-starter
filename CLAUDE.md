# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a **monorepo** for a CMS & Translation Platform built with:

- **TurboRepo** for monorepo management
- **Bun** runtime and package manager
- **Fastify** API framework with plugin architecture
- **PostgreSQL** with **Drizzle ORM**
- **Redis** for caching and job queuing

### Core Structure

```
apps/
├── api/          # Main Fastify API server
│   ├── src/
│   │   ├── plugins/
│   │   │   ├── external/    # Infrastructure plugins (db, redis, auth, etc.)
│   │   │   └── app/         # Business logic plugins (brands, translations, etc.)
│   │   ├── routes/          # API route handlers
│   │   ├── lib/             # Shared utilities (config, logger, utils)
│   │   ├── app.ts           # App factory with plugin registration
│   │   ├── server.ts        # Server startup
│   │   └── worker.ts        # Background job worker
│   └── test/
packages/
└── db/           # Database schema, migrations, and utilities
    ├── schema/   # Drizzle schema definitions
    ├── migrations/ # Database migrations
    └── seed.ts   # Database seeding
```

## Common Development Commands

### Root-level commands (using Turbo):

- `bun run dev` - Start API in development mode
- `bun run build` - Build all packages
- `bun run lint` - Run linting across all packages
- `bun run check-types` - TypeScript type checking
- `bun run format` - Format code with Prettier
- `bun run db:generate` - Generate database migrations
- `bun run db:migrate` - Run database migrations

### API-specific commands:

- `bun run --filter=api dev` - Start API server in watch mode
- `bun run --filter=api test` - Run API tests
- `bun run --filter=api build` - Build API server
- `bun run --filter=api start` - Start production server
- `bun run --filter=api worker` - Start background worker

### Database commands:

- `bun run --filter=db db:generate` - Generate new migration
- `bun run --filter=db db:migrate` - Apply migrations
- `bun run --filter=db seed` - Seed database

## Key Architecture Patterns

### Plugin System

The API uses Fastify's plugin architecture with two main categories:

- **External plugins** (`plugins/external/`): Infrastructure concerns (DB, Redis, Auth, Security)
- **App plugins** (`plugins/app/`): Business logic (Brands, Translations, Users, Workflow)

### Database Design

Multi-tenant architecture supporting:

- **Brands** - Different product brands
- **Locales** - Languages/regions
- **Jurisdictions** - Legal/regulatory regions
- **Translations** - Content with brand/jurisdiction/locale specificity
- **Releases** - Atomic deployments with rollback capability
- **Feature Flags** - Content visibility control

### API Structure

- Routes organized by domain (`/api/brands`, `/api/translations`, etc.)
- Health check endpoint at `/health`
- Auto-generated OpenAPI docs at `/documentation`
- Webhook endpoints for external integrations
- **TypeBox** for schema validation and type generation
- Shared contracts package (`packages/contracts`) with centralized schemas and types

## Development Environment

### Prerequisites

- Bun runtime (package manager and runtime)
- PostgreSQL and Redis (via `docker-compose.yml`)
- Node.js 18+ (fallback runtime)

### Local Setup

1. `bun install` - Install dependencies
2. `cp .env.example .env` - Configure environment
3. Start services with `docker-compose up -d`
4. Run migrations: `bun run db:migrate`
5. Start API: `bun run dev`

### Environment Configuration

- API runs on port 3000 by default
- Configuration via environment variables (handled by `@fastify/env`)
- Swagger documentation available at `/documentation`

## Database Workflow

### Schema Changes

1. Modify schema in `packages/db/schema/index.ts`
2. Generate migration: `bun run db:generate`
3. Apply migration: `bun run db:migrate`

### Key Tables

- `translations` - Core content with hierarchical overrides
- `releases` - Atomic deployment tracking
- `feature_flags` - Content visibility control
- `users` + `roles` - RBAC system
- `brands` + `locales` + `jurisdictions` - Multi-tenant structure

## Testing & Quality

- Tests: `bun test` (uses Bun's built-in test runner)
- Type checking: `bun run check-types`
- Linting: `bun run lint`
- Code formatting: `bun run format`

## API Development Patterns

### TypeBox Schema Organization

- **Contracts Package**: All schemas and types are centralized in `packages/contracts`
- **Schema Imports**: Import schemas from `@cms/contracts/schemas/{domain}`
- **Type Imports**: Import types from `@cms/contracts/types/{domain}`
- **Common schemas**: `packages/contracts/schemas/common.ts` - Reusable error schemas
- **Domain schemas**: `packages/contracts/schemas/{domain}.ts` - Domain-specific request/response schemas
- **Domain types**: `packages/contracts/types/{domain}.ts` - TypeScript types with TSDoc documentation

### Route Structure Best Practices

```typescript
import type { FastifyInstance } from "fastify";
import {
  RequestSchema,
  ResponseSchema,
  UnauthorizedErrorSchema,
  ForbiddenErrorSchema,
  NotFoundErrorSchema,
  ConflictErrorSchema,
  BadRequestErrorSchema,
} from "@cms/contracts/schemas/domain";
import type { RequestType } from "@cms/contracts/types/domain";

export default async function (fastify: FastifyInstance) {
  fastify.post(
    "/endpoint",
    {
      schema: {
        tags: ["domain"],
        summary: "Clear description",
        security: [{ bearerAuth: [] }], // if auth required
        body: RequestSchema,
        response: {
          201: ResponseSchema, // or 200 for updates
          400: BadRequestErrorSchema,
          401: UnauthorizedErrorSchema, // if auth required
          403: ForbiddenErrorSchema, // if authorization required
          404: NotFoundErrorSchema, // if resource lookup
          409: ConflictErrorSchema, // if uniqueness constraints
        },
      },
      onRequest: [
        fastify.authenticate, // if auth required
        fastify.requireRole("admin"), // if specific role required
      ],
    },
    async (request, reply) => {
      const data = request.body as RequestType;

      try {
        // Implementation logic
        const result = await fastify.serviceName.methodName(data);
        reply.code(201); // for CREATE operations
        return result;
      } catch (error: any) {
        // Handle specific business logic errors
        if (error.message.includes("not found")) {
          return reply.notFound("Resource not found");
        }
        if (error.message.includes("already exists")) {
          return reply.conflict("Resource already exists");
        }
        if (error.message.includes("invalid")) {
          return reply.badRequest(error.message);
        }

        // Let other errors bubble up to global error handler
        throw error;
      }
    }
  );
}
```

### TypeBox Integration

- Use `@sinclair/typebox` with `@fastify/type-provider-typebox`
- Generate TypeScript types with `Static<typeof Schema>`
- Maintain separation between schema validation and business logic validation
- Leverage Fastify's automatic validation for basic schema rules

### Authentication & Authorization Patterns

- Use `fastify.authenticate` decorator for JWT token validation
- Use `fastify.requireRole('role')` decorator for role-based access control
- Authentication automatically throws `fastify.httpErrors.unauthorized()`
- Authorization automatically throws `fastify.httpErrors.forbidden()`
- Both decorators handle error responses with proper schema format

### Error Handling Best Practices

- Use idiomatic Fastify error methods instead of manual error responses:
  - `reply.badRequest(message)` for 400 errors
  - `reply.notFound(message)` for 404 errors
  - `reply.conflict(message)` for 409 errors
- Use specific error schemas from `@fastify/error` for precise OpenAPI documentation
- Let unexpected errors bubble up to global error handler
- Avoid manual `reply.code().send()` for standard HTTP errors

### Custom Commands

- `/refactor-api-endpoint` - Refactor existing endpoints to use TypeBox
- `/write-api-route` - Create new API routes following best practices

## Deployment

- Production build: `bun run build`
- Server: `bun run start`
- Worker: `bun run worker`
- All builds output to `dist/` directory

---

## Shared Contracts Package

The `packages/contracts` contains shared TypeBox schemas and type definitions used across the entire platform (API and admin UI). This eliminates type drift and ensures consistency between backend and frontend.

### Structure

```
packages/contracts/
├── schemas/            # TypeBox schema definitions
│   ├── auth.ts         # Authentication schemas
│   ├── users.ts        # User management schemas
│   ├── brands.ts       # Brand schemas
│   ├── roles.ts        # Role and permission schemas
│   ├── common.ts       # Error responses and shared schemas
│   └── index.ts        # Re-exports all schemas
├── types/              # TypeScript type definitions
│   ├── auth.ts         # Authentication types with TSDoc
│   ├── users.ts        # User management types with TSDoc
│   ├── brands.ts       # Brand types with TSDoc
│   ├── roles.ts        # Role and permission types with TSDoc
│   ├── common.ts       # Common types with TSDoc
│   └── index.ts        # Re-exports all types
├── index.ts            # Main package entry point
├── package.json
└── tsconfig.json
```

### Development Patterns

```typescript
// Define schemas with TypeBox
import { Type } from "@sinclair/typebox";

export const UserSchema = Type.Object({
  id: Type.String({ format: "uuid" }),
  email: Type.String({ format: "email" }),
  name: Type.String({ minLength: 1 }),
  role: Type.Union([
    Type.Literal("admin"),
    Type.Literal("editor"),
    Type.Literal("viewer"),
  ]),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
});

export const CreateUserRequestSchema = Type.Object({
  email: Type.String({ format: "email" }),
  name: Type.String({ minLength: 1 }),
  role: Type.Union([
    Type.Literal("admin"),
    Type.Literal("editor"),
    Type.Literal("viewer"),
  ]),
});

export const GetUsersResponseSchema = Type.Object({
  data: Type.Array(UserSchema),
  total: Type.Number(),
  page: Type.Number(),
  limit: Type.Number(),
});
```

### Usage in API

```typescript
// apps/api/src/routes/users.ts
import {
  UserSchema,
  CreateUserRequestSchema,
} from "@cms/contracts/schemas/users";
import type { CreateUserRequest } from "@cms/contracts/types/users";

export default async function (fastify: FastifyInstance) {
  fastify.post(
    "/users",
    {
      schema: {
        body: CreateUserRequestSchema,
        response: {
          201: UserSchema,
        },
      },
    },
    async (request, reply) => {
      // Request body is automatically validated against schema
      const userData = request.body; // Fully typed
      // Implementation...
    }
  );
}
```

### Usage in Admin UI

```typescript
// apps/admin/src/features/users/hooks/useUsersQuery.ts
import type { Static } from "@sinclair/typebox";
import {
  UserSchema,
  GetUsersResponseSchema,
} from "@cms/contracts/schemas/users";
import type { User, GetUsersResponse } from "@cms/contracts/types/users";

type User = Static<typeof UserSchema>;
type GetUsersResponse = Static<typeof GetUsersResponseSchema>;

export const useUsersQuery = () => {
  return useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<GetUsersResponse> => {
      const response = await apiClient.get<GetUsersResponse>("/api/users");
      return response.data;
    },
  });
};
```

---

## Admin UI Development

The admin application (`apps/admin/`) is a modern React frontend built with Vite and the TanStack ecosystem, featuring a feature-driven architecture for scalability and maintainability.

### Tech Stack

- **Vite** - Build tool and dev server
- **React 18** - UI framework with concurrent features
- **TypeScript** - Type safety and developer experience
- **TanStack Router** - File-based routing with type-safe navigation
- **TanStack Query** - Server state management and caching
- **MSAL** - Azure AD authentication
- **shadcn/ui** - Design system and component library
- **Tailwind CSS** - Utility-first styling
- **React Testing Library + Vitest** - Testing framework

### Directory Structure Philosophy

The admin app follows a **feature-driven, domain-centric architecture**:

```
src/
├── app/           # Application bootstrapping and global concerns
│   ├── providers/ # React context providers (Auth, Query, Theme)
│   ├── router/    # TanStack Router configuration and route tree
│   ├── hooks/     # Global hooks (useAuth, usePermissions)
│   ├── layouts/   # Layout components (Shell, Sidebar, AuthGuard)
│   └── main.tsx   # ReactDOM entry point
│
├── features/      # Domain-specific modules (vertical slices)
│   ├── auth/      # Authentication flows and components
│   ├── users/     # User management domain
│   ├── brands/    # Brand management domain
│   ├── translations/ # Translation workflows
│   ├── releases/  # Release management
│   ├── feature-flags/ # Feature flag controls
│   └── glossary/  # Glossary management
│
├── components/    # Shared, reusable UI components
├── lib/           # Utility functions and configurations
├── types/         # TypeScript type definitions
└── styles/        # Global styles and Tailwind configuration
```

### Feature Module Structure

Each feature follows a consistent internal structure:

```
features/users/
├── pages/         # Route components (lazy-loaded)
│   ├── UsersListPage.tsx
│   ├── UserDetailPage.tsx
│   └── CreateUserPage.tsx
├── components/    # Feature-specific components
│   ├── UserTable.tsx
│   ├── UserForm.tsx
│   └── UserCard.tsx
├── hooks/         # Data fetching and local state hooks
│   ├── useUsersQuery.ts
│   ├── useCreateUser.ts
│   └── useUserPermissions.ts
└── types.ts       # Feature-specific type definitions
```

### Development Commands

#### Admin-specific commands:

- `bun run --filter=admin dev` - Start admin dev server (usually http://localhost:5173)
- `bun run --filter=admin build` - Build admin for production
- `bun run --filter=admin preview` - Preview production build
- `bun run --filter=admin test` - Run admin tests
- `bun run --filter=admin test:ui` - Run tests with UI
- `bun run --filter=admin lint` - Lint admin code
- `bun run --filter=admin type-check` - TypeScript checking

#### shadcn/ui commands:

- `bunx shadcn@canary add button` - Add shadcn/ui components
- `bunx shadcn@canary add form` - Add form components
- `bunx shadcn@canary add data-table` - Add data table components

### Routing Patterns

Use TanStack Router's file-based routing with lazy loading:

```typescript
// features/users/pages/UsersListPage.tsx
import { createRoute } from '@tanstack/react-router'
import { rootRoute } from '@/app/router'

export const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/users',
  component: lazy(() => import('./UsersListPage')),
  loader: async () => {
    // Pre-load data before route renders
    return queryClient.ensureQueryData(usersQueryOptions())
  }
})

// Lazy-loaded component
const UsersListPage = () => {
  const users = useSuspenseQuery(usersQueryOptions())
  return <UserTable data={users.data} />
}

export default UsersListPage
```

### Data Fetching Patterns

#### TanStack Query Integration

```typescript
// features/users/hooks/useUsersQuery.ts
import {
  useQuery,
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import type { Static } from "@sinclair/typebox";
import {
  GetUsersResponseSchema,
  CreateUserRequestSchema,
  UserSchema,
} from "@cms/contracts/schemas/users";
import type {
  GetUsersResponse,
  CreateUserRequest,
  User,
} from "@cms/contracts/types/users";

type GetUsersResponse = Static<typeof GetUsersResponseSchema>;
type CreateUserRequest = Static<typeof CreateUserRequestSchema>;
type User = Static<typeof UserSchema>;

export const usersQueryOptions = () => ({
  queryKey: ["users"] as const,
  queryFn: async (): Promise<GetUsersResponse> => {
    const response = await apiClient.get<GetUsersResponse>("/api/users");
    return response.data;
  },
  staleTime: 5 * 60 * 1000, // 5 minutes
});

export const useUsersQuery = () => useQuery(usersQueryOptions());
export const useUsersSuspenseQuery = () =>
  useSuspenseQuery(usersQueryOptions());

// Mutations with type safety from shared contracts
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: CreateUserRequest): Promise<User> => {
      const response = await apiClient.post<User>("/api/users", userData);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch users list
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};
```

#### API Client Configuration

```typescript
// lib/api.ts
import axios from "axios";
import { useMsal } from "@azure/msal-react";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(async (config) => {
  const { instance, accounts } = useMsal();

  if (accounts.length > 0) {
    const silentRequest = {
      scopes: ["api://cms-platform/access"],
      account: accounts[0],
    };

    try {
      const response = await instance.acquireTokenSilent(silentRequest);
      config.headers.Authorization = `Bearer ${response.accessToken}`;
    } catch (error) {
      console.error("Token acquisition failed:", error);
    }
  }

  return config;
});

export { apiClient };
```

### Authentication & Authorization

#### MSAL Configuration

```typescript
// app/providers/AuthProvider.tsx
import { MsalProvider } from '@azure/msal-react'
import { PublicClientApplication } from '@azure/msal-browser'

const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_MSAL_CLIENT_ID,
    authority: import.meta.env.VITE_MSAL_AUTHORITY,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
}

const msalInstance = new PublicClientApplication(msalConfig)

export const AuthProvider = ({ children }) => (
  <MsalProvider instance={msalInstance}>
    {children}
  </MsalProvider>
)
```

#### RBAC Implementation

```typescript
// app/hooks/useAuth.ts
import { useAccount, useMsal } from '@azure/msal-react'

export const useAuth = () => {
  const { instance, accounts } = useMsal()
  const account = useAccount(accounts[0] || {})

  const logout = () => {
    instance.logoutPopup()
  }

  const hasRole = (role: string): boolean => {
    const roles = account?.idTokenClaims?.roles || []
    return roles.includes(role)
  }

  const hasPermission = (permission: string): boolean => {
    const permissions = account?.idTokenClaims?.permissions || []
    return permissions.includes(permission)
  }

  return {
    user: account,
    isAuthenticated: !!account,
    logout,
    hasRole,
    hasPermission,
  }
}

// components/RequireRole.tsx
interface RequireRoleProps {
  roles: string[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export const RequireRole = ({ roles, children, fallback = null }: RequireRoleProps) => {
  const { hasRole } = useAuth()

  const hasRequiredRole = roles.some(role => hasRole(role))

  return hasRequiredRole ? <>{children}</> : <>{fallback}</>
}
```

### Component Development Patterns

#### Feature Components

```typescript
// features/users/components/UserTable.tsx
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { RequireRole } from '@/components/RequireRole'

interface UserTableProps {
  data: User[]
  onEdit: (user: User) => void
  onDelete: (user: User) => void
}

export const UserTable = ({ data, onEdit, onDelete }: UserTableProps) => {
  const { hasPermission } = useAuth()

  const columns = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'role', header: 'Role' },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          {hasPermission('users:edit') && (
            <Button onClick={() => onEdit(row.original)}>Edit</Button>
          )}
          <RequireRole roles={['admin']}>
            <Button
              variant="destructive"
              onClick={() => onDelete(row.original)}
            >
              Delete
            </Button>
          </RequireRole>
        </div>
      )
    }
  ]

  return <DataTable columns={columns} data={data} />
}
```

#### Shared Components

```typescript
// components/ui/data-table.tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[]
  data: TData[]
}

export function DataTable<TData>({ columns, data }: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
```

### Type Safety

#### Shared Contracts Integration

```typescript
// Using shared TypeBox schemas from @cms/contracts
import type { Static } from "@sinclair/typebox";
import {
  GetUsersResponseSchema,
  CreateUserRequestSchema,
  UserSchema,
} from "@cms/contracts/schemas/users";
import type {
  GetUsersResponse,
  CreateUserRequest,
  User,
} from "@cms/contracts/types/users";

export type GetUsersResponse = Static<typeof GetUsersResponseSchema>;
export type CreateUserRequest = Static<typeof CreateUserRequestSchema>;
export type User = Static<typeof UserSchema>;

// Usage in hooks with full type safety
export const useUsersQuery = (): UseQueryResult<GetUsersResponse> => {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await apiClient.get<GetUsersResponse>("/api/users");
      return response.data;
    },
  });
};

// API client automatically validates responses against contracts
export const useCreateUser = () => {
  return useMutation({
    mutationFn: async (userData: CreateUserRequest) => {
      const response = await apiClient.post<User>("/api/users", userData);
      return response.data;
    },
  });
};
```

### Testing Patterns

#### Component Testing

```typescript
// features/users/components/__tests__/UserTable.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UserTable } from '../UserTable'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('UserTable', () => {
  it('renders user data correctly', () => {
    const mockUsers = [
      { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin' }
    ]

    render(
      <UserTable
        data={mockUsers}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
      { wrapper: createWrapper() }
    )

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })
})
```

#### MSW Setup for API Mocking

```typescript
// tests/setup.ts
import { setupServer } from "msw/node";
import { rest } from "msw";

export const server = setupServer(
  rest.get("/api/users", (req, res, ctx) => {
    return res(
      ctx.json({
        data: [
          { id: 1, name: "John Doe", email: "john@example.com", role: "admin" },
        ],
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Build & Deployment

#### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          router: ["@tanstack/react-router"],
          query: ["@tanstack/react-query"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu"],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
```

### Best Practices

1. **Feature Organization**: Keep related code together in feature modules
2. **Type Safety**: Use shared TypeBox contracts from `@cms/contracts` for all API interactions
3. **Schema Consistency**: Define schemas once in contracts package, use everywhere
4. **Authentication**: Always check permissions at both route and component levels
5. **Performance**: Implement code-splitting and lazy loading for routes
6. **Testing**: Write tests for critical user flows and complex components
7. **Accessibility**: Use semantic HTML and ARIA attributes
8. **Error Handling**: Implement proper error boundaries and user feedback
9. **Code Quality**: Use ESLint, Prettier, and TypeScript strict mode
10. **Contracts First**: Design API contracts before implementation to ensure consistency
