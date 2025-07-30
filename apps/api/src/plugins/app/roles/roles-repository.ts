import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { eq, and, like, or, sql, count, desc, asc } from 'drizzle-orm'
import { roles, permissions, rolePermissions, userRoles } from '@cms/db/schema'
import type { Role, Permission, NewRole } from '@cms/db/schema'
declare module 'fastify' {
    interface FastifyInstance {
        roles: ReturnType<typeof rolesRepository>
    }
}

interface RoleWithPermissions {
    id: number
    name: string
    description: string | null
    parent_role_id: number | null
    created_by: string | null
    updated_by: string | null
    created_at: string
    updated_at: string
    userCount: number
    permissions: Array<{
        id: number
        name: string
        description: string | null
        resource: string
        action: string
        created_at: string
    }>
}

interface ListRolesOptions {
    search?: string
    includePermissions?: boolean
    sortBy?: 'name' | 'created_at' | 'updated_at'
    sortDirection?: 'asc' | 'desc'
}

interface CreateRoleData {
    name: string
    description?: string
    parent_role_id?: number
    permissions?: number[]
    created_by: string
}

interface UpdateRoleData {
    name?: string
    description?: string | null
    parent_role_id?: number | null
    updated_by: string
}

export function rolesRepository(fastify: FastifyInstance) {

    return {
        async listRoles(
            page: number = 1, 
            pageSize: number = 20, 
            options: ListRolesOptions = {}
        ): Promise<{ roles: RoleWithPermissions[], pagination: { page: number, pageSize: number, total: number, totalPages: number } }> {
            const { search, includePermissions = false, sortBy = 'name', sortDirection = 'asc' } = options
            const offset = (page - 1) * pageSize

            // Build base query
            let baseQuery = fastify.db.select().from(roles)
            let countQuery = fastify.db.select({ count: count() }).from(roles)

            // Apply search filter
            if (search) {
                const searchFilter = or(
                    like(roles.name, `%${search}%`),
                    like(roles.description, `%${search}%`)
                )
                baseQuery = (baseQuery as any).where(searchFilter)
                countQuery = (countQuery as any).where(searchFilter)
            }

            // Apply sorting
            const sortColumn = roles[sortBy]
            baseQuery = (baseQuery as any).orderBy(sortDirection === 'desc' ? desc(sortColumn) : asc(sortColumn))

            // Execute queries
            const [allRoles, totalResult] = await Promise.all([
                (baseQuery as any).limit(pageSize).offset(offset),
                countQuery as any
            ])

            const total = totalResult[0]?.count as number || 0
            const totalPages = Math.ceil(total / pageSize)

            if (!includePermissions) {
                // Even without permissions, we still need user counts
                const rolesWithUserCounts = await Promise.all(
                    allRoles.map(async (role: any) => {
                        const userCountResult = await fastify.db
                            .select({ count: count() })
                            .from(userRoles)
                            .where(eq(userRoles.roleId, role.id))

                        return {
                            ...role,
                            created_at: role.created_at.toISOString(),
                            updated_at: role.updated_at.toISOString(),
                            userCount: userCountResult[0]?.count || 0,
                            permissions: []
                        }
                    })
                )

                return {
                    roles: rolesWithUserCounts,
                    pagination: { page, pageSize, total, totalPages }
                }
            }

            // Get permissions and user counts for each role
            const rolesWithPermissions = await Promise.all(
                allRoles.map(async (role: any) => {
                    const [rolePermissionsData, userCountResult] = await Promise.all([
                        fastify.db
                            .select({
                                permission: permissions
                            })
                            .from(rolePermissions)
                            .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
                            .where(eq(rolePermissions.roleId, role.id)),
                        fastify.db
                            .select({ count: count() })
                            .from(userRoles)
                            .where(eq(userRoles.roleId, role.id))
                    ])

                    return {
                        ...role,
                        created_at: role.created_at.toISOString(),
                        updated_at: role.updated_at.toISOString(),
                        userCount: userCountResult[0]?.count || 0,
                        permissions: rolePermissionsData.map(rp => ({
                            ...rp.permission,
                            created_at: rp.permission.createdAt.toISOString(),
                            updated_at: rp.permission.updatedAt.toISOString()
                        }))
                    }
                })
            )

            return {
                roles: rolesWithPermissions,
                pagination: { page, pageSize, total, totalPages }
            }
        },

        async getAllRoles(includePermissions: boolean = false): Promise<RoleWithPermissions[]> {
            const allRoles = await fastify.db
                .select()
                .from(roles)
                .orderBy(roles.name)

            if (!includePermissions) {
                // Even without permissions, we still need user counts
                const rolesWithUserCounts = await Promise.all(
                    allRoles.map(async (role: any) => {
                        const userCountResult = await fastify.db
                            .select({ count: count() })
                            .from(userRoles)
                            .where(eq(userRoles.roleId, role.id))

                        return {
                            ...role,
                            created_at: role.created_at.toISOString(),
                            updated_at: role.updated_at.toISOString(),
                            userCount: userCountResult[0]?.count || 0,
                            permissions: []
                        }
                    })
                )

                return rolesWithUserCounts
            }

            // Get permissions and user counts for each role
            const rolesWithPermissions = await Promise.all(
                allRoles.map(async (role: any) => {
                    const [rolePermissionsData, userCountResult] = await Promise.all([
                        fastify.db
                            .select({
                                permission: permissions
                            })
                            .from(rolePermissions)
                            .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
                            .where(eq(rolePermissions.roleId, role.id)),
                        fastify.db
                            .select({ count: count() })
                            .from(userRoles)
                            .where(eq(userRoles.roleId, role.id))
                    ])

                    return {
                        ...role,
                        created_at: role.created_at.toISOString(),
                        updated_at: role.updated_at.toISOString(),
                        userCount: userCountResult[0]?.count || 0,
                        permissions: rolePermissionsData.map(rp => ({
                            ...rp.permission,
                            created_at: rp.permission.createdAt.toISOString(),
                            updated_at: rp.permission.updatedAt.toISOString()
                        }))
                    }
                })
            )

            return rolesWithPermissions
        },

        async getRoleById(id: number, includePermissions: boolean = true): Promise<RoleWithPermissions | null> {
            const [role] = await fastify.db
                .select()
                .from(roles)
                .where(eq(roles.id, id))
                .limit(1)

            if (!role) return null

            if (!includePermissions) {
                // Even without permissions, we still need user count
                const userCountResult = await fastify.db
                    .select({ count: count() })
                    .from(userRoles)
                    .where(eq(userRoles.roleId, role.id))

                return {
                    ...role,
                    created_at: role.created_at.toISOString(),
                    updated_at: role.updated_at.toISOString(),
                    userCount: userCountResult[0]?.count || 0,
                    permissions: []
                }
            }

            // Get permissions and user count for the role
            const [rolePermissionsData, userCountResult] = await Promise.all([
                fastify.db
                    .select({
                        permission: permissions
                    })
                    .from(rolePermissions)
                    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
                    .where(eq(rolePermissions.roleId, role.id)),
                fastify.db
                    .select({ count: count() })
                    .from(userRoles)
                    .where(eq(userRoles.roleId, role.id))
            ])

            return {
                ...role,
                created_at: role.created_at.toISOString(),
                updated_at: role.updated_at.toISOString(),
                userCount: userCountResult[0]?.count || 0,
                permissions: rolePermissionsData.map(rp => ({
                    ...rp.permission,
                    created_at: rp.permission.createdAt.toISOString(),
                    updated_at: rp.permission.updatedAt.toISOString()
                }))
            }
        },

        async getRoleByName(name: string): Promise<Role | null> {
            const [role] = await fastify.db
                .select()
                .from(roles)
                .where(eq(roles.name, name))
                .limit(1)

            return role || null
        },

        async createRole(data: CreateRoleData): Promise<RoleWithPermissions> {
            // Validate parent role exists if provided
            if (data.parent_role_id) {
                const parentRole = await this.getRoleById(data.parent_role_id, false)
                if (!parentRole) {
                    throw new Error('Parent role not found')
                }
                
                // Check for circular dependency
                if (await this.wouldCreateCircularDependency(data.parent_role_id, data.name)) {
                    throw new Error('Creating this role would result in a circular hierarchy')
                }
            }

            // Check if role name already exists
            const existingRole = await this.getRoleByName(data.name)
            if (existingRole) {
                throw new Error('Role with this name already exists')
            }

            // Validate permissions exist if provided
            if (data.permissions && data.permissions.length > 0) {
                const validPermissions = await fastify.db
                    .select({ id: permissions.id })
                    .from(permissions)
                    .where(sql`${permissions.id} = ANY(${data.permissions})`)

                if (validPermissions.length !== data.permissions.length) {
                    throw new Error('One or more permissions do not exist')
                }
            }

            return fastify.db.transaction(async (tx) => {
                // Create the role
                const [newRole] = await tx
                    .insert(roles)
                    .values({
                        name: data.name,
                        description: data.description || null,
                        parent_role_id: data.parent_role_id || null,
                        created_by: data.created_by,
                        updated_by: data.created_by
                    })
                    .returning()

                // Assign permissions if provided
                if (data.permissions && data.permissions.length > 0) {
                    await tx
                        .insert(rolePermissions)
                        .values(data.permissions.map(permissionId => ({
                            roleId: newRole!.id,
                            permissionId
                        })))
                }

                // Return the created role with permissions
                return this.getRoleById(newRole!.id) as Promise<RoleWithPermissions>
            })
        },

        async updateRole(id: number, data: UpdateRoleData): Promise<RoleWithPermissions> {
            // Check if role exists
            const existingRole = await this.getRoleById(id, false)
            if (!existingRole) {
                throw new Error('Role not found')
            }

            // Validate name uniqueness if changing name
            if (data.name && data.name !== existingRole.name) {
                const roleWithName = await this.getRoleByName(data.name)
                if (roleWithName) {
                    throw new Error('Role with this name already exists')
                }
            }

            // Validate parent role exists if provided
            if (data.parent_role_id !== undefined) {
                if (data.parent_role_id !== null) {
                    // Check parent exists
                    const parentRole = await this.getRoleById(data.parent_role_id, false)
                    if (!parentRole) {
                        throw new Error('Parent role not found')
                    }

                    // Check for circular dependency
                    if (await this.wouldCreateCircularDependency(data.parent_role_id, existingRole.name, id)) {
                        throw new Error('Updating this role would result in a circular hierarchy')
                    }
                }
            }

            // Build update data
            const updateData: Partial<NewRole> = {
                updated_by: data.updated_by,
                updated_at: new Date()
            }

            if (data.name !== undefined) updateData.name = data.name
            if (data.description !== undefined) updateData.description = data.description
            if (data.parent_role_id !== undefined) updateData.parent_role_id = data.parent_role_id

            // Update the role
            const [updatedRole] = await fastify.db
                .update(roles)
                .set(updateData)
                .where(eq(roles.id, id))
                .returning()

            // Return the updated role with permissions
            return this.getRoleById(id) as Promise<RoleWithPermissions>
        },

        async deleteRole(id: number): Promise<void> {
            // Check if role exists
            const role = await this.getRoleById(id, false)
            if (!role) {
                throw new Error('Role not found')
            }

            // Check if role has child roles
            const childRoles = await fastify.db
                .select({ id: roles.id })
                .from(roles)
                .where(eq(roles.parent_role_id, id))

            if (childRoles.length > 0) {
                throw new Error('Cannot delete role that has child roles')
            }

            // Check if role is assigned to users
            const { userRoles } = await import('@cms/db/schema')
            const assignedUsers = await fastify.db
                .select({ userId: userRoles.userId })
                .from(userRoles)
                .where(eq(userRoles.roleId, id))

            if (assignedUsers.length > 0) {
                throw new Error('Cannot delete role that is assigned to users')
            }

            // Delete role (this will cascade delete role_permissions)
            await fastify.db.transaction(async (tx) => {
                // Delete role permissions first
                await tx
                    .delete(rolePermissions)
                    .where(eq(rolePermissions.roleId, id))

                // Delete the role
                await tx
                    .delete(roles)
                    .where(eq(roles.id, id))
            })
        },

        async getRolePermissions(roleId: number): Promise<Permission[]> {
            const role = await this.getRoleById(roleId, false)
            if (!role) {
                throw new Error('Role not found')
            }

            const rolePermissionsData = await fastify.db
                .select({
                    permission: permissions
                })
                .from(rolePermissions)
                .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
                .where(eq(rolePermissions.roleId, roleId))

            return rolePermissionsData.map(rp => ({
                ...rp.permission,
                created_at: rp.permission.createdAt.toISOString(),
                updated_at: rp.permission.updatedAt.toISOString()
            }))
        },

        async updateRolePermissions(roleId: number, permissionIds: number[]): Promise<Permission[]> {
            // Check if role exists
            const role = await this.getRoleById(roleId, false)
            if (!role) {
                throw new Error('Role not found')
            }

            // Validate all permissions exist
            if (permissionIds.length > 0) {
                const validPermissions = await fastify.db
                    .select({ id: permissions.id })
                    .from(permissions)
                    .where(sql`${permissions.id} = ANY(${permissionIds})`)

                if (validPermissions.length !== permissionIds.length) {
                    throw new Error('One or more permissions do not exist')
                }
            }

            // Update permissions in transaction
            await fastify.db.transaction(async (tx) => {
                // Delete existing permissions
                await tx
                    .delete(rolePermissions)
                    .where(eq(rolePermissions.roleId, roleId))

                // Insert new permissions
                if (permissionIds.length > 0) {
                    await tx
                        .insert(rolePermissions)
                        .values(permissionIds.map(permissionId => ({
                            roleId,
                            permissionId
                        })))
                }
            })

            // Return updated permissions
            return this.getRolePermissions(roleId)
        },

        async wouldCreateCircularDependency(parentRoleId: number, childRoleName: string, excludeRoleId?: number): Promise<boolean> {
            // Get all roles to build hierarchy map
            const allRoles = await fastify.db
                .select({ id: roles.id, name: roles.name, parent_role_id: roles.parent_role_id })
                .from(roles)

            // Build hierarchy map
            const roleMap = new Map()
            allRoles.forEach(role => {
                roleMap.set(role.id, role)
            })

            // Check if the proposed parent has this role as an ancestor
            const checkAncestor = (currentRoleId: number, targetRoleName: string): boolean => {
                const currentRole = roleMap.get(currentRoleId)
                if (!currentRole) return false
                
                // Skip the role being updated to avoid false positive
                if (excludeRoleId && currentRole.id === excludeRoleId) {
                    return currentRole.parent_role_id ? checkAncestor(currentRole.parent_role_id, targetRoleName) : false
                }
                
                // Check if we found the target role
                if (currentRole.name === targetRoleName) return true
                
                // Check parent
                return currentRole.parent_role_id ? checkAncestor(currentRole.parent_role_id, targetRoleName) : false
            }

            return checkAncestor(parentRoleId, childRoleName)
        }
    }

}

export default fp(async function (fastify: FastifyInstance) {
    const repo = rolesRepository(fastify)
    fastify.decorate('roles', repo)
}, {
    name: 'roles',
    dependencies: ['db']
})