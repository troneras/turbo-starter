# Test Mode Documentation

This document explains the test mode authentication system implemented across the CMS platform for development and automated testing.

## Overview

Test mode provides a way to bypass real authentication (MSAL/Azure AD) during development and E2E testing. It uses mock JWT tokens that are recognized by both the frontend and backend.

## Architecture

### Frontend (Admin UI)

1. **Test Authentication Provider** (`test-auth-provider.tsx`)
   - Mimics the MSAL authentication interface
   - Stores user data in localStorage
   - Provides the same API as production auth

2. **Conditional Auth Provider** (`conditional-auth-provider.tsx`)
   - Automatically switches between MSAL and test auth
   - Transparent to consuming components

3. **Test DevTools** (`test-devtools.tsx`)
   - Floating UI for switching between test users
   - Visible only in test mode
   - Provides quick access to different user roles

### Backend (API)

1. **Test Token Validation** (`auth.ts`)
   - Recognizes tokens starting with `mock-`
   - Returns predefined user data based on token
   - Bypasses database lookups

2. **Modified Authentication Decorator**
   - Checks for test tokens before JWT verification
   - Maintains same user structure for consistency

## Enabling Test Mode

### Frontend

Four ways to enable:

1. **Environment Variable**
   ```bash
   # In apps/admin/.env.local
   VITE_TEST_MODE=true
   ```

2. **Query Parameter**
   ```
   http://localhost:3000?testMode=true
   ```

3. **Query Parameter with Auto-Login**
   ```
   http://localhost:3000?testMode=true&testProfile=admin
   http://localhost:3000?testMode=true&testProfile=editor
   http://localhost:3000?testMode=true&testProfile=user
   ```

4. **LocalStorage**
   ```javascript
   localStorage.setItem('test_mode', 'true')
   ```

### Backend

Set environment variable:
```bash
# In apps/api/.env
TEST_MODE=true
```

### Quick Setup Scripts

```bash
# Enable test mode for frontend
cd apps/admin
./scripts/enable-test-mode.sh

# Enable test mode for backend
cd apps/api
./scripts/enable-test-mode.sh
```

## Predefined Test Users

### Admin User
- **Token**: `mock-admin-jwt-token`
- **Email**: `admin@example.com`
- **Roles**: `['admin', 'user']`
- **Permissions**: All system permissions

### Editor User
- **Token**: `mock-editor-jwt-token`
- **Email**: `editor@example.com`
- **Roles**: `['editor', 'user']`
- **Permissions**: Content management permissions

### Basic User
- **Token**: `mock-user-jwt-token`
- **Email**: `user@example.com`
- **Roles**: `['user']`
- **Permissions**: Read-only permissions

### Custom Users
- **Token Pattern**: `mock-{userId}-jwt-token`
- Creates a basic user with the specified ID
- Default role: `user`
- Default permissions: `['users:read']`

## Using Test DevTools

When test mode is enabled in the frontend:

1. Look for the orange button in the bottom-right corner
2. Click to open the devtools panel
3. Choose from preset users or create custom users
4. The app immediately reflects the new authentication state

Features:
- Shows current authenticated user
- Quick login buttons for common roles
- Custom user creation with specific roles/permissions
- Logout functionality
- Minimizable interface

## E2E Testing with Puppeteer

### Method 1: Direct Authentication

```javascript
import { authenticateTestUser, createAdminTestUser } from '../setup/auth';

// Authenticate as admin
await authenticateTestUser(page, createAdminTestUser());

// Now the page is authenticated and can access protected routes
await page.goto('http://localhost:3000/users');
```

### Method 2: Query Parameter Authentication

```javascript
import { authenticateWithQueryParams } from '../setup/auth';

// Authenticate as admin using query params
await authenticateWithQueryParams(page, 'admin');

// Or navigate directly with authentication
await page.goto('http://localhost:3000/users?testMode=true&testProfile=editor');
```

## External Automation Tools

The query parameter method is particularly useful for external automation tools that can't easily inject localStorage data:

### Selenium Example
```python
driver.get("http://localhost:3000?testMode=true&testProfile=admin")
# User is automatically logged in as admin
```

### Cypress Example
```javascript
cy.visit('http://localhost:3000?testMode=true&testProfile=editor')
// User is automatically logged in as editor
```

### Playwright Example
```javascript
await page.goto('http://localhost:3000?testMode=true&testProfile=user');
// User is automatically logged in as basic user
```

### cURL Example
```bash
# Test API endpoints with authenticated user
curl -H "Authorization: Bearer mock-admin-jwt-token" \
     http://localhost:3000/api/users
```

## Security Considerations

### Development Only
- Test mode should NEVER be enabled in production
- Mock tokens have no cryptographic security
- All test users are synthetic and don't exist in the database

### Clear Indicators
- Orange devtools button shows test mode is active
- Warning messages in the UI
- Log warnings in the API when test tokens are used

### Environment Isolation
- Test mode requires explicit activation
- Not enabled by default in any environment
- Clear documentation of risks

## API Client Integration

The API client (`api-client.ts`) automatically:
- Sends test mode headers when enabled
- Works with both real and mock JWTs
- Maintains consistent error handling

## Testing Workflows

### Manual Testing
1. Enable test mode in both frontend and backend
2. Use devtools to switch between users
3. Test role-based features and permissions

### Automated Testing
1. Set `VITE_TEST_MODE=true` for test runs
2. Use Puppeteer helpers to authenticate
3. Run E2E tests with different user roles

### CI/CD Integration
```yaml
# Example GitHub Actions
env:
  VITE_TEST_MODE: true
  TEST_MODE: true
```

## Troubleshooting

### Test Mode Not Working
1. Check environment variables are set
2. Restart both frontend and backend servers
3. Clear browser localStorage
4. Check browser console for errors

### Authentication Errors
1. Ensure backend TEST_MODE matches frontend
2. Verify mock token format is correct
3. Check API logs for test mode warnings

### DevTools Not Appearing
1. Verify VITE_TEST_MODE is set
2. Check for JavaScript errors
3. Try query parameter method: `?testMode=true`

## Best Practices

1. **Use Specific Test Users**: Don't test everything as admin
2. **Test Permission Boundaries**: Verify unauthorized access is blocked
3. **Clean State**: Logout between test scenarios
4. **Document Test Users**: Keep track of custom test user configurations
5. **Security Reviews**: Regularly audit that test mode isn't enabled in production