# E2E Testing with Puppeteer

This directory contains end-to-end tests for the admin application using Puppeteer.

## Test Authentication Solution

The E2E tests bypass MSAL authentication using a test-mode authentication provider that allows direct JWT injection.

### How it Works

1. **Test Mode Detection**: The app checks for test mode via:
   - `VITE_TEST_MODE=true` environment variable
   - `?testMode=true` query parameter
   - `localStorage.getItem('test_mode') === 'true'`

2. **Test Authentication Provider**: When in test mode, the app uses `TestAuthProvider` instead of MSAL
   - Allows direct injection of test users with roles/permissions
   - Bypasses Azure AD authentication flow
   - Maintains the same auth interface as production

3. **Puppeteer Integration**: Tests can authenticate by:
   - Setting test user data in localStorage
   - Providing a mock JWT token
   - Specifying roles and permissions for testing

## Running E2E Tests

```bash
# Install dependencies
bun install

# Run E2E tests (headless)
bun run test:e2e

# Run E2E tests with visible browser
bun run test:e2e:ui

# Run specific test file
bun run test:e2e auth.test.ts
```

## Writing E2E Tests

### Basic Test Structure

```typescript
import { describe, it, expect } from 'vitest';
import { setupTest, teardownTest } from '../helpers/test-helpers';

describe('My Feature', () => {
  let context;

  afterEach(async () => {
    if (context) await teardownTest(context);
  });

  it('should do something', async () => {
    // Setup with admin user
    context = await setupTest();
    
    // Your test code here
    await context.page.click('button');
    
    // Assertions
    expect(await context.page.title()).toBe('Expected Title');
  });
});
```

### Authentication Options

```typescript
// Authenticate as admin (default)
context = await setupTest();

// Authenticate as specific user
context = await setupTest(createEditorTestUser());

// Custom user
context = await setupTest(createTestUser({
  name: 'Custom User',
  roles: ['custom-role'],
  permissions: ['custom:permission']
}));

// No authentication
context = await setupTest(false);
```

### Helper Functions

- `waitAndClick(page, selector)` - Wait for element and click
- `waitAndType(page, selector, text)` - Wait for element and type
- `elementExists(page, selector)` - Check if element exists
- `getTextContent(page, selector)` - Get element text
- `takeScreenshot(page, name)` - Take debug screenshot

## Test Users

Pre-configured test users are available:

- `createTestUser()` - Basic user with minimal permissions
- `createAdminTestUser()` - Admin with all permissions
- `createEditorTestUser()` - Editor with content permissions

## Environment Variables

- `HEADLESS=false` - Show browser during tests
- `SLOW_MO=100` - Slow down operations (ms)
- `DEVTOOLS=true` - Open Chrome DevTools
- `BASE_URL=http://localhost:3000` - Target URL

## Debugging

1. **Screenshots**: Failed tests save screenshots to `e2e/screenshots/`
2. **Console Logs**: Page errors are logged to test output
3. **Slow Mode**: Use `SLOW_MO=500` to slow down actions
4. **DevTools**: Use `DEVTOOLS=true` to inspect during tests

## Security Notes

- Test mode is only enabled when explicitly requested
- Test authentication bypasses all real authentication
- Never deploy with `VITE_TEST_MODE=true` in production
- Mock JWT tokens have no real authentication value