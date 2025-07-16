import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { roles, permissions, rolePermissions } from '@cms/db/schema'
import type { Role } from '@cms/db/schema'
declare module 'fastify' {
    interface FastifyInstance {
        roles: ReturnType<typeof rolesRepository>
    }
}
interface RoleWithPermissions {
    id: number
    name: string
    permissions: Array<{
        id: number
        name: string
        description: string | null
        resource: string
        action: string
    }>
}

export function rolesRepository(fastify: FastifyInstance) {

    return {
        async getAllRoles(includePermissions: boolean = false): Promise<RoleWithPermissions[]> {
            const allRoles = await fastify.db
                .select()
                .from(roles)
                .orderBy(roles.name)

            if (!includePermissions) {
                return allRoles.map(role => ({
                    id: role.id,
                    name: role.name,
                    permissions: []
                }))
            }

            // Get permissions for each role
            const rolesWithPermissions = await Promise.all(
                allRoles.map(async (role) => {
                    const rolePermissionsData = await fastify.db
                        .select({
                            permission: permissions
                        })
                        .from(rolePermissions)
                        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
                        .where(eq(rolePermissions.roleId, role.id))

                    return {
                        id: role.id,
                        name: role.name,
                        permissions: rolePermissionsData.map(rp => rp.permission)
                    }
                })
            )

            return rolesWithPermissions
        },
        async getRoleByName(name: string): Promise<Role | null> {
            const [role] = await fastify.db
                .select()
                .from(roles)
                .where(eq(roles.name, name))
                .limit(1)

            return role || null
        },
    }

}

export default fp(async function (fastify: FastifyInstance) {
    const repo = rolesRepository(fastify)
    fastify.decorate('roles', repo)
}, {
    name: 'roles',
    dependencies: ['db']
})