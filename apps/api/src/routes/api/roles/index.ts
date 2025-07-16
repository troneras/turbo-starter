import type { FastifyInstance } from "fastify";

export default async function (fastify: FastifyInstance) {
    // Get all roles
    fastify.get('/', {
        schema: {
            tags: ['roles'],
            summary: 'List all roles',
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        roles: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'number' },
                                    name: { type: 'string' },
                                    permissions: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'number' },
                                                name: { type: 'string' },
                                                description: { type: 'string', nullable: true },
                                                resource: { type: 'string' },
                                                action: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                401: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                }
            }
        },
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const currentUser = (request as any).user
        const isAdmin = currentUser.roles?.includes('admin')
        
        const roles = await fastify.roles.getAllRoles(isAdmin)
        
        return { roles }
    })
}