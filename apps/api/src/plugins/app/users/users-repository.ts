import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { eq, and, count, desc, asc, or, ilike, sql, inArray } from 'drizzle-orm'
import { users, roles, userRoles, permissions, rolePermissions, userAuditLogs } from '@cms/db/schema'
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

interface ListUsersFilters {
    search?: string
    role?: string
    status?: 'active' | 'inactive'
}

interface ListUsersResult {
    users: Array<{
        id: string
        email: string
        name: string
        roles: string[]
        status: string
        createdAt: Date
        last_login_at: Date | null
    }>
    total: number
    page: number
    pageSize: number
}

interface BulkOperationResult {
    success: boolean
    processedCount: number
    skippedCount: number
    errors: Array<{
        userId: string
        error: string
    }>
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

        // List users with pagination, search, and filtering
        async listUsers(page: number = 1, pageSize: number = 20, filters: ListUsersFilters & { sortBy?: string, sortDirection?: 'asc' | 'desc' } = {}): Promise<ListUsersResult> {
            const offset = (page - 1) * pageSize
            const { search, role, status, sortBy = 'createdAt', sortDirection = 'desc' } = filters

            // Build base query with joins for role filtering if needed
            let baseQuery = fastify.db
                .select({
                    id: users.id,
                    email: users.email,
                    name: users.name,
                    status: users.status,
                    createdAt: users.createdAt,
                    last_login_at: users.last_login_at
                })
                .from(users)
            
            // Apply role filter by joining with user_roles and roles
            if (role) {
                baseQuery = baseQuery
                    .innerJoin(userRoles, eq(users.id, userRoles.userId))
                    .innerJoin(roles, eq(userRoles.roleId, roles.id))
                    .where(eq(roles.name, role)) as any
            }

            // Build where conditions
            const whereConditions = []
            
            // Text search on name or email using PostgreSQL full-text search
            if (search) {
                whereConditions.push(
                    or(
                        sql`to_tsvector('english', ${users.name}) @@ plainto_tsquery('english', ${search})`,
                        sql`to_tsvector('english', ${users.email}) @@ plainto_tsquery('english', ${search})`,
                        ilike(users.name, `%${search}%`),
                        ilike(users.email, `%${search}%`)
                    )
                )
            }

            // Status filter
            if (status) {
                whereConditions.push(eq(users.status, status))
            }

            // Apply where conditions
            if (whereConditions.length > 0) {
                baseQuery = baseQuery.where(
                    whereConditions.length === 1 
                        ? whereConditions[0] 
                        : and(...whereConditions)
                ) as any
            }

            // Get total count with same filters
            let countQuery = fastify.db
                .select({ count: count() })
                .from(users)
            
            if (role) {
                countQuery = countQuery
                    .innerJoin(userRoles, eq(users.id, userRoles.userId))
                    .innerJoin(roles, eq(userRoles.roleId, roles.id))
                    .where(eq(roles.name, role)) as any
            }

            if (whereConditions.length > 0 && !role) {
                countQuery = countQuery.where(
                    whereConditions.length === 1 
                        ? whereConditions[0] 
                        : and(...whereConditions)
                ) as any
            }

            const [totalResult] = await countQuery

            // Get users with pagination and sorting
            // Map sortBy field names to database columns
            const sortColumn = (() => {
                switch (sortBy) {

                    case 'name': return users.name
                    case 'email': return users.email
                    case 'lastLoginAt': return users.last_login_at
                    case 'createdAt': 
                    default: return users.createdAt
                }
            })()

            const usersList = await baseQuery
                .orderBy(sortDirection === 'asc' ? asc(sortColumn) : desc(sortColumn))
                .limit(pageSize)
                .offset(offset)

            // Get roles for each user (deduplicate if role filtering was applied)
            const uniqueUsers = role 
                ? usersList.filter((user, index, self) => 
                    index === self.findIndex(u => u.id === user.id)
                  )
                : usersList

            const usersWithRoles = await Promise.all(
                uniqueUsers.map(async (user) => ({
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    roles: await this.getUserRoles(user.id),
                    status: user.status || 'active',
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

        // Update user status
        async updateUserStatus(userId: string, status: 'active' | 'inactive', performedBy?: string) {
            // Check if user exists
            const [existingUser] = await fastify.db
                .select()
                .from(users)
                .where(eq(users.id, userId))
                .limit(1)

            if (!existingUser) {
                throw new Error('User not found')
            }

            const oldStatus = existingUser.status || 'active'
            
            // Update user status
            await fastify.db
                .update(users)
                .set({ 
                    status,
                    updatedAt: new Date()
                })
                .where(eq(users.id, userId))

            // Log audit event if performer specified
            if (performedBy && oldStatus !== status) {
                await fastify.db
                    .insert(userAuditLogs)
                    .values({
                        targetUserId: userId,
                        performedBy,
                        action: 'status_changed',
                        oldValue: JSON.stringify({ status: oldStatus }),
                        newValue: JSON.stringify({ status }),
                        reason: null,
                        isAutomatic: false
                    })
            }

            return {
                id: userId,
                email: existingUser.email,
                name: existingUser.name,
                status
            }
        },

        // Bulk assign role to users
        async bulkAssignRole(userIds: string[], roleName: string, performedBy: string, reason?: string): Promise<BulkOperationResult> {
            const results: BulkOperationResult = {
                success: true,
                processedCount: 0,
                skippedCount: 0,
                errors: []
            }

            // Validate role exists
            const [role] = await fastify.db
                .select()
                .from(roles)
                .where(eq(roles.name, roleName))
                .limit(1)

            if (!role) {
                results.success = false
                results.errors = userIds.map(id => ({ userId: id, error: 'Role not found' }))
                results.skippedCount = userIds.length
                return results
            }

            // Process each user in a transaction
            await fastify.db.transaction(async (tx) => {
                for (const userId of userIds) {
                    try {
                        // Check if user exists
                        const [user] = await tx
                            .select()
                            .from(users)
                            .where(eq(users.id, userId))
                            .limit(1)

                        if (!user) {
                            results.errors.push({ userId, error: 'User not found' })
                            results.skippedCount++
                            continue
                        }

                        // Check if user already has the role
                        const [existingRole] = await tx
                            .select()
                            .from(userRoles)
                            .where(and(
                                eq(userRoles.userId, userId),
                                eq(userRoles.roleId, role.id)
                            ))
                            .limit(1)

                        if (existingRole) {
                            results.skippedCount++
                            continue
                        }

                        // Assign role
                        await tx
                            .insert(userRoles)
                            .values({
                                userId,
                                roleId: role.id
                            })

                        // Log audit event
                        await tx
                            .insert(userAuditLogs)
                            .values({
                                targetUserId: userId,
                                performedBy,
                                action: 'role_assigned',
                                oldValue: null,
                                newValue: JSON.stringify({ role: roleName }),
                                reason,
                                isAutomatic: false
                            })

                        results.processedCount++
                    } catch (error) {
                        results.errors.push({ 
                            userId, 
                            error: error instanceof Error ? error.message : 'Unknown error'
                        })
                        results.skippedCount++
                    }
                }
            })

            results.success = results.errors.length === 0
            return results
        },

        // Bulk deactivate users
        async bulkDeactivateUsers(userIds: string[], performedBy: string, reason?: string): Promise<BulkOperationResult> {
            const results: BulkOperationResult = {
                success: true,
                processedCount: 0,
                skippedCount: 0,
                errors: []
            }

            // Process each user in a transaction
            await fastify.db.transaction(async (tx) => {
                for (const userId of userIds) {
                    try {
                        // Prevent self-deactivation
                        if (userId === performedBy) {
                            results.errors.push({ userId, error: 'Cannot deactivate yourself' })
                            results.skippedCount++
                            continue
                        }

                        // Check if user exists and get current status
                        const [user] = await tx
                            .select()
                            .from(users)
                            .where(eq(users.id, userId))
                            .limit(1)

                        if (!user) {
                            results.errors.push({ userId, error: 'User not found' })
                            results.skippedCount++
                            continue
                        }

                        const currentStatus = user.status || 'active'

                        if (currentStatus === 'inactive') {
                            results.skippedCount++
                            continue
                        }

                        // Update user status
                        await tx
                            .update(users)
                            .set({ 
                                status: 'inactive',
                                updatedAt: new Date()
                            })
                            .where(eq(users.id, userId))

                        // Log audit event
                        await tx
                            .insert(userAuditLogs)
                            .values({
                                targetUserId: userId,
                                performedBy,
                                action: 'status_changed',
                                oldValue: JSON.stringify({ status: currentStatus }),
                                newValue: JSON.stringify({ status: 'inactive' }),
                                reason,
                                isAutomatic: false
                            })

                        results.processedCount++
                    } catch (error) {
                        results.errors.push({ 
                            userId, 
                            error: error instanceof Error ? error.message : 'Unknown error'
                        })
                        results.skippedCount++
                    }
                }
            })

            results.success = results.errors.length === 0
            return results
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