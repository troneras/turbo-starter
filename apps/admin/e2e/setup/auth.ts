import type { Page } from 'puppeteer';

export interface TestUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  jwt: string;
}

/**
 * Authenticates a test user in Puppeteer by injecting test credentials
 * @param page - The Puppeteer page instance
 * @param user - The test user to authenticate
 */
export async function authenticateTestUser(page: Page, user: TestUser) {
  // Navigate to the app with test mode enabled
  await page.goto('http://localhost:3000?testMode=true');
  
  // Wait for the page to load
  await page.waitForFunction(() => document.readyState === 'complete');
  
  // Inject test authentication data into localStorage
  await page.evaluate((userData) => {
    localStorage.setItem('test_mode', 'true');
    localStorage.setItem('test_jwt', userData.jwt);
    localStorage.setItem('test_user', JSON.stringify({
      id: userData.id,
      email: userData.email,
      name: userData.name,
      roles: userData.roles,
      permissions: userData.permissions
    }));
    localStorage.setItem('auth_jwt', userData.jwt);
  }, user);
  
  // Reload the page to apply authentication
  await page.reload();
  
  // Wait for authentication to complete
  await page.waitForFunction(() => {
    const jwt = localStorage.getItem('auth_jwt');
    return jwt !== null;
  });
}

/**
 * Logs out the current test user
 * @param page - The Puppeteer page instance
 */
export async function logoutTestUser(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('test_mode');
    localStorage.removeItem('test_jwt');
    localStorage.removeItem('test_user');
    localStorage.removeItem('auth_jwt');
  });
  
  await page.reload();
}

/**
 * Creates a test user object with a mock JWT
 * @param overrides - Partial user data to override defaults
 * @returns A complete test user object
 */
export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  const defaultUser: TestUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    name: 'Test User',
    roles: ['user'],
    permissions: ['users:read'],
    jwt: 'mock-jwt-token-for-testing'
  };
  
  return {
    ...defaultUser,
    ...overrides
  };
}

/**
 * Creates an admin test user
 */
export function createAdminTestUser(): TestUser {
  return createTestUser({
    id: 'admin-test-123',
    email: 'admin@example.com',
    name: 'Admin User',
    roles: ['admin', 'user'],
    permissions: [
      'users:read',
      'users:create',
      'users:update',
      'users:delete',
      'brands:read',
      'brands:create',
      'brands:update',
      'brands:delete',
      'translations:read',
      'translations:create',
      'translations:update',
      'translations:delete',
      'translations:publish'
    ],
    jwt: 'mock-admin-jwt-token'
  });
}

/**
 * Creates an editor test user
 */
export function createEditorTestUser(): TestUser {
  return createTestUser({
    id: 'editor-test-123',
    email: 'editor@example.com',
    name: 'Editor User',
    roles: ['editor', 'user'],
    permissions: [
      'users:read',
      'brands:read',
      'translations:read',
      'translations:create',
      'translations:update'
    ],
    jwt: 'mock-editor-jwt-token'
  });
}