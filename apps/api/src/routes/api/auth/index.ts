import type { FastifyInstance } from "fastify";
import {
    LoginRequestSchema,
    LoginResponseSchema,
    UnauthorizedErrorSchema,
    BadRequestErrorSchema
} from "@cms/contracts/schemas/auth";
import type { LoginRequest } from "@cms/contracts/types/auth";

export default async function (fastify: FastifyInstance) {
    // Login endpoint - exchange Azure AD token or service token for JWT
    fastify.post('/login', {
        schema: {
            tags: ['auth'],
            summary: 'Login with Azure AD or service token',
            body: LoginRequestSchema,
            response: {
                200: LoginResponseSchema,
                400: BadRequestErrorSchema,
                401: UnauthorizedErrorSchema
            }
        }
    }, async (request, reply) => {
        const { azure_token, service_token } = request.body as LoginRequest

        // Validate that only one token type is provided (business logic validation)
        if (azure_token && service_token) {
            return reply.badRequest('Cannot provide both azure_token and service_token')
        }

        if (!azure_token && !service_token) {
            return reply.badRequest('Must provide either azure_token or service_token')
        }

        try {
            let authResult

            if (azure_token) {
                // Check if this is a test mode token first
                if (azure_token.startsWith('mock-')) {
                    const testAuth = await fastify.auth.validateTestToken(azure_token)
                    if (testAuth) {
                        // For test mode, return the mock token directly
                        // No need to generate a new JWT
                        return {
                            jwt: azure_token,
                            user: testAuth.user,
                            roles: testAuth.roles,
                            permissions: testAuth.permissions
                        }
                    }
                }
                
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
                return reply.unauthorized('Token expired')
            }
            return reply.unauthorized(error.message || 'Invalid token')
        }
    })
}