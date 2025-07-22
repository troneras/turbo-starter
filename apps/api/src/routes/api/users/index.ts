import type { FastifyInstance } from "fastify";
import {
    GetMeResponseSchema,
    ListUsersQuerySchema,
    ListUsersResponseSchema,
    CreateUserRequestSchema,
    CreateUserResponseSchema,
    UpdateUserParamsSchema,
    UpdateUserRequestSchema,
    UpdateUserResponseSchema,
    DeleteUserParamsSchema,
    UpdateUserStatusParamsSchema,
    UpdateUserStatusRequestSchema,
    UpdateUserStatusResponseSchema,
    BulkAssignRoleRequestSchema,
    BulkAssignRoleResponseSchema,
    BulkDeactivateRequestSchema,
    BulkDeactivateResponseSchema,
    UnauthorizedErrorSchema,
    ForbiddenErrorSchema,
    NotFoundErrorSchema,
    ConflictErrorSchema,
    BadRequestErrorSchema
} from "@cms/contracts/schemas/users";
import type {
    ListUsersQuery,
    CreateUserRequest,
    UpdateUserParams,
    UpdateUserRequest,
    DeleteUserParams,
    UpdateUserStatusParams,
    UpdateUserStatusRequest,
    BulkAssignRoleRequest,
    BulkDeactivateRequest
} from "@cms/contracts/types/users";

