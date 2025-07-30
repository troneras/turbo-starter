import type { FastifyInstance } from 'fastify'
import { users, roles, userRoles, permissions, rolePermissions } from '@cms/db/schema'
import { eq } from 'drizzle-orm'
import jwt from '@fastify/jwt'

interface TestUserOptions {
  email: string
  name: string
  role: 'admin' | 'editor' | 'user' | 'service'
  id?: string
}

interface TestUserResult {
  user: {
    id: string
    email: string
    name: string
  }
  token: string
  role: string
}

/**
 * Create a test user with a specific role and return a JWT token
 */
export async function createTestUser(app: FastifyInstance, options: TestUserOptions): Promise<TestUserResult> {
  const db = app.db
  
  // Generate a unique ID if not provided
  const userId = options.id || crypto.randomUUID()
  
  // Create the user
  const [createdUser] = await db.insert(users).values({
    id: userId,
    email: options.email,
    name: options.name,
    status: 'active',
    is_test_user: true,
    azure_ad_oid: `test-oid-${userId}`,
    azure_ad_tid: 'test-tenant',
    last_login_at: new Date()
  }).returning()

  // Get the role
  const [selectedRole] = await db.select().from(roles).where(eq(roles.name, options.role)).limit(1)
  
  if (!selectedRole) {
    throw new Error(`Role ${options.role} not found in database`)
  }

  // Assign the role to the user
  await db.insert(userRoles).values({
    userId: createdUser.id,
    roleId: selectedRole.id
  })

  // Get all permissions for the role
  const rolePerms = await db
    .select({ permissionName: permissions.name })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, selectedRole.id))

  const permissionNames = rolePerms.map(p => p.permissionName)

  // Create a JWT token for the user
  const tokenPayload = {
    sub: createdUser.id,
    email: createdUser.email,
    name: createdUser.name,
    roles: [options.role],
    permissions: permissionNames
  }

  const token = app.jwt.sign(tokenPayload)

  return {
    user: {
      id: createdUser.id,
      email: createdUser.email,
      name: createdUser.name
    },
    token,
    role: options.role
  }
}

/**
 * Create multiple test users with different roles
 */
export async function createTestUsers(app: FastifyInstance) {
  const timestamp = Date.now()
  
  const adminUser = await createTestUser(app, {
    email: `admin-${timestamp}@test.local`,
    name: 'Test Admin',
    role: 'admin'
  })

  const editorUser = await createTestUser(app, {
    email: `editor-${timestamp}@test.local`,
    name: 'Test Editor', 
    role: 'editor'
  })

  const regularUser = await createTestUser(app, {
    email: `user-${timestamp}@test.local`,
    name: 'Test User',
    role: 'user'
  })

  return {
    admin: adminUser,
    editor: editorUser,
    user: regularUser
  }
}

/**
 * Clean up test users created during tests
 */
export async function cleanupTestUsers(app: FastifyInstance) {
  const db = app.db
  
  // First delete user role assignments for test users
  const testUserIds = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.is_test_user, true))
  
  if (testUserIds.length > 0) {
    await db.delete(userRoles).where(
      eq(userRoles.userId, testUserIds[0].id)
    )
    
    // Delete all user roles for test users
    for (const user of testUserIds) {
      await db.delete(userRoles).where(eq(userRoles.userId, user.id))
    }
  }
  
  // Then delete all test users
  await db.delete(users).where(eq(users.is_test_user, true))
}