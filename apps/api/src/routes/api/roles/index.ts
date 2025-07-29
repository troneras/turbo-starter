import type { FastifyInstance } from "fastify";
import {
    RolesListResponseSchema,
    ListRolesQuerySchema,
    ListRolesResponseSchema,
    CreateRoleRequestSchema,
    CreateRoleResponseSchema,
    RoleParamsSchema,
    GetRoleResponseSchema,
    UpdateRoleRequestSchema,
    UpdateRoleResponseSchema,
    GetRolePermissionsResponseSchema,
    UpdateRolePermissionsRequestSchema,
    UpdateRolePermissionsResponseSchema
} from "@cms/contracts/schemas/roles.js";
import type {
    RolesListResponse,
    ListRolesQuery,
    CreateRoleRequest,
    RoleParams,
    UpdateRoleRequest,
    UpdateRolePermissionsRequest
} from "@cms/contracts/types/roles.js";
import {
    UnauthorizedErrorSchema,
    ForbiddenErrorSchema,
    NotFoundErrorSchema,
    ConflictErrorSchema,
    BadRequestErrorSchema
} from "@cms/contracts/schemas/common.js";

export default async function (fastify: FastifyInstance) {
    // List roles with search, filtering, and pagination
    fastify.get('/', {
        schema: {
            tags: ['roles'],
            summary: 'List roles with optional search, filtering, and pagination',
            security: [{ bearerAuth: [] }],
            querystring: ListRolesQuerySchema,
            response: {
                200: ListRolesResponseSchema,
                401: UnauthorizedErrorSchema
            }
        },
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const currentUser = (request as any).user
        const isAdmin = currentUser.roles?.includes('admin')
        const query = request.query as ListRolesQuery

        const page = query.page || 1
        const pageSize = Math.min(query.pageSize || 20, 100) // Cap at 100
        const includePermissions = query.includePermissions !== undefined ? query.includePermissions : isAdmin

        const result = await fastify.roles.listRoles(page, pageSize, {
            search: query.search,
            includePermissions,
            sortBy: query.sortBy,
            sortDirection: query.sortDirection
        })

        return result
    })

    // Create new role (admin only)
    fastify.post('/', {
        schema: {
            tags: ['roles'],
            summary: 'Create new role',
            security: [{ bearerAuth: [] }],
            body: CreateRoleRequestSchema,
            response: {
                201: CreateRoleResponseSchema,
                400: BadRequestErrorSchema,
                401: UnauthorizedErrorSchema,
                403: ForbiddenErrorSchema,
                409: ConflictErrorSchema
            }
        },
        onRequest: [fastify.authenticate, fastify.requireRole('admin')]
    }, async (request, reply) => {
        const { name, description, parent_role_id, permissions } = request.body as CreateRoleRequest
        const currentUser = (request as any).user

        try {
            const role = await fastify.roles.createRole({
                name,
                description,
                parent_role_id,
                permissions,
                created_by: currentUser.sub
            })

            reply.code(201)
            return role
        } catch (error: any) {
            if (error.message.includes('already exists')) {
                return reply.conflict('Role with this name already exists')
            }
            if (error.message.includes('Parent role not found')) {
                return reply.badRequest('Parent role not found')
            }
            if (error.message.includes('circular hierarchy')) {
                return reply.badRequest('Creating this role would result in a circular hierarchy')
            }
            if (error.message.includes('permissions do not exist')) {
                return reply.badRequest('One or more permissions do not exist')
            }
            throw fastify.httpErrors.badRequest(error.message)
        }
    })

    // Get single role by ID
    fastify.get('/:id', {
        schema: {
            tags: ['roles'],
            summary: 'Get role by ID',
            security: [{ bearerAuth: [] }],
            params: RoleParamsSchema,
            response: {
                200: GetRoleResponseSchema,
                401: UnauthorizedErrorSchema,
                404: NotFoundErrorSchema
            }
        },
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const { id } = request.params as RoleParams
        const currentUser = (request as any).user
        const isAdmin = currentUser.roles?.includes('admin')

        try {
            const role = await fastify.roles.getRoleById(id, isAdmin)
            if (!role) {
                return reply.notFound(`Role with ID ${id} not found`)
            }
            return role
        } catch (error: any) {
            throw fastify.httpErrors.badRequest(error.message)
        }
    })

    // Update role (admin only)
    fastify.put('/:id', {
        schema: {
            tags: ['roles'],
            summary: 'Update role',
            security: [{ bearerAuth: [] }],
            params: RoleParamsSchema,
            body: UpdateRoleRequestSchema,
            response: {
                200: UpdateRoleResponseSchema,
                400: BadRequestErrorSchema,
                401: UnauthorizedErrorSchema,
                403: ForbiddenErrorSchema,
                404: NotFoundErrorSchema,
                409: ConflictErrorSchema
            }
        },
        onRequest: [fastify.authenticate, fastify.requireRole('admin')]
    }, async (request, reply) => {
        const { id } = request.params as RoleParams
        const updates = request.body as UpdateRoleRequest
        const currentUser = (request as any).user

        try {
            const role = await fastify.roles.updateRole(id, {
                ...updates,
                updated_by: currentUser.sub
            })
            return role
        } catch (error: any) {
            if (error.message.includes('not found')) {
                return reply.notFound('Role not found')
            }
            if (error.message.includes('already exists')) {
                return reply.conflict('Role with this name already exists')
            }
            if (error.message.includes('Parent role not found')) {
                return reply.badRequest('Parent role not found')
            }
            if (error.message.includes('circular hierarchy')) {
                return reply.badRequest('Updating this role would result in a circular hierarchy')
            }
            throw fastify.httpErrors.badRequest(error.message)
        }
    })

    // Delete role (admin only)
    fastify.delete('/:id', {
        schema: {
            tags: ['roles'],
            summary: 'Delete role',
            security: [{ bearerAuth: [] }],
            params: RoleParamsSchema,
            response: {
                204: { type: 'null', description: 'Role deleted successfully' },
                400: BadRequestErrorSchema,
                401: UnauthorizedErrorSchema,
                403: ForbiddenErrorSchema,
                404: NotFoundErrorSchema
            }
        },
        onRequest: [fastify.authenticate, fastify.requireRole('admin')]
    }, async (request, reply) => {
        const { id } = request.params as RoleParams

        try {
            await fastify.roles.deleteRole(id)
            reply.code(204)
            return null
        } catch (error: any) {
            if (error.message.includes('not found')) {
                return reply.notFound('Role not found')
            }
            if (error.message.includes('child roles')) {
                return reply.badRequest('Cannot delete role that has child roles')
            }
            if (error.message.includes('assigned to users')) {
                return reply.badRequest('Cannot delete role that is assigned to users')
            }
            throw fastify.httpErrors.badRequest(error.message)
        }
    })

    // Get role permissions
    fastify.get('/:id/permissions', {
        schema: {
            tags: ['roles'],
            summary: 'Get role permissions',
            security: [{ bearerAuth: [] }],
            params: RoleParamsSchema,
            response: {
                200: GetRolePermissionsResponseSchema,
                401: UnauthorizedErrorSchema,
                404: NotFoundErrorSchema
            }
        },
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const { id } = request.params as RoleParams

        try {
            const permissions = await fastify.roles.getRolePermissions(id)
            return {
                role_id: id,
                permissions
            }
        } catch (error: any) {
            if (error.message.includes('not found')) {
                return reply.notFound('Role not found')
            }
            throw fastify.httpErrors.badRequest(error.message)
        }
    })

    // Update role permissions (admin only)
    fastify.put('/:id/permissions', {
        schema: {
            tags: ['roles'],
            summary: 'Update role permissions',
            security: [{ bearerAuth: [] }],
            params: RoleParamsSchema,
            body: UpdateRolePermissionsRequestSchema,
            response: {
                200: UpdateRolePermissionsResponseSchema,
                400: BadRequestErrorSchema,
                401: UnauthorizedErrorSchema,
                403: ForbiddenErrorSchema,
                404: NotFoundErrorSchema
            }
        },
        onRequest: [fastify.authenticate, fastify.requireRole('admin')]
    }, async (request, reply) => {
        const { id } = request.params as RoleParams
        const { permissions } = request.body as UpdateRolePermissionsRequest

        try {
            const updatedPermissions = await fastify.roles.updateRolePermissions(id, permissions)
            return {
                role_id: id,
                permissions: updatedPermissions
            }
        } catch (error: any) {
            if (error.message.includes('not found')) {
                return reply.notFound('Role not found')
            }
            if (error.message.includes('permissions do not exist')) {
                return reply.badRequest('One or more permissions do not exist')
            }
            throw fastify.httpErrors.badRequest(error.message)
        }
    })

    // Legacy endpoint - Get all roles (backward compatibility)
    fastify.get('/legacy', {
        schema: {
            tags: ['roles'],
            summary: 'List all roles (legacy endpoint for backward compatibility)',
            security: [{ bearerAuth: [] }],
            response: {
                200: RolesListResponseSchema,
                401: UnauthorizedErrorSchema
            }
        },
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const currentUser = (request as any).user
        const isAdmin = currentUser.roles?.includes('admin')

        const roles = await fastify.roles.getAllRoles(isAdmin)

        return { roles } as RolesListResponse
    })
}