import type { FastifyInstance } from "fastify";
import {
    RolesListResponseSchema,
    type RolesListResponse
} from "../../../schemas/roles.js";
import { UnauthorizedErrorSchema } from "../../../schemas/common.js";

export default async function (fastify: FastifyInstance) {
    // Get all roles
    fastify.get('/', {
        schema: {
            tags: ['roles'],
            summary: 'List all roles',
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