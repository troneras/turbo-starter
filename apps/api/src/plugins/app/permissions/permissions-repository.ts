import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { eq, and, like, or, sql, count, desc, asc } from 'drizzle-orm'
import { permissions } from '@cms/db/schema'
import type { Permission, NewPermission } from '@cms/db/schema'

declare module 'fastify' {
    interface FastifyInstance {
        permissions: ReturnType<typeof permissionsRepository>
    }
}

interface ListPermissionsOptions {
    search?: string
    category?: string
    sortBy?: 'name' | 'category' | 'created_at' | 'updated_at'
    sortDirection?: 'asc' | 'desc'
}

interface CreatePermissionData {
    name: string
    description?: string
    resource: string
    action: string
    category: string
}

interface UpdatePermissionData {
    name?: string
    description?: string | null
    resource?: string
    action?: string
    category?: string
}

function permissionsRepository(db: any) {
    return {
        async listPermissions(
            page: number = 1,
            pageSize: number = 20,
            options: ListPermissionsOptions = {}
        ) {
            const { search, category, sortBy = 'name', sortDirection = 'asc' } = options
            
            // Build where conditions
            const whereConditions = []
            
            if (search) {
                whereConditions.push(
                    or(
                        like(permissions.name, `%${search}%`),
                        like(permissions.description, `%${search}%`),
                        like(permissions.resource, `%${search}%`),
                        like(permissions.action, `%${search}%`)
                    )
                )
            }
            
            if (category) {
                whereConditions.push(eq(permissions.category, category))
            }
            
            const whereClause = whereConditions.length > 0 
                ? and(...whereConditions) 
                : undefined
            
            // Get total count
            const [totalResult] = await db
                .select({ count: count() })
                .from(permissions)
                .where(whereClause)
            
            const total = totalResult.count
            
            // Calculate pagination
            const offset = (page - 1) * pageSize
            const totalPages = Math.ceil(total / pageSize)
            
            // Build order clause
            let orderColumn
            if (sortBy === 'created_at') {
                orderColumn = permissions.createdAt
            } else if (sortBy === 'updated_at') {
                orderColumn = permissions.updatedAt
            } else {
                orderColumn = permissions[sortBy] || permissions.name
            }
            const orderDirection = sortDirection === 'desc' ? desc : asc
            
            // Get permissions
            const permissionsList = await db
                .select()
                .from(permissions)
                .where(whereClause)
                .orderBy(orderDirection(orderColumn))
                .limit(pageSize)
                .offset(offset)
            
            return {
                permissions: permissionsList.map((permission: any) => ({
                    ...permission,
                    created_at: permission.createdAt.toISOString(),
                    updated_at: permission.updatedAt.toISOString()
                })),
                pagination: {
                    page,
                    pageSize,
                    total,
                    totalPages
                }
            }
        },

        async getPermissionById(id: number): Promise<Permission | null> {
            const [permission] = await db
                .select()
                .from(permissions)
                .where(eq(permissions.id, id))
                .limit(1)
            
            if (!permission) return null
            
            return {
                ...permission,
                created_at: permission.createdAt.toISOString(),
                updated_at: permission.updatedAt.toISOString()
            }
        },

        async createPermission(data: CreatePermissionData): Promise<Permission> {
            // Check if permission name already exists
            const [existing] = await db
                .select()
                .from(permissions)
                .where(eq(permissions.name, data.name))
                .limit(1)
            
            if (existing) {
                throw new Error('Permission with this name already exists')
            }
            
            const [permission] = await db
                .insert(permissions)
                .values({
                    name: data.name,
                    description: data.description || null,
                    resource: data.resource,
                    action: data.action,
                    category: data.category
                })
                .returning()
            
            return {
                ...permission,
                created_at: permission.createdAt.toISOString(),
                updated_at: permission.updatedAt.toISOString()
            }
        },

        async updatePermission(id: number, data: UpdatePermissionData): Promise<Permission> {
            // Check if permission exists
            const existing = await this.getPermissionById(id)
            if (!existing) {
                throw new Error('Permission not found')
            }
            
            // Check if name is being changed and if new name already exists
            if (data.name && data.name !== existing.name) {
                const [nameExists] = await db
                    .select()
                    .from(permissions)
                    .where(and(
                        eq(permissions.name, data.name),
                        sql`${permissions.id} != ${id}`
                    ))
                    .limit(1)
                
                if (nameExists) {
                    throw new Error('Permission with this name already exists')
                }
            }
            
            const [permission] = await db
                .update(permissions)
                .set({
                    ...data,
                    updatedAt: new Date()
                })
                .where(eq(permissions.id, id))
                .returning()
            
            return {
                ...permission,
                created_at: permission.createdAt.toISOString(),
                updated_at: permission.updatedAt.toISOString()
            }
        },

        async deletePermission(id: number): Promise<void> {
            // Check if permission exists
            const existing = await this.getPermissionById(id)
            if (!existing) {
                throw new Error('Permission not found')
            }
            
            // TODO: Check if permission is assigned to any roles
            // This should be implemented based on business requirements
            // For now, we'll allow deletion
            
            await db
                .delete(permissions)
                .where(eq(permissions.id, id))
        },

        async getPermissionsByCategory(category: string): Promise<Permission[]> {
            const permissionsList = await db
                .select()
                .from(permissions)
                .where(eq(permissions.category, category))
                .orderBy(asc(permissions.name))
                
            return permissionsList.map((permission: any) => ({
                ...permission,
                created_at: permission.createdAt.toISOString(),
                updated_at: permission.updatedAt.toISOString()
            }))
        },

        async searchPermissions(searchTerm: string): Promise<Permission[]> {
            const permissionsList = await db
                .select()
                .from(permissions)
                .where(
                    or(
                        like(permissions.name, `%${searchTerm}%`),
                        like(permissions.description, `%${searchTerm}%`),
                        like(permissions.resource, `%${searchTerm}%`),
                        like(permissions.action, `%${searchTerm}%`),
                        like(permissions.category, `%${searchTerm}%`)
                    )
                )
                .orderBy(asc(permissions.name))
                
            return permissionsList.map((permission: any) => ({
                ...permission,
                created_at: permission.createdAt.toISOString(),
                updated_at: permission.updatedAt.toISOString()
            }))
        }
    }
}

export default fp(async function (fastify: FastifyInstance) {
    if (!fastify.db) {
        throw new Error('Database plugin must be registered before permissions repository')
    }
    
    fastify.decorate('permissions', permissionsRepository(fastify.db))
}, {
    name: 'permissions-repository',
    dependencies: ['db']
})