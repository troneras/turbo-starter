# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Admin UI Architecture Overview

This React admin application is part of a CMS & Translation Platform monorepo. It features a modern, type-safe frontend built with the TanStack ecosystem and shadcn/ui components.

### Tech Stack

- **React 19** - Latest React with concurrent features
- **Vite** - Fast build tool and dev server
- **TanStack Router** - Type-safe file-based routing with auto code-splitting
- **TypeScript** - Full type safety
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Modern component library (New York style)
- **MSAL** - Microsoft Authentication Library for Azure AD
- **Axios** - HTTP client with interceptors
- **Vitest + React Testing Library** - Testing framework

### Directory Structure

```
src/
├── app/                    # Application core
│   ├── hooks/              # Global hooks (useAuth, useMobile)
│   ├── layouts/            # Layout components
│   │   ├── shell.tsx       # Main app shell
│   │   ├── auth-layout.tsx # Authentication layout
│   │   ├── auth-guard.tsx  # Route protection
│   │   └── app-sidebar.tsx # Navigation sidebar
│   ├── main.tsx           # React entry point
│   ├── providers/         # Context providers
│   │   ├── auth-provider.tsx
│   │   ├── query-provider.tsx
│   │   └── index.tsx      # Combined providers
│   ├── routes/            # TanStack Router file-based routes
│   │   ├── __root.tsx     # Root route layout
│   │   ├── index.tsx      # Home page
│   │   ├── login.tsx      # Login page
│   │   ├── dashboard.tsx  # Dashboard
│   │   ├── languages.tsx  # Languages management
│   │   └── users.tsx      # Users management
│   └── routeTree.gen.ts   # Auto-generated route tree
├── components/            # Shared components
│   ├── ui/               # shadcn/ui components
│   ├── Header.tsx
│   ├── require-role.tsx  # RBAC component
│   └── user-profile.tsx
├── features/             # Domain-specific feature modules
│   ├── auth/             # Authentication feature
│   │   └── pages/
│   ├── languages/        # Language management feature  
│   │   ├── components/   # Language-specific components
│   │   ├── hooks/        # Language data hooks
│   │   ├── pages/        # Language management pages
│   │   └── types.ts      # Language type definitions
│   └── users/            # User management feature
│       ├── components/   # User-specific components
│       ├── hooks/        # User data hooks
│       ├── pages/        # User management pages
│       └── types.ts      # User type definitions
├── lib/                  # Utilities
│   ├── api-client.ts     # Axios configuration
│   └── utils.ts          # Utility functions (cn)
└── styles/               # CSS files
```

## Development Commands

### Admin-specific commands:
- `bun run dev` - Start dev server on port 3000 (same as Vite default)
- `bun run start` - Alias for dev
- `bun run build` - Build for production (includes TypeScript check)
- `bun run serve` - Preview production build
- `bun run test` - Run tests with Vitest

### From monorepo root:
- `bun run --filter=admin dev` - Start admin dev server
- `bun run --filter=admin build` - Build admin app
- `bun run --filter=admin test` - Run admin tests

### shadcn/ui commands:
- `bunx shadcn@latest add button` - Add shadcn/ui components
- `bunx shadcn@latest add dialog` - Add dialog components
- `bunx shadcn@latest add form` - Add form components

## Key Architecture Patterns

### File-Based Routing

Uses TanStack Router with automatic code splitting and search parameter validation:

```typescript
// src/app/routes/users.tsx
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { UsersPage } from '@/features/users/pages/users-page'

const searchSchema = z.object({
  search: z.string().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
  page: z.number().optional(),
})

export const Route = createFileRoute('/users')({
  component: UsersPage,
  validateSearch: searchSchema, // Ensures type-safe search params
  // Optional: loader for data fetching
  loader: async () => {
    // Pre-load data before component renders
    return await queryClient.fetchQuery(usersQueryOptions)
  }
})
```

#### Route Search Parameter Validation

**Always use Zod schemas** for routes with search parameters to prevent navigation loops:

