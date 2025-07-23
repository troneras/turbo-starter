import type { FastifyInstance } from "fastify";
import {
    TestUsersResponseSchema,
    BadRequestErrorSchema
} from "@cms/contracts/schemas/test-users";
import type {
    TestUsersResponse
} from "@cms/contracts/types/test-users";
import { users, roles, permissions, userRoles, rolePermissions } from "@cms/db/schema";
import { eq, and } from "drizzle-orm";

export default async function (fastify: FastifyInstance) {
    fastify.get('/', {
        schema: {
            tags: ['test-users'],
            summary: 'Get test users for frontend development',
            description: 'Returns seeded test users with their roles and permissions for use in frontend test authentication',
            response: {
                200: TestUsersResponseSchema,
                400: BadRequestErrorSchema
            }
        }
    }, async (request, reply) => {
        try {
            // Query all test users with their roles and permissions
            const testUsers = await fastify.db
                .select({
                    id: users.id,
                    email: users.email,
                    name: users.name,
                    status: users.status
                })
                .from(users)
                .where(eq(users.is_test_user, true));

            // Get roles for each test user
            const userRolesData = await fastify.db
                .select({
                    userId: userRoles.userId,
                    roleId: userRoles.roleId,
                    roleName: roles.name
                })
                .from(userRoles)
                .innerJoin(roles, eq(userRoles.roleId, roles.id));

            // Get all role permissions
            const rolePermissionsData = await fastify.db
                .select({
                    roleId: rolePermissions.roleId,
                    permissionName: permissions.name
                })
                .from(rolePermissions)
                .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id));

            // Build user data with roles and permissions
            const usersWithRolesAndPermissions = testUsers.map(user => {
                const userRolesList = userRolesData
                    .filter(ur => ur.userId === user.id)
                    .map(ur => ur.roleName);

                const userPermissions = new Set<string>();
                userRolesData
                    .filter(ur => ur.userId === user.id)
                    .forEach(ur => {
                        rolePermissionsData
                            .filter(rp => rp.roleId === ur.roleId)
                            .forEach(rp => userPermissions.add(rp.permissionName));
                    });

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    roles: userRolesList,
                    permissions: Array.from(userPermissions),
                    jwt: getUserJwtToken(userRolesList)
                };
            });

            // Map users to their primary role types for easy frontend access
            const response: TestUsersResponse = {
                admin: usersWithRolesAndPermissions.find(u => u.roles.includes('admin')),
                editor: usersWithRolesAndPermissions.find(u => u.roles.includes('editor') && !u.roles.includes('admin')),
                translator: usersWithRolesAndPermissions.find(u => u.roles.includes('translator') && !u.roles.includes('admin') && !u.roles.includes('editor'))
            };

            return response;
        } catch (error: any) {
            fastify.log.error('Failed to fetch test users:', error);
            throw error;
        }
    });
}

/**
 * Generate mock JWT token based on user roles
 */
function getUserJwtToken(roles: string[]): string {
    if (roles.includes('admin')) {
        return 'mock-admin-jwt-token';
    } else if (roles.includes('editor')) {
        return 'mock-editor-jwt-token';
    } else if (roles.includes('translator')) {
        return 'mock-translator-jwt-token';
    } else {
        return 'mock-user-jwt-token';
    }
}