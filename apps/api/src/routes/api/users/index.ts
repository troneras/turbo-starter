import type { FastifyInstance } from "fastify";

export default async function (fastify: FastifyInstance) {
    // Get current user info
    fastify.get('/me', {
        schema: {
            tags: ['users'],
            summary: 'Get current user info',
            security: [{ bearerAuth: [] }],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        user: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                email: { type: 'string' },
                                name: { type: 'string' },
                                azure_ad_oid: { type: 'string', nullable: true },
                                azure_ad_tid: { type: 'string', nullable: true },
                                last_login_at: { type: 'string', nullable: true }
                            }
                        },
                        roles: {
                            type: 'array',
                            items: { type: 'string' }
                        },
                        permissions: {
                            type: 'array',
                            items: { type: 'string' }
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
            querystring: {
                type: 'object',
                properties: {
                    page: { type: 'number', default: 1 },
                    pageSize: { type: 'number', default: 20 }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        users: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    email: { type: 'string' },
                                    name: { type: 'string' },
                                    roles: {
                                        type: 'array',
                                        items: { type: 'string' }
                                    },
                                    createdAt: { type: 'string' },
                                    last_login_at: { type: 'string', nullable: true }
                                }
                            }
                        },
                        total: { type: 'number' },
                        page: { type: 'number' },
                        pageSize: { type: 'number' }
                    }
                },
                401: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                },
                403: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                }
            }
        },
        onRequest: [fastify.authenticate, fastify.requireRole('admin')]
    }, async (request, reply) => {
        const { page = 1, pageSize = 20 } = request.query as { page?: number; pageSize?: number }
        
        const result = await fastify.users.listUsers(page, pageSize)
        
        return result
    })
    
    // Create new user (admin only)
    fastify.post('/', {
        schema: {
            tags: ['users'],
            summary: 'Create new user',
            security: [{ bearerAuth: [] }],
            body: {
                type: 'object',
                properties: {
                    email: { type: 'string', format: 'email' },
                    name: { type: 'string' },
                    roles: {
                        type: 'array',
                        items: { type: 'string' },
                        default: ['user']
                    }
                },
                required: ['email', 'name']
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        name: { type: 'string' },
                        roles: {
                            type: 'array',
                            items: { type: 'string' }
                        }
                    }
                },
                400: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                },
                409: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                }
            }
        },
        onRequest: [fastify.authenticate, fastify.requireRole('admin')]
    }, async (request, reply) => {
        const { email, name, roles = ['user'] } = request.body as { email: string; name: string; roles?: string[] }
        
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
            throw error
        }
    })
    
    // Update user (admin only)
    fastify.patch('/:id', {
        schema: {
            tags: ['users'],
            summary: 'Update user',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' }
                },
                required: ['id']
            },
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    roles: {
                        type: 'array',
                        items: { type: 'string' }
                    }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        name: { type: 'string' },
                        roles: {
                            type: 'array',
                            items: { type: 'string' }
                        }
                    }
                },
                404: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                },
                409: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                }
            }
        },
        onRequest: [fastify.authenticate, fastify.requireRole('admin')]
    }, async (request, reply) => {
        const { id } = request.params as { id: string }
        const updates = request.body as { name?: string; email?: string; roles?: string[] }
        
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
            throw error
        }
    })
    
    // Delete user (admin only)
    fastify.delete('/:id', {
        schema: {
            tags: ['users'],
            summary: 'Delete user',
            security: [{ bearerAuth: [] }],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string' }
                },
                required: ['id']
            },
            response: {
                204: {
                    type: 'null'
                },
                400: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                },
                404: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                }
            }
        },
        onRequest: [fastify.authenticate, fastify.requireRole('admin')]
    }, async (request, reply) => {
        const { id } = request.params as { id: string }
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
            throw error
        }
    })
}