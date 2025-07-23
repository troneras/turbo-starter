export interface TestUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  jwt: string;
}

// Test users matching the seeded database records
export const TEST_USERS: Record<string, TestUser> = {
  admin: {
    id: 'f946028c-c1d0-4eee-9772-c766050d4cf7',
    email: 'alice@company.com',
    name: 'Alice Johnson',
    roles: ['admin', 'editor'],
    permissions: [
      'users:read', 'users:create', 'users:update', 'users:delete', 'users:manage',
      'roles:read', 'roles:assign',
      'translations:read', 'translations:write', 'translations:publish', 'translations:review',
      'brands:read', 'brands:write',
      'content:read', 'content:write', 'content:delete'
    ],
    jwt: 'mock-admin-jwt-token'
  },
  editor: {
    id: '69585601-d657-4337-9d9a-1df5ea9487b1',
    email: 'bob@company.com',
    name: 'Bob Smith',
    roles: ['editor', 'translator'],
    permissions: [
      'users:read',
      'roles:read',
      'translations:read', 'translations:write', 'translations:publish', 'translations:review',
      'brands:read',
      'content:read', 'content:write'
    ],
    jwt: 'mock-editor-jwt-token'
  },
  translator: {
    id: '37039c05-3973-4326-a1bd-6afa3f255d58',
    email: 'carol@company.com',
    name: 'Carol Davis',
    roles: ['translator'],
    permissions: [
      'translations:read', 'translations:write',
      'content:read'
    ],
    jwt: 'mock-translator-jwt-token'
  }
};

/**
 * Get a test user by key
 * @param key - The test user key (admin, editor, translator)
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