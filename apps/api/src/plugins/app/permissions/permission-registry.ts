import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyRequest, RouteOptions } from 'fastify'
import { eq, and, inArray } from 'drizzle-orm'
import { permissions, roles, rolePermissions } from '@cms/db/schema'
import { PREDEFINED_PERMISSIONS } from './predefined-permissions'
import { DEFAULT_ROLES } from './default-roles'

declare module 'fastify' {
    interface FastifyInstance {
        permissionRegistry: ReturnType<typeof createPermissionRegistry>
    }
    
    interface RouteOptions {
        permissions?: string[] | string
    }
}

interface RegisteredPermission {
    name: string
    resource: string
    action: string
    description?: string
    category: string
}

interface RoutePermission {
    permission: string
    route: string
    method: string
}

function createPermissionRegistry(fastify: FastifyInstance) {
    const registeredPermissions = new Map<string, RegisteredPermission>()
    const routePermissions = new Map<string, RoutePermission>()
    
    // Register predefined permissions
    for (const permission of PREDEFINED_PERMISSIONS) {
        registeredPermissions.set(permission.name, permission)
    }

    return {
        // Register a permission definition
        registerPermission(permission: RegisteredPermission) {
            registeredPermissions.set(permission.name, permission)
            fastify.log.debug(`Registered permission: ${permission.name}`)
        },

        // Track which routes use which permissions
        trackRoutePermission(permission: string, route: string, method: string) {
            const key = `${method} ${route}`
            routePermissions.set(key, { permission, route, method })
            
            // Auto-register permission if not already defined
            if (!registeredPermissions.has(permission)) {
                // Parse permission format: resource:action
                const parts = permission.split(':')
                const resource = parts[0]
                const action = parts[1]
                if (resource && action) {
                    this.registerPermission({
                        name: permission,
                        resource,
                        action,
                        category: resource,
                        description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource}`
                    })
                }
            }
        },

        // Get all registered permissions
        getRegisteredPermissions(): RegisteredPermission[] {
            return Array.from(registeredPermissions.values())
        },

        // Get all route permissions
        getRoutePermissions(): RoutePermission[] {
            return Array.from(routePermissions.values())
        },

        // Sync permissions to database
        async syncPermissions() {
            const allPermissions = this.getRegisteredPermissions()
            
            if (allPermissions.length === 0) {
                fastify.log.warn('No permissions to sync')
                return
            }

            fastify.log.info(`Syncing ${allPermissions.length} permissions to database`)

            // Get existing permissions
            const existingPermissions = await fastify.db
                .select()
                .from(permissions)

            const existingPermissionNames = new Set(existingPermissions.map(p => p.name))

            // Separate new and existing permissions
            const newPermissions = allPermissions.filter(p => !existingPermissionNames.has(p.name))
            const updatedPermissions = allPermissions.filter(p => existingPermissionNames.has(p.name))

            // Insert new permissions
            if (newPermissions.length > 0) {
                await fastify.db
                    .insert(permissions)
                    .values(newPermissions)
                    .onConflictDoNothing()

                fastify.log.info(`Inserted ${newPermissions.length} new permissions`)
            }

            // Update existing permissions (description, category, etc.)
            for (const perm of updatedPermissions) {
                await fastify.db
                    .update(permissions)
                    .set({
                        description: perm.description,
                        resource: perm.resource,
                        action: perm.action,
                        category: perm.category,
                        updatedAt: new Date()
                    })
                    .where(eq(permissions.name, perm.name))
            }

            if (updatedPermissions.length > 0) {
                fastify.log.info(`Updated ${updatedPermissions.length} existing permissions`)
            }
        },

        // Sync all default roles and their permissions
        async syncDefaultRoles() {
            fastify.log.info('Syncing default roles and permissions')

            // Get all permissions for reference
            const allPermissions = await fastify.db
                .select()
                .from(permissions)

            const permissionsByName = new Map(allPermissions.map(p => [p.name, p]))

            for (const defaultRole of DEFAULT_ROLES) {
                // Get or create role
                let role = await fastify.db
                    .select()
                    .from(roles)
                    .where(eq(roles.name, defaultRole.name))
                    .limit(1)
                    .then(rows => rows[0])

                if (!role) {
                    // Create role if it doesn't exist
                    const [newRole] = await fastify.db
                        .insert(roles)
                        .values({
                            name: defaultRole.name,
                            description: defaultRole.description,
                            created_by: null,
                            updated_by: null
                        })
                        .returning()

                    role = newRole
                    fastify.log.info(`Created ${defaultRole.name} role`)
                }

                // Determine which permissions this role should have
                let targetPermissionIds: number[] = []
                
                if (defaultRole.permissions === 'all') {
                    // Admin gets all permissions
                    targetPermissionIds = allPermissions.map(p => p.id)
                } else {
                    // Other roles get specific permissions
                    targetPermissionIds = (defaultRole.permissions as string[])
                        .map(permName => permissionsByName.get(permName))
                        .filter((p): p is NonNullable<typeof p> => p !== undefined)
                        .map(p => p.id)
                }

                // Get current role permissions
                const currentRolePermissions = await fastify.db
                    .select({ permissionId: rolePermissions.permissionId })
                    .from(rolePermissions)
                    .where(eq(rolePermissions.roleId, role!.id))

                const currentPermissionIds = new Set(currentRolePermissions.map(p => p.permissionId))

                // Find missing permissions
                const missingPermissionIds = targetPermissionIds.filter(id => !currentPermissionIds.has(id))

                // Find permissions that should be removed (for non-admin roles)
                const extraPermissionIds = defaultRole.permissions !== 'all' 
                    ? Array.from(currentPermissionIds).filter(id => !targetPermissionIds.includes(id))
                    : []

                // Add missing permissions
                if (missingPermissionIds.length > 0) {
                    await fastify.db
                        .insert(rolePermissions)
                        .values(missingPermissionIds.map(permissionId => ({
                            roleId: role!.id,
                            permissionId
                        })))
                        .onConflictDoNothing()

                    fastify.log.info(`Added ${missingPermissionIds.length} permissions to ${defaultRole.name} role`)
                }

                // Remove extra permissions (except for admin)
                if (extraPermissionIds.length > 0 && defaultRole.name !== 'admin') {
                    await fastify.db
                        .delete(rolePermissions)
                        .where(and(
                            eq(rolePermissions.roleId, role!.id),
                            inArray(rolePermissions.permissionId, extraPermissionIds)
                        ))

                    fastify.log.info(`Removed ${extraPermissionIds.length} permissions from ${defaultRole.name} role`)
                }
            }
        },

        // Main sync function
        async sync() {
            try {
                await this.syncPermissions()
                await this.syncDefaultRoles()
                fastify.log.info('Permission sync completed successfully')
            } catch (error) {
                fastify.log.error(error, 'Failed to sync permissions')
                throw error
            }
        }
    }
}

export default fp(async function (fastify: FastifyInstance) {
    if (!fastify.db) {
        throw new Error('Database plugin must be registered before permission registry')
    }

    // Create and decorate the permission registry
    const registry = createPermissionRegistry(fastify)
    fastify.decorate('permissionRegistry', registry)

    // Hook into the original requirePermission decorator to track permissions
    // Save the original function
    const originalRequirePermission = fastify.requirePermission.bind(fastify)
    
    // Replace the function on the existing decorator
    fastify.requirePermission = function (requiredPermission: string) {
        // Track the permission when it's used
        return async function (request: any) {
            // Register the permission usage
            registry.trackRoutePermission(
                requiredPermission,
                request.routeOptions?.url || request.url,
                request.method
            )
            // Call the original requirePermission
            return originalRequirePermission(requiredPermission)(request)
        }
    }

    // Hook into route registration to extract permissions
    fastify.addHook('onRoute', (routeOptions: RouteOptions) => {
        // Extract permissions from route options
        if (routeOptions.permissions) {
            const perms = Array.isArray(routeOptions.permissions) 
                ? routeOptions.permissions 
                : [routeOptions.permissions]
            
            for (const permission of perms) {
                registry.trackRoutePermission(
                    permission,
                    routeOptions.url || '',
                    routeOptions.method as string
                )
            }
        }
        
        // Also check for permissions in preHandler hooks
        if (routeOptions.preHandler) {
            const handlers = Array.isArray(routeOptions.preHandler) 
                ? routeOptions.preHandler 
                : [routeOptions.preHandler]
            
            // Look for requirePermission calls in the handlers
            handlers.forEach((handler: any) => {
                if (handler && handler.name && handler.name.includes('requirePermission')) {
                    // Permission info might be embedded in the handler
                    fastify.log.debug(`Found permission handler in route ${routeOptions.url}`)
                }
            })
        }
        
        // Parse route to auto-generate basic CRUD permissions
        if (routeOptions.url && routeOptions.schema?.tags) {
            const method = (routeOptions.method as string).toLowerCase()
            const tags = routeOptions.schema.tags
            
            if (tags.length > 0) {
                const resource = tags[0] // Use first tag as resource name
                let action = ''
                
                // Map HTTP methods to actions
                switch (method) {
                    case 'get':
                        action = 'read'
                        break
                    case 'post':
                        action = 'create'
                        break
                    case 'put':
                    case 'patch':
                        action = 'update'
                        break
                    case 'delete':
                        action = 'delete'
                        break
                }
                
                if (action && resource && resource !== 'auth' && resource !== 'health') {
                    const permission = `${resource}:${action}`
                    registry.registerPermission({
                        name: permission,
                        resource,
                        action,
                        category: resource,
                        description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource}`
                    })
                }
            }
        }
    })

    // Add hook to sync permissions after all routes are loaded
    fastify.addHook('onReady', async () => {
        await registry.sync()
    })
}, {
    name: 'permission-registry',
    dependencies: ['db', 'auth', 'permissions-repository']
})