import type { FastifyInstance } from "fastify";

export default async function (fastify: FastifyInstance) {
    // Login endpoint - exchange Azure AD token or service token for JWT
    fastify.post('/login', {
        schema: {
            tags: ['auth'],
            summary: 'Login with Azure AD or service token',
            body: {
                type: 'object',
                properties: {
                    azure_token: { type: 'string' },
                    service_token: { type: 'string' }
                },
                additionalProperties: false
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        jwt: { type: 'string' },
                        user: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                email: { type: 'string' },
                                name: { type: 'string' }
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
                400: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                },
                401: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        const { azure_token, service_token } = request.body as { azure_token?: string; service_token?: string }
        
        // Validate that only one token type is provided
        if (azure_token && service_token) {
            return reply.code(400).send({ error: 'Cannot provide both azure_token and service_token' })
        }
        
        if (!azure_token && !service_token) {
            return reply.code(400).send({ error: 'Must provide either azure_token or service_token' })
        }
        
        try {
            let authResult
            
            if (azure_token) {
                // Use Azure AD auth service
                authResult = await fastify.auth.validateAzureToken(azure_token)
            } else {
                // Use service token auth
                authResult = await fastify.auth.validateServiceToken(service_token!)
            }
            
            // Generate JWT for our API
            const jwt = await fastify.auth.generateJWT(authResult)
            
            return {
                jwt,
                user: authResult.user,
                roles: authResult.roles,
                permissions: authResult.permissions
            }
        } catch (error: any) {
            if (error.message.includes('expired')) {
                return reply.code(401).send({ error: 'Token expired' })
            }
            return reply.code(401).send({ error: error.message || 'Invalid token' })
        }
    })
}