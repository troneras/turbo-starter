import type { Page } from 'puppeteer';
import { getTestUsers, type TestUser } from '../../src/lib/test-users';

// Fallback test users for E2E testing (in case API is not available)
const FALLBACK_TEST_USERS: Record<string, TestUser> = {
  admin: {
    id: 'e2e-admin-id',
    email: 'admin@example.com',
    name: 'Admin User (E2E)',
    roles: ['admin'],
    permissions: ['users:read', 'users:create', 'users:update', 'users:delete'],
    jwt: 'mock-admin-jwt-token'
  },
  editor: {
    id: 'e2e-editor-id',
    email: 'editor@example.com',
    name: 'Editor User (E2E)',
    roles: ['editor'],
    permissions: ['users:read', 'translations:read', 'translations:write'],
    jwt: 'mock-editor-jwt-token'
  },
  translator: {
    id: 'e2e-translator-id',
    email: 'translator@example.com',
    name: 'Translator User (E2E)',
    roles: ['translator'],
    permissions: ['translations:read', 'translations:write'],
    jwt: 'mock-translator-jwt-token'
  }
};

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
 * Get test users with fallback for E2E testing
 */
async function getTestUsersForE2E(): Promise<Record<string, TestUser>> {
  try {
    return await getTestUsers();
  } catch (error) {
    console.warn('Failed to get test users from API, using fallback for E2E:', error);
    return FALLBACK_TEST_USERS;
  }
}

/**
 * Creates an admin test user
 */
export async function createAdminTestUser(): Promise<TestUser> {
  const testUsers = await getTestUsersForE2E();
  return testUsers.admin;
}

/**
 * Creates an editor test user
 */
export async function createEditorTestUser(): Promise<TestUser> {
  const testUsers = await getTestUsersForE2E();
  return testUsers.editor;
}

/**
 * Creates a translator test user (replacing the old "user" type)
 */
export async function createTranslatorTestUser(): Promise<TestUser> {
  const testUsers = await getTestUsersForE2E();
  return testUsers.translator;
}

/**
 * Creates a basic test user (deprecated: use createTranslatorTestUser instead)
 * @deprecated Use createTranslatorTestUser instead
 */
export async function createBasicTestUser(): Promise<TestUser> {
  return createTranslatorTestUser();
}