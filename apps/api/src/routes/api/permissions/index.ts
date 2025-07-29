import type { FastifyInstance } from "fastify";
import {
    ListPermissionsQuerySchema,
    ListPermissionsResponseSchema,
    CreatePermissionRequestSchema,
    CreatePermissionResponseSchema,
    PermissionParamsSchema,
    GetPermissionResponseSchema,
    UpdatePermissionRequestSchema,
    UpdatePermissionResponseSchema,
    UnauthorizedErrorSchema,
    ForbiddenErrorSchema,
    NotFoundErrorSchema,
    ConflictErrorSchema,
    BadRequestErrorSchema
} from "@cms/contracts/schemas/permissions.js";
import type {
    ListPermissionsQuery,
    CreatePermissionRequest,
    PermissionParams,
    UpdatePermissionRequest
} from "@cms/contracts/types/permissions.js";

export default async function (fastify: FastifyInstance) {
    // List permissions with search, filtering, and pagination
    fastify.get('/', {
        schema: {
            tags: ['permissions'],
            summary: 'List permissions with optional search, filtering, and pagination',
            security: [{ bearerAuth: [] }],
            querystring: ListPermissionsQuerySchema,
            response: {
                200: ListPermissionsResponseSchema,
                401: UnauthorizedErrorSchema
            }
        },
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const query = request.query as ListPermissionsQuery

        const page = query.page || 1
        const pageSize = Math.min(query.pageSize || 20, 100) // Cap at 100

        const result = await fastify.permissions.listPermissions(page, pageSize, {
            search: query.search,
            category: query.category,
            sortBy: query.sortBy,
            sortDirection: query.sortDirection
        })

        return result
    })

    // Create new permission (admin only)
    fastify.post('/', {
        schema: {
            tags: ['permissions'],
            summary: 'Create new permission',
            security: [{ bearerAuth: [] }],
            body: CreatePermissionRequestSchema,
            response: {
                201: CreatePermissionResponseSchema,
                400: BadRequestErrorSchema,
                401: UnauthorizedErrorSchema,
                403: ForbiddenErrorSchema,
                409: ConflictErrorSchema
            }
        },
        onRequest: [fastify.authenticate, fastify.requireRole('admin')]
    }, async (request, reply) => {
        const { name, description, resource, action, category } = request.body as CreatePermissionRequest

        try {
            const permission = await fastify.permissions.createPermission({
                name,
                description,
                resource,
                action,
                category
            })

            reply.code(201)
            return permission
        } catch (error: any) {
            if (error.message.includes('already exists')) {
                return reply.conflict('Permission with this name already exists')
            }
            throw fastify.httpErrors.badRequest(error.message)
        }
    })

    // Get single permission by ID
    fastify.get('/:id', {
        schema: {
            tags: ['permissions'],
            summary: 'Get permission by ID',
            security: [{ bearerAuth: [] }],
            params: PermissionParamsSchema,
            response: {
                200: GetPermissionResponseSchema,
                401: UnauthorizedErrorSchema,
                404: NotFoundErrorSchema
            }
        },
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const { id } = request.params as PermissionParams

        try {
            const permission = await fastify.permissions.getPermissionById(id)
            if (!permission) {
                return reply.notFound(`Permission with ID ${id} not found`)
            }
            return permission
        } catch (error: any) {
            throw fastify.httpErrors.badRequest(error.message)
        }
    })

    // Update permission (admin only)
    fastify.put('/:id', {
        schema: {
            tags: ['permissions'],
            summary: 'Update permission',
            security: [{ bearerAuth: [] }],
            params: PermissionParamsSchema,
            body: UpdatePermissionRequestSchema,
            response: {
                200: UpdatePermissionResponseSchema,
                400: BadRequestErrorSchema,
                401: UnauthorizedErrorSchema,
                403: ForbiddenErrorSchema,
                404: NotFoundErrorSchema,
                409: ConflictErrorSchema
            }
        },
        onRequest: [fastify.authenticate, fastify.requireRole('admin')]
    }, async (request, reply) => {
        const { id } = request.params as PermissionParams
        const updates = request.body as UpdatePermissionRequest

        try {
            const permission = await fastify.permissions.updatePermission(id, updates)
            return permission
        } catch (error: any) {
            if (error.message.includes('not found')) {
                return reply.notFound('Permission not found')
            }
            if (error.message.includes('already exists')) {
                return reply.conflict('Permission with this name already exists')
            }
            throw fastify.httpErrors.badRequest(error.message)
        }
    })

    // Delete permission (admin only)
    fastify.delete('/:id', {
        schema: {
            tags: ['permissions'],
            summary: 'Delete permission',
            security: [{ bearerAuth: [] }],
            params: PermissionParamsSchema,
            response: {
                204: { type: 'null', description: 'Permission deleted successfully' },
                400: BadRequestErrorSchema,
                401: UnauthorizedErrorSchema,
                403: ForbiddenErrorSchema,
                404: NotFoundErrorSchema
            }
        },
        onRequest: [fastify.authenticate, fastify.requireRole('admin')]
    }, async (request, reply) => {
        const { id } = request.params as PermissionParams

        try {
            await fastify.permissions.deletePermission(id)
            reply.code(204)
            return null
        } catch (error: any) {
            if (error.message.includes('not found')) {
                return reply.notFound('Permission not found')
            }
            if (error.message.includes('assigned to roles')) {
                return reply.badRequest('Cannot delete permission that is assigned to roles')
            }
            throw fastify.httpErrors.badRequest(error.message)
        }
    })
}