```typescript
import { z } from 'zod'

// Define schema for search parameters
const searchSchema = z.object({
  search: z.string().optional(),
  page: z.number().optional(),
  status: z.enum(['active', 'inactive']).optional(),
})

export const Route = createFileRoute('/route-name')({
  component: PageComponent,
  validateSearch: searchSchema, // Critical for type safety
})
```

### Provider Architecture

Centralized provider setup with proper ordering:

```typescript
// app/providers/index.tsx
export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>        {/* MSAL authentication */}
      <QueryProvider>     {/* TanStack Query */}
        {children}
      </QueryProvider>
    </AuthProvider>
  );
}
```

### Authentication Flow

1. **MSAL Integration** - Azure AD authentication via popup
2. **Token Interceptor** - Automatic token attachment to API requests
3. **Auth Hook** - `useAuth()` provides authentication state and methods
4. **Route Protection** - `<RequireRole>` component for RBAC

### Layout System

**Conditional Layout Rendering**:
- Authentication routes (`/login`) use `AuthLayout`
- Protected routes use main `Layout` (Shell)
- Layout selection in `__root.tsx` based on pathname

## Authentication & Authorization

### MSAL Configuration

Authentication is handled through Azure AD with MSAL:

```typescript
// Environment variables needed:
// VITE_API_BASE_URL - API server URL
// VITE_MSAL_SCOPES - Azure AD scopes
```

### Auth Hook Usage

```typescript
import { useAuth } from '@/app/hooks/use-auth'

function Component() {
  const { isAuthenticated, user, login, logout, hasRole, hasPermission } = useAuth()

  if (!isAuthenticated) {
    return <LoginButton onClick={login} />
  }

  return (
    <div>
      <p>Welcome, {user?.name}</p>
      {hasRole('admin') && <AdminPanel />}
      {hasPermission('users:edit') && <EditButton />}
      <button onClick={logout}>Logout</button>
    </div>
  )
}
```

### Role-Based Access Control

```typescript
import { RequireRole } from '@/components/require-role'

function AdminSection() {
  return (
    <RequireRole 
      roles={['admin']} 
      fallback={<p>Access denied</p>}
    >
      <AdminContent />
    </RequireRole>
  )
}
```

## API Integration

### API Client Configuration

Axios client with automatic MSAL token injection:

```typescript
// lib/api-client.ts
import { apiClient } from '@/lib/api-client'

// Client automatically:
// - Adds Authorization header with MSAL token
// - Handles token refresh
// - Redirects on 401 errors
// - Has 10 second timeout
```

### Data Fetching Patterns

**Without TanStack Query** (basic):
```typescript
const fetchUsers = async () => {
  const response = await apiClient.get('/users')
  return response.data
}
```

**With TanStack Query** (recommended for future):
```typescript
import { useQuery } from '@tanstack/react-query'
import type { User } from '@cms/contracts/types/users'

const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiClient.get<User[]>('/users')
      return response.data
    }
  })
}
```

## Component Development

### shadcn/ui Integration

Components are configured for "New York" style with:
- Zinc base color
- CSS variables enabled
- Lucide icons
- TypeScript support

```typescript
// Using shadcn/ui components
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'

function MyComponent() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <p>Dialog content</p>
      </DialogContent>
    </Dialog>
  )
}
```

### Utility Functions

```typescript
// lib/utils.ts - Tailwind class merging
import { cn } from '@/lib/utils'

function Component({ className, ...props }) {
  return (
    <div className={cn('default-classes', className)} {...props} />
  )
}
```

## Routing Patterns

### Route Definition

```typescript
// File: src/app/routes/dashboard/users.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/users')({
  component: UsersPage,
  beforeLoad: ({ context, location }) => {
    // Route-level auth checks
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  }
})
```

### Navigation

