import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { eq, and, count, desc } from 'drizzle-orm'
import { users, roles, userRoles, permissions, rolePermissions } from '@cms/db/schema'
declare module 'fastify' {
    interface FastifyInstance {
        users: ReturnType<typeof usersRepository>
    }
}
interface CreateUserData {
    email: string
    name: string
    roles: string[]
}

interface UpdateUserData {
    name?: string
    email?: string
    roles?: string[]
}

interface ListUsersResult {
    users: Array<{
        id: string
        email: string
        name: string
        roles: string[]
        createdAt: Date
        last_login_at: Date | null
    }>
    total: number
    page: number
    pageSize: number
}

export function usersRepository(fastify: FastifyInstance) {
    // Get user roles
    return {

        async getUserRoles(userId: string): Promise<string[]> {
            const userRoleData = await fastify.db
                .select({
                    roleName: roles.name
                })
                .from(userRoles)
                .innerJoin(roles, eq(userRoles.roleId, roles.id))
                .where(eq(userRoles.userId, userId))

            return userRoleData.map(r => r.roleName)
        },

        // Get user permissions
        async getUserPermissions(userId: string): Promise<string[]> {
            const userPermissionData = await fastify.db
                .select({
                    permissionName: permissions.name
                })
                .from(userRoles)
                .innerJoin(roles, eq(userRoles.roleId, roles.id))
                .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
                .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
                .where(eq(userRoles.userId, userId))

            return [...new Set(userPermissionData.map(p => p.permissionName))]
        },

        // List users with pagination
        async listUsers(page: number = 1, pageSize: number = 20): Promise<ListUsersResult> {
            const offset = (page - 1) * pageSize

            // Get total count
            const [totalResult] = await fastify.db
                .select({ count: count() })
                .from(users)

            // Get users with pagination
            const usersList = await fastify.db
                .select()
                .from(users)
                .orderBy(desc(users.createdAt))
                .limit(pageSize)
                .offset(offset)

            // Get roles for each user
            const usersWithRoles = await Promise.all(
                usersList.map(async (user) => ({
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    roles: await this.getUserRoles(user.id),
                    createdAt: user.createdAt,
                    last_login_at: user.last_login_at
                }))
            )

            return {
                users: usersWithRoles,
                total: totalResult?.count || 0,
                page,
                pageSize
            }
        },

        // Create new user
        async createUser(userData: CreateUserData) {
            // Check if user already exists
            const existingUser = await fastify.db
                .select()
                .from(users)
                .where(eq(users.email, userData.email))
                .limit(1)

            if (existingUser.length > 0) {
                throw new Error('User with this email already exists')
            }

            // Validate roles
            const validRoles = await fastify.db
                .select()
                .from(roles)
                .where(eq(roles.name, userData.roles[0] || 'user'))

            if (validRoles.length === 0) {
                throw new Error('Invalid role specified')
            }

            // Create user
            const [newUser] = await fastify.db
                .insert(users)
                .values({
                    email: userData.email,
                    name: userData.name
                })
                .returning()

            if (!newUser) {
                throw new Error('Failed to create user')
            }

            // Assign roles
            for (const roleName of userData.roles) {
                const [role] = await fastify.db
                    .select()
                    .from(roles)
                    .where(eq(roles.name, roleName))
                    .limit(1)

                if (role) {
                    await fastify.db
                        .insert(userRoles)
                        .values({
                            userId: newUser.id,
                            roleId: role.id
                        })
                }
            }

            return {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                roles: userData.roles
            }
        },

        // Update user
        async updateUser(userId: string, updates: UpdateUserData) {
            // Check if user exists
            const [existingUser] = await fastify.db
                .select()
                .from(users)
                .where(eq(users.id, userId))
                .limit(1)

            if (!existingUser) {
                throw new Error('User not found')
            }

            // Check email uniqueness if updating email
            if (updates.email && updates.email !== existingUser.email) {
                const existingEmailUser = await fastify.db
                    .select()
                    .from(users)
                    .where(eq(users.email, updates.email))
                    .limit(1)

                if (existingEmailUser.length > 0) {
                    throw new Error('User with this email already exists')
                }
            }

            // Update user basic info
            const updateData: any = {}
            if (updates.name) updateData.name = updates.name
            if (updates.email) updateData.email = updates.email

            if (Object.keys(updateData).length > 0) {
                await fastify.db
                    .update(users)
                    .set(updateData)
                    .where(eq(users.id, userId))
            }

            // Update roles if provided
            if (updates.roles) {
                // Remove existing roles
                await fastify.db
                    .delete(userRoles)
                    .where(eq(userRoles.userId, userId))

                // Add new roles
                for (const roleName of updates.roles) {
                    const [role] = await fastify.db
                        .select()
                        .from(roles)
                        .where(eq(roles.name, roleName))
                        .limit(1)

                    if (role) {
                        await fastify.db
                            .insert(userRoles)
                            .values({
                                userId: userId,
                                roleId: role.id
                            })
                    }
                }
            }

            // Return updated user
            const [updatedUser] = await fastify.db
                .select()
                .from(users)
                .where(eq(users.id, userId))
                .limit(1)

            return updatedUser ? {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                roles: updates.roles || await this.getUserRoles(userId)
            } : null
        },

        // Delete user (soft delete)
        async deleteUser(userId: string) {
            // Check if user exists
            const [existingUser] = await fastify.db
                .select()
                .from(users)
                .where(eq(users.id, userId))
                .limit(1)

            if (!existingUser) {
                throw new Error('User not found')
            }

            // For now, we'll do a hard delete of user roles
            // In a production system, you might want to implement soft delete
            await fastify.db
                .delete(userRoles)
                .where(eq(userRoles.userId, userId))

            // Delete the user
            await fastify.db
                .delete(users)
                .where(eq(users.id, userId))
        },
    }
}

export default fp(async function (fastify: FastifyInstance) {
    const repo = usersRepository(fastify)
    fastify.decorate('users', repo)
}, {
    name: 'users',
    dependencies: ['db']
})