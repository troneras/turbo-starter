export interface TestUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  jwt: string;
}

// Cache for test users fetched from API
let cachedTestUsers: Record<string, TestUser> | null = null;

/**
 * Fetch test users from the API endpoint
 */
async function fetchTestUsersFromAPI(): Promise<Record<string, TestUser>> {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/test-users`);
    if (!response.ok) {
      throw new Error(`Failed to fetch test users: ${response.status}`);
    }
    const data = await response.json();
    
    // Filter out undefined users and ensure we have the expected structure
    const testUsers: Record<string, TestUser> = {};
    if (data.admin) testUsers.admin = data.admin;
    if (data.editor) testUsers.editor = data.editor;
    if (data.translator) testUsers.translator = data.translator;
    
    return testUsers;
  } catch (error) {
    console.error('Failed to fetch test users from API, using fallback:', error);
    
    // Fallback to hardcoded users if API fails
    return {
      admin: {
        id: 'fallback-admin-id',
        email: 'admin@example.com',
        name: 'Admin User (Fallback)',
        roles: ['admin'],
        permissions: ['users:read', 'users:create', 'users:update', 'users:delete'],
        jwt: 'mock-admin-jwt-token'
      },
      editor: {
        id: 'fallback-editor-id',
        email: 'editor@example.com',
        name: 'Editor User (Fallback)',
        roles: ['editor'],
        permissions: ['users:read', 'translations:read', 'translations:write'],
        jwt: 'mock-editor-jwt-token'
      },
      translator: {
        id: 'fallback-translator-id',
        email: 'translator@example.com',
        name: 'Translator User (Fallback)',
        roles: ['translator'],
        permissions: ['translations:read', 'translations:write'],
        jwt: 'mock-translator-jwt-token'
      }
    };
  }
}

/**
 * Get test users with caching
 */
export async function getTestUsers(): Promise<Record<string, TestUser>> {
  if (!cachedTestUsers) {
    cachedTestUsers = await fetchTestUsersFromAPI();
  }
  return cachedTestUsers;
}

/**
 * Clear the test users cache (useful for development/testing)
 */
export function clearTestUsersCache(): void {
  cachedTestUsers = null;
}

/**
 * Get a test user by key
 * @param key - The test user key (admin, editor, translator)
 * @returns The test user or undefined
 */
export async function getTestUser(key: string): Promise<TestUser | undefined> {
  const testUsers = await getTestUsers();
  return testUsers[key];
}

/**
 * Get all available test user keys
 * @returns Array of test user keys
 */
export async function getTestUserKeys(): Promise<string[]> {
  const testUsers = await getTestUsers();
  return Object.keys(testUsers);
}