```typescript
import { Link, useRouter } from '@tanstack/react-router'

function Navigation() {
  const router = useRouter()

  return (
    <nav>
      <Link to="/dashboard" activeProps={{ className: 'active' }}>
        Dashboard
      </Link>
      <button onClick={() => router.navigate({ to: '/users' })}>
        Users
      </button>
    </nav>
  )
}
```

### URL State Synchronization Patterns

**⚠️ CRITICAL**: When syncing component state with URL parameters, follow these patterns to **prevent infinite navigation loops**:

#### ❌ WRONG - Causes Infinite Loop
```typescript
// DON'T include navigate in useEffect dependencies
useEffect(() => {
  navigate({ to: '/page', search: params });
}, [filters, page, navigate]); // ❌ navigate changes on every render
```

#### ✅ CORRECT - Stable Navigation
```typescript
// Use debounced navigation with change detection
useEffect(() => {
  const timeoutId = setTimeout(() => {
    const params: Record<string, any> = {};
    if (filters.search) params.search = filters.search;
    if (page > 1) params.page = page;

    // Only navigate if params actually changed
    const currentSearch = searchParams?.search || '';
    const currentPage = searchParams?.page || 1;
    
    if (filters.search !== currentSearch || page !== currentPage) {
      navigate({
        to: '/page',
        search: params,
        replace: true, // Important: prevents history buildup
      });
    }
  }, 100); // Small debounce

  return () => clearTimeout(timeoutId);
}, [filters.search, page]); // ❌ NO navigate in dependencies
```

#### Required Steps for URL State Sync
1. **Define search schema** in route definition with Zod
2. **Initialize state** from search parameters on mount
3. **Use debounced navigation** to prevent rapid calls
4. **Add change detection** to avoid unnecessary navigation
5. **Remove navigate from dependencies** to prevent loops
6. **Use replace: true** to avoid history buildup

#### Example Implementation
```typescript
// 1. Route with search schema
const searchSchema = z.object({
  search: z.string().optional(),
  page: z.number().optional(),
})

export const Route = createFileRoute('/users')({
  component: UsersPage,
  validateSearch: searchSchema,
})

// 2. Page component with proper URL sync
function UsersPage() {
  const navigate = useNavigate();
  const searchParams = useSearch({ from: '/users' });

  // 3. Initialize from URL params
  const [filters, setFilters] = useState({
    search: searchParams?.search || '',
  });
  const [page, setPage] = useState(searchParams?.page || 1);

  // 4. Stable URL sync
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params: Record<string, any> = {};
      if (filters.search) params.search = filters.search;
      if (page > 1) params.page = page;

      const currentSearch = searchParams?.search || '';
      const currentPage = searchParams?.page || 1;
      
      if (filters.search !== currentSearch || page !== currentPage) {
        navigate({
          to: '/users',
          search: params,
          replace: true,
        });
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [filters.search, page]); // No navigate dependency

  // ... rest of component
}
```

## Feature Module Structure

```
features/
└── users/
    ├── components/         # Feature-specific components
    │   ├── user-table.tsx
    │   ├── user-form.tsx
    │   └── user-card.tsx
    ├── hooks/             # Data fetching hooks
    │   ├── use-users.ts
    │   └── use-create-user.ts
    ├── pages/             # Route components
    │   ├── users-list-page.tsx
    │   └── user-detail-page.tsx
    └── types.ts           # Feature-specific types
```

## Testing Patterns

### Component Testing

```typescript
// features/users/components/__tests__/user-card.test.tsx
import { render, screen } from '@testing-library/react'
import { UserCard } from '../user-card'

describe('UserCard', () => {
  it('renders user information', () => {
    const user = { id: '1', name: 'John Doe', email: 'john@example.com' }
    
    render(<UserCard user={user} />)
    
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })
})
```

### Mock Setup

```typescript
// tests/setup.ts
import { vi } from 'vitest'

// Mock MSAL
vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({
    instance: { loginPopup: vi.fn(), logoutPopup: vi.fn() },
    accounts: []
  }),
  useIsAuthenticated: () => false,
  useAccount: () => null
}))
```

