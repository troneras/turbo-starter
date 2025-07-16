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
    UnauthorizedErrorSchema,
    ForbiddenErrorSchema,
    NotFoundErrorSchema,
    ConflictErrorSchema,
    BadRequestErrorSchema,
    type ListUsersQuery,
    type CreateUserRequest,
    type UpdateUserParams,
    type UpdateUserRequest,
    type DeleteUserParams
} from "../../../schemas/users.js";

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
        const { page = 1, pageSize = 20 } = request.query as ListUsersQuery
        
        const result = await fastify.users.listUsers(page, pageSize)
        
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
}