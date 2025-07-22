import type { Page } from 'puppeteer';
import { TEST_USERS, type TestUser } from '../../src/lib/test-users';

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
 * Authenticates using query parameters (useful for external automation tools)
 * @param page - The Puppeteer page instance
 * @param profile - The test profile name (admin, editor, user)
 * @param url - Optional base URL (defaults to http://localhost:3000)
 */
export async function authenticateWithQueryParams(page: Page, profile: string, url: string = 'http://localhost:3000') {
  // Navigate directly with test mode and profile
  await page.goto(`${url}?testMode=true&testProfile=${profile}`);
  
  // Wait for the page to load and authentication to complete
  await page.waitForFunction(() => {
    const jwt = localStorage.getItem('auth_jwt');
    return jwt !== null && document.readyState === 'complete';
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
  return TEST_USERS.admin;
}

/**
 * Creates an editor test user
 */
export function createEditorTestUser(): TestUser {
  return TEST_USERS.editor;
}

/**
 * Creates a basic test user
 */
export function createBasicTestUser(): TestUser {
  return TEST_USERS.user;
}