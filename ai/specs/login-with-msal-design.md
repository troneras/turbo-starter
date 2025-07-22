# MSAL Authentication Technical Design

## Overview
Implement Azure AD authentication using MSAL (Microsoft Authentication Library) for the admin application with web flow authentication and dashboard redirection.

## Architecture

### Authentication Flow
1. **Unauthenticated State**: Display login form when user is not authenticated
2. **Authentication Process**: Initiate MSAL web flow (popup or redirect)
3. **Post-Authentication**: Redirect to dashboard and display user account information

## Technical Implementation

### Dependencies
- `@azure/msal-react` - React hooks and components for MSAL
- `@azure/msal-browser` - MSAL browser authentication library

### Components Required

#### 1. Login Page Component
- **Location**: `apps/admin/src/features/auth/pages/LoginPage.tsx`
- **Functionality**: 
  - Display login form/button
  - Trigger MSAL authentication flow
  - Handle authentication state

#### 2. Auth Provider
- **Location**: `apps/admin/src/app/providers/AuthProvider.tsx`
- **Functionality**:
  - Configure MSAL instance
  - Wrap app with MsalProvider
  - Manage authentication context

#### 3. Route Protection
- **Location**: `apps/admin/src/app/layouts/AuthGuard.tsx`
- **Functionality**:
  - Check authentication status
  - Redirect unauthenticated users to login
  - Allow authenticated users to access protected routes

#### 4. User Account Display
- **Location**: `apps/admin/src/components/UserProfile.tsx`
- **Functionality**:
  - Display user account information
  - Show user name, email, avatar
  - Provide logout functionality

### Configuration

#### MSAL Configuration
```typescript
const msalConfig = {
  auth: {
    clientId: process.env.VITE_MSAL_CLIENT_ID,
    authority: process.env.VITE_MSAL_AUTHORITY,
    redirectUri: window.location.origin
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false
  }
}
```

#### Environment Variables
- `VITE_MSAL_CLIENT_ID`: Azure AD application client ID
- `VITE_MSAL_AUTHORITY`: Azure AD authority URL

### Routing Integration

#### Protected Routes
- Use TanStack Router with authentication guards
- Redirect unauthenticated users to `/login`
- Redirect authenticated users from `/login` to `/dashboard`

#### Route Structure
```
/login -> LoginPage (public)
/dashboard -> Dashboard (protected)
/* -> Redirect to /login if not authenticated
```

### State Management
- Use MSAL React hooks for authentication state
- `useIsAuthenticated()` - Check auth status
- `useAccount()` - Get user account information
- `useMsal()` - Access MSAL instance for login/logout

### Security Considerations
- Use secure token storage (sessionStorage)
- Implement proper token refresh handling
- Validate tokens on API requests
- Handle authentication errors gracefully

## API Integration

### Request Interceptor
- Add Bearer token to all API requests
- Handle token refresh automatically
- Redirect to login on 401 responses

### Token Scopes
- Define required API scopes for the application
- Request appropriate permissions during login

## User Experience

### Login Flow
1. User visits protected route
2. Redirect to `/login` if not authenticated
3. Display login button/form
4. Click triggers MSAL popup/redirect flow
5. Complete Azure AD authentication
6. Redirect to `/dashboard` on success

### Dashboard Experience
- Display user account information in header/sidebar
- Show user name and email
- Provide logout button
- Maintain authentication state across page refreshes

## Testing Strategy
- Mock MSAL for unit tests
- Test authentication state transitions
- Test route protection behavior
- Test user account information display