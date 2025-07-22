export interface TestUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  jwt: string;
}

// Predefined test users
export const TEST_USERS: Record<string, TestUser> = {
  admin: {
    id: 'admin-test-123',
    email: 'admin@example.com',
    name: 'Admin User',
    roles: ['admin', 'user'],
    permissions: [
      'users:read', 'users:create', 'users:update', 'users:delete',
      'brands:read', 'brands:create', 'brands:update', 'brands:delete',
      'translations:read', 'translations:create', 'translations:update', 'translations:delete', 'translations:publish'
    ],
    jwt: 'mock-admin-jwt-token'
  },
  editor: {
    id: 'editor-test-123',
    email: 'editor@example.com',
    name: 'Editor User',
    roles: ['editor', 'user'],
    permissions: [
      'users:read',
      'brands:read',
      'translations:read', 'translations:create', 'translations:update'
    ],
    jwt: 'mock-editor-jwt-token'
  },
  user: {
    id: 'user-test-123',
    email: 'user@example.com',
    name: 'Basic User',
    roles: ['user'],
    permissions: ['users:read', 'brands:read', 'translations:read'],
    jwt: 'mock-user-jwt-token'
  }
};

/**
 * Get a test user by key
 * @param key - The test user key (admin, editor, user)
 * @returns The test user or undefined
 */
export function getTestUser(key: string): TestUser | undefined {
  return TEST_USERS[key];
}

/**
 * Get all available test user keys
 * @returns Array of test user keys
 */
export function getTestUserKeys(): string[] {
  return Object.keys(TEST_USERS);
}