## Environment Configuration

### Required Environment Variables

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3001

# Azure AD Configuration  
VITE_MSAL_SCOPES=api://cms-platform/access

# Test Mode (development only)
VITE_TEST_MODE=false  # Set to 'true' to enable test devtools
```

## Test DevTools

### Overview
The admin app includes a floating devtools panel for testing different user roles during development. This bypasses MSAL authentication and allows quick switching between predefined test users.

### Enabling Test Mode

Test mode can be enabled in three ways:
1. **Environment Variable**: Set `VITE_TEST_MODE=true` in your `.env` file
2. **Query Parameter**: Add `?testMode=true` to the URL
3. **LocalStorage**: Set `localStorage.setItem('test_mode', 'true')`

### Using Test DevTools

When test mode is active:
1. A floating orange button appears in the bottom-right corner
2. Click to open the devtools panel
3. Choose from preset users (Admin, Editor, User) or create custom users
4. The app behaves as if authenticated with the selected user

### Predefined Test Users

- **Admin**: Full system access with all permissions
- **Editor**: Content management permissions (create/edit translations)
- **User**: Read-only access to basic resources

### Security Warning

**NEVER enable test mode in production!** Test authentication bypasses all real security checks and should only be used for development and automated testing.

## Languages Management Feature

### Overview
The Languages feature provides comprehensive management of locales/languages available in the CMS platform. It follows the feature-driven architecture pattern with full CRUD operations, search functionality, and role-based access control.

### Feature Structure
```
features/languages/
├── components/
│   ├── bulk-delete-languages-dialog.tsx    # Bulk deletion with confirmation
│   ├── delete-language-dialog.tsx          # Single language deletion
│   ├── language-form-dialog.tsx            # Create/edit language form
│   ├── languages-bulk-actions.tsx          # Bulk operations toolbar
│   ├── languages-search-bar.tsx            # Real-time search with debouncing
│   └── languages-table.tsx                 # Responsive data table
├── hooks/
│   ├── use-language-selection.ts           # Selection state management
│   └── use-languages.ts                    # API data fetching
├── pages/
│   └── languages-page.tsx                  # Main languages management page
└── types.ts                                # TypeScript definitions
```

### Key Features
- **Full CRUD Operations**: Create, read, update, delete languages
- **Search & Filtering**: Real-time search across language codes and names
- **Bulk Operations**: Select and delete multiple languages
- **Responsive Design**: Desktop table view, mobile card layout
- **Admin-Only Access**: Create/edit/delete operations restricted to admin users
- **Form Validation**: Language code format validation (xx-XX pattern)
- **URL State Sync**: Search and pagination state synced with URL parameters

### Language Schema
Languages follow the standard locale format:

```typescript
type Language = {
  id: number
  code: string    // Format: xx-XX (e.g., en-US, fr-FR)
  name: string    // Human-readable name (e.g., "English (United States)")
}
```

### Access Control
- **Read Access**: All authenticated users can view languages
- **Write Access**: Only admin users can create, edit, or delete languages
- **UI Adaptation**: Action buttons hidden for non-admin users

### Usage Example
```typescript
import { useLanguages } from '@/features/languages/hooks/use-languages'

function LanguageSelector() {
  const { data: languages, isLoading } = useLanguages({
    filters: { search: '' },
    sort: { field: 'name', direction: 'asc' },
    page: 1,
    pageSize: 20
  })

  if (isLoading) return <div>Loading languages...</div>

  return (
    <select>
      {languages?.languages.map(lang => (
        <option key={lang.id} value={lang.code}>
          {lang.name}
        </option>
      ))}
    </select>
  )
}
```

## Users Management Feature

### Overview
The Users feature provides comprehensive user management capabilities including user listing, role assignment, and access control. It integrates with the RBAC system for proper permission handling.

### Feature Structure
Similar to languages feature with user-specific components, hooks, and pages for managing user accounts, roles, and permissions.

### Key Features
- **User Listing**: Searchable, sortable table of all users
- **Role Management**: Assign and modify user roles
- **Status Control**: Activate/deactivate user accounts
- **Search & Filtering**: Filter by role, status, and text search
- **Bulk Operations**: Select and perform actions on multiple users
- **User Profile Editing**: Modify user information and permissions

## Shared Contracts Integration
Import only types from shared contracts to avoid importing full TypeBox library
### Type Safety

```typescript
// Using shared contracts from monorepo
import type { User, CreateUserRequest } from '@cms/contracts/types/users'

