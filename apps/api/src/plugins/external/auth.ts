import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import type { FastifyInstance } from 'fastify'
import { createHash } from 'crypto'
import { eq } from 'drizzle-orm'
import { users, serviceTokens, roles, userRoles, permissions, rolePermissions } from '@cms/db/schema'


declare module 'fastify' {
    interface FastifyInstance {
        auth: ReturnType<typeof authPlugin>,
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>,
        requireRole: (requiredRole: string) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    }
}

interface AuthUser {
    user: {
        id: string
        email: string
        name: string
        azure_ad_oid?: string
        azure_ad_tid?: string
        last_login_at?: Date
    }
    roles: string[]
    permissions: string[]
}

export function authPlugin(fastify: FastifyInstance) {


    return {
        // Azure AD token validation

        async validateAzureToken(token: string): Promise<AuthUser> {
            try {
                // Decode base64 token for testing
                const decoded = JSON.parse(Buffer.from(token, 'base64').toString())

                // Find or create user
                let [user] = await fastify.db
                    .select()
                    .from(users)
                    .where(eq(users.email, decoded.email))
                    .limit(1)

                if (!user) {
                    // Create new user from Azure AD
                    [user] = await fastify.db
                        .insert(users)
                        .values({
                            email: decoded.email,
                            name: decoded.name,
                            azure_ad_oid: decoded.oid,
                            azure_ad_tid: decoded.tid,
                            last_login_at: new Date()
                        })
                        .returning()

                    if (!user) {
                        throw fastify.httpErrors.internalServerError('Failed to create user')
                    }

                    // Assign default user role
                    const [userRole] = await fastify.db
                        .select()
                        .from(roles)
                        .where(eq(roles.name, 'user'))
                        .limit(1)

                    if (userRole) {
                        await fastify.db
                            .insert(userRoles)
                            .values({
                                userId: user.id,
                                roleId: userRole.id
                            })
                    }
                } else {
                    // Update last login
                    await fastify.db
                        .update(users)
                        .set({
                            last_login_at: new Date(),
                            azure_ad_oid: decoded.oid,
                            azure_ad_tid: decoded.tid
                        })
                        .where(eq(users.id, user.id))
                }

                // Get user roles and permissions
                const userRoleData = await fastify.db
                    .select({
                        roleName: roles.name,
                        permissions: permissions
                    })
                    .from(userRoles)
                    .innerJoin(roles, eq(userRoles.roleId, roles.id))
                    .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
                    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
                    .where(eq(userRoles.userId, user.id))

                const userRoleNames = [...new Set(userRoleData.map(r => r.roleName))]
                const userPermissions = userRoleData
                    .filter(r => r.permissions)
                    .map(r => r.permissions!.name)

                return {
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        azure_ad_oid: user.azure_ad_oid || undefined,
                        azure_ad_tid: user.azure_ad_tid || undefined,
                        last_login_at: user.last_login_at || undefined
                    },
                    roles: userRoleNames,
                    permissions: userPermissions
                }
            } catch (error) {
                throw fastify.httpErrors.unauthorized('Invalid Azure AD token')
            }
        },

        // Service token validation
        async validateServiceToken(token: string): Promise<AuthUser> {
            try {
                // Hash the token to compare with stored hash
                const tokenHash = createHash('sha256').update(token).digest('hex')

                const [serviceToken] = await fastify.db
                    .select()
                    .from(serviceTokens)
                    .where(eq(serviceTokens.token_hash, tokenHash))
                    .limit(1)

                if (!serviceToken) {
                    throw fastify.httpErrors.unauthorized('Invalid service token')
                }

                if (serviceToken.status !== 'active') {
                    throw fastify.httpErrors.badRequest('Service token is not active')
                }

                if (serviceToken.expires_at && serviceToken.expires_at < new Date()) {
                    throw fastify.httpErrors.badRequest('Service token expired')
                }

                // Update last used timestamp
                await fastify.db
                    .update(serviceTokens)
                    .set({ last_used_at: new Date() })
                    .where(eq(serviceTokens.id, serviceToken.id))

                // Service tokens have synthetic user data
                return {
                    user: {
                        id: serviceToken.id,
                        email: `${serviceToken.name}@service.local`,
                        name: serviceToken.name
                    },
                    roles: ['service'],
                    permissions: serviceToken.scope
                }
            } catch (error: any) {
                fastify.log.error(error, 'Service token validation failed')
                throw fastify.httpErrors.unauthorized('Invalid service token')
            }
        },

        // Generate JWT for our API
        async generateJWT(authResult: AuthUser): Promise<string> {
            const payload = {
                sub: authResult.user.id,
                email: authResult.user.email,
                name: authResult.user.name,
                roles: authResult.roles,
                permissions: authResult.permissions,
                azure_ad_oid: authResult.user.azure_ad_oid,
                azure_ad_tid: authResult.user.azure_ad_tid
            }

            return fastify.jwt.sign(payload)
        }
    }
}

export default fp(async function (fastify: FastifyInstance) {
    // Register JWT plugin
    await fastify.register(jwt, {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        sign: {
            expiresIn: '24h'
        }
    })
    // Authentication decorator
    fastify.decorate('authenticate', async function (request: any, reply: any) {
        try {
            const token = await request.jwtVerify()
            request.user = token
        } catch (err) {
            throw fastify.httpErrors.unauthorized('Unauthorized')
        }
    })

    // Role-based access control decorator
    fastify.decorate('requireRole', function (requiredRole: string) {
        return async function (request: any, reply: any) {
            const user = request.user

            if (!user || !user.roles || !user.roles.includes(requiredRole)) {
                throw fastify.httpErrors.forbidden('Forbidden')
            }
        }
    })

    // Decorate fastify instance with auth methods
    fastify.decorate('auth', authPlugin(fastify))
}, {
    name: 'auth',
    dependencies: ['db']
})