export default async function (fastify: FastifyInstance) {
    // Get current user info
    fastify.get('/me', {
        schema: {
            tags: ['users'],
            summary: 'Get current user info',
            security: [{ bearerAuth: [] }],
            response: {
                200: GetMeResponseSchema,
                401: UnauthorizedErrorSchema
            }
        },
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const user = (request as any).user

        // Get user's roles and permissions
        const roles = await fastify.users.getUserRoles(user.sub)
        const permissions = await fastify.users.getUserPermissions(user.sub)

        return {
            user: {
                id: user.sub,
                email: user.email,
                name: user.name,
                azure_ad_oid: user.azure_ad_oid,
                azure_ad_tid: user.azure_ad_tid,
                last_login_at: user.last_login_at
            },
            roles,
            permissions
        }
    })

    // List all users (admin only)
    fastify.get('/', {
        schema: {
            tags: ['users'],
            summary: 'List all users',
            security: [{ bearerAuth: [] }],
            querystring: ListUsersQuerySchema,
            response: {
                200: ListUsersResponseSchema,
                401: UnauthorizedErrorSchema,
                403: ForbiddenErrorSchema
            }
        },
        onRequest: [fastify.authenticate, fastify.requireRole('admin')]
    }, async (request, reply) => {
        const { page = 1, pageSize = 20, search, role, status } = request.query as ListUsersQuery

        const result = await fastify.users.listUsers(page, pageSize, { search, role, status })

        return result
    })

    // Create new user (admin only)
    fastify.post('/', {
        schema: {
            tags: ['users'],
            summary: 'Create new user',
            security: [{ bearerAuth: [] }],
            body: CreateUserRequestSchema,
            response: {
                201: CreateUserResponseSchema,
                400: BadRequestErrorSchema,
                401: UnauthorizedErrorSchema,
                403: ForbiddenErrorSchema,
                409: ConflictErrorSchema
            }
        },
        onRequest: [fastify.authenticate, fastify.requireRole('admin')]
    }, async (request, reply) => {
        const { email, name, roles = ['user'] } = request.body as CreateUserRequest

        try {
            const user = await fastify.users.createUser({ email, name, roles })
            reply.code(201)
            return user
        } catch (error: any) {
            if (error.message.includes('already exists')) {
                return reply.conflict('User with this email already exists')
            }
            if (error.message.includes('Invalid role')) {
                return reply.badRequest(error.message)
            }
            throw fastify.httpErrors.badRequest(error.message)
        }
    })

    // Update user (admin only)
    fastify.patch('/:id', {
        schema: {
            tags: ['users'],
            summary: 'Update user',
            security: [{ bearerAuth: [] }],
            params: UpdateUserParamsSchema,
            body: UpdateUserRequestSchema,
            response: {
                200: UpdateUserResponseSchema,
                400: BadRequestErrorSchema,
                401: UnauthorizedErrorSchema,
                403: ForbiddenErrorSchema,
                404: NotFoundErrorSchema,
                409: ConflictErrorSchema
            }
        },
        onRequest: [fastify.authenticate, fastify.requireRole('admin')]
    }, async (request, reply) => {
        const { id } = request.params as UpdateUserParams
        const updates = request.body as UpdateUserRequest

        try {
            const user = await fastify.users.updateUser(id, updates)
            return user
        } catch (error: any) {
            if (error.message.includes('not found')) {
                return reply.notFound('User not found')
            }
            if (error.message.includes('already exists')) {
                return reply.conflict('User with this email already exists')
            }
            throw fastify.httpErrors.badRequest(error.message)
        }
    })

    // Delete user (admin only)
    fastify.delete('/:id', {
        schema: {
            tags: ['users'],
            summary: 'Delete user',
            security: [{ bearerAuth: [] }],
            params: DeleteUserParamsSchema,
            response: {
                204: { type: 'null' },
                400: BadRequestErrorSchema,
                401: UnauthorizedErrorSchema,
                403: ForbiddenErrorSchema,
                404: NotFoundErrorSchema
            }
        },
        onRequest: [fastify.authenticate, fastify.requireRole('admin')]
    }, async (request, reply) => {
        const { id } = request.params as DeleteUserParams
        const currentUser = (request as any).user

        // Prevent self-deletion
        if (id === currentUser.sub) {
            return reply.badRequest('Cannot delete yourself')
        }

        try {
            await fastify.users.deleteUser(id)
            reply.code(204)
            return null
        } catch (error: any) {
            if (error.message.includes('not found')) {
                return reply.notFound('User not found')
            }
            throw fastify.httpErrors.badRequest(error.message)
        }
    })

    // Update user status (admin only)
    fastify.patch('/:id/status', {
        schema: {
            tags: ['users'],
            summary: 'Update user status',
            security: [{ bearerAuth: [] }],
            params: UpdateUserStatusParamsSchema,
            body: UpdateUserStatusRequestSchema,
            response: {
                200: UpdateUserStatusResponseSchema,
                400: BadRequestErrorSchema,
                401: UnauthorizedErrorSchema,
                403: ForbiddenErrorSchema,
                404: NotFoundErrorSchema
            }
        },
        onRequest: [fastify.authenticate, fastify.requireRole('admin')]
    }, async (request, reply) => {
        const { id } = request.params as UpdateUserStatusParams
        const { status } = request.body as UpdateUserStatusRequest
        const currentUser = (request as any).user

        // Prevent self-deactivation
        if (id === currentUser.sub && status === 'inactive') {
            return reply.badRequest('Cannot deactivate yourself')
        }

        try {
            const result = await fastify.users.updateUserStatus(id, status, currentUser.sub)
            return result
        } catch (error: any) {
            if (error.message.includes('not found')) {
                return reply.notFound('User not found')
            }
            throw fastify.httpErrors.badRequest(error.message)
        }
    })

    // Bulk assign role (admin only)
    fastify.post('/bulk-assign-role', {
        schema: {
            tags: ['users'],
            summary: 'Bulk assign role to users',
            security: [{ bearerAuth: [] }],
            body: BulkAssignRoleRequestSchema,
            response: {
                200: BulkAssignRoleResponseSchema,
                400: BadRequestErrorSchema,
                401: UnauthorizedErrorSchema,
                403: ForbiddenErrorSchema
            }
        },
        onRequest: [fastify.authenticate, fastify.requireRole('admin')]
    }, async (request, reply) => {
        const { userIds, roleName, reason } = request.body as BulkAssignRoleRequest
        const currentUser = (request as any).user

        try {
            const result = await fastify.users.bulkAssignRole(userIds, roleName, currentUser.sub, reason)
            return result
        } catch (error: any) {
            throw fastify.httpErrors.badRequest(error.message)
        }
    })

    // Bulk deactivate users (admin only)
    fastify.post('/bulk-deactivate', {
        schema: {
            tags: ['users'],
            summary: 'Bulk deactivate users',
            security: [{ bearerAuth: [] }],
            body: BulkDeactivateRequestSchema,
            response: {
                200: BulkDeactivateResponseSchema,
                400: BadRequestErrorSchema,
                401: UnauthorizedErrorSchema,
                403: ForbiddenErrorSchema
            }
        },
        onRequest: [fastify.authenticate, fastify.requireRole('admin')]
    }, async (request, reply) => {
        const { userIds, reason } = request.body as BulkDeactivateRequest
        const currentUser = (request as any).user

        try {
            const result = await fastify.users.bulkDeactivateUsers(userIds, currentUser.sub, reason)
            return result
        } catch (error: any) {
            throw fastify.httpErrors.badRequest(error.message)
        }
    })
}