// Full type safety between frontend and backend
const createUser = async (userData: CreateUserRequest): Promise<User> => {
  const response = await apiClient.post<User>('/users', userData)
  return response.data
}
```

## Best Practices

### Component Organization
1. **Shared Components** - Place in `components/` for reuse across features
2. **Feature Components** - Keep domain-specific components in feature folders
3. **UI Components** - Use shadcn/ui components from `components/ui/`

### State Management
1. **Authentication** - Managed by MSAL + useAuth hook
2. **Server State** - TanStack Query (when implemented)
3. **Local State** - React useState/useReducer
4. **Form State** - React Hook Form (when added)

### Routing
1. **File-based Routes** - Use TanStack Router's file convention
2. **Route Protection** - Implement in route loaders or beforeLoad
3. **Code Splitting** - Automatic via TanStack Router
4. **Type Safety** - Full route parameter and search param typing

### Performance
1. **Lazy Loading** - Routes are automatically code-split
2. **Asset Optimization** - Vite handles bundling and optimization
3. **Caching** - TanStack Query for server state caching (when implemented)

### Security
1. **RBAC** - Use RequireRole component and hasRole/hasPermission hooks
2. **Token Management** - Automatic via MSAL interceptors
3. **Route Protection** - Protect sensitive routes at the route level
4. **Content Security** - Check permissions before rendering sensitive UI

## Troubleshooting

### Navigation Loop Issues

**Symptoms**: Page hangs, TestDevTools logout causes infinite loops, "Could not find match for from:" errors

**Root Causes**:
1. Including `navigate` function in useEffect dependencies
2. Missing search parameter schemas in route definitions
3. Incorrect useSearch usage without proper route typing
4. Multiple navigation triggers competing with each other

**Solutions Applied**:
1. **Route Schema Validation**: Added Zod schemas to all routes with search parameters
2. **Stable Navigation**: Removed `navigate` from useEffect dependencies
3. **Debounced Updates**: Added timeout-based navigation to prevent rapid calls
4. **Change Detection**: Only navigate when parameters actually change
5. **AuthGuard Stability**: Used useCallback for auth navigation logic
6. **TestAuth Improvements**: Added setTimeout for localStorage cleanup

**Fixed Files**:
- `src/app/routes/users.tsx` - Added search schema
- `src/app/routes/languages.tsx` - Added search schema  
- `src/features/users/pages/users-page.tsx` - Fixed navigation loop
- `src/features/languages/pages/languages-page.tsx` - Fixed navigation loop
- `src/app/layouts/auth-guard.tsx` - Stabilized auth navigation
- `src/app/providers/test-auth-provider.tsx` - Improved logout handling

### Common Development Issues

**Problem**: TypeScript errors about search parameters
**Solution**: Ensure route has `validateSearch` with proper Zod schema

**Problem**: Component state not syncing with URL
**Solution**: Initialize state from `useSearch({ from: '/route' })` parameters

**Problem**: Back button not working correctly
**Solution**: Use `navigate({ replace: true })` for state sync, not history changes

**Problem**: Test logout hanging
**Solution**: Check for navigation loops in useEffect dependencies

### Performance Monitoring

**Build Performance**: 
- Main bundle target: < 800KB gzipped
- Route chunks: Automatic code splitting via TanStack Router
- Build time target: < 10 seconds

**Runtime Performance**:
- Initial page load: < 3 seconds
- Route transitions: < 1 second
- Search responses: < 500ms with debounding