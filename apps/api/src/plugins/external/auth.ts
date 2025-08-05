import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import type { FastifyInstance } from 'fastify'
import { createHash } from 'crypto'
import { eq, sql } from 'drizzle-orm'
import { users, serviceTokens, roles, userRoles, permissions, rolePermissions, userAuditLogs } from '@cms/db/schema'


declare module 'fastify' {
    interface FastifyInstance {
        auth: ReturnType<typeof authPlugin>,
        authenticate: (request: FastifyRequest) => Promise<void>,
        requireRole: (requiredRole: string) => (request: FastifyRequest) => Promise<void>,
        requirePermission: (requiredPermission: string) => (request: FastifyRequest) => Promise<void>,
        requireAnyRole: (roles: string[]) => (request: FastifyRequest) => Promise<void>
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
    // Check if we're in test mode
    const isTestMode = process.env.TEST_MODE === 'true' || process.env.NODE_ENV === 'test'

    return {
        // Extract common logic for loading user roles and permissions
        async loadUserRolesAndPermissions(userId: string): Promise<{ roles: string[], permissions: string[] }> {
            const userRoleData = await fastify.db
                .select({
                    roleName: roles.name,
                    permissions: permissions
                })
                .from(userRoles)
                .innerJoin(roles, eq(userRoles.roleId, roles.id))
                .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
                .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
                .where(eq(userRoles.userId, userId))

            const userRoleNames = [...new Set(userRoleData.map(r => r.roleName))]
            const userPermissions = userRoleData
                .filter(r => r.permissions)
                .map(r => r.permissions!.name)

            return {
                roles: userRoleNames,
                permissions: userPermissions
            }
        },

        // Extract common logic for creating or updating user
        async findOrCreateUser(userData: {
            email: string
            name: string
            azure_ad_oid?: string
            azure_ad_tid?: string
        }): Promise<{ user: any, isNewUser: boolean }> {
            const existingUsers = await fastify.db
                .select()
                .from(users)
                .where(eq(users.email, userData.email))
                .limit(1)

            let user = existingUsers[0]
            let isNewUser = false

            if (!user) {
                // Determine role for new user (admin bootstrap logic)
                const assignedRoleName = await this.determineNewUserRole()

                // Create new user
                const createdUsers = await fastify.db
                    .insert(users)
                    .values({
                        email: userData.email,
                        name: userData.name,
                        azure_ad_oid: userData.azure_ad_oid,
                        azure_ad_tid: userData.azure_ad_tid,
                        last_login_at: new Date(),
                        status: 'active'
                    })
                    .returning()

                user = createdUsers[0]

                if (!user) {
                    throw fastify.httpErrors.internalServerError('Failed to create user')
                }

                // Assign determined role (admin for first 10 users, user for rest)
                const roleResults = await fastify.db
                    .select()
                    .from(roles)
                    .where(eq(roles.name, assignedRoleName))
                    .limit(1)

                const assignedRole = roleResults[0]

                if (assignedRole) {
                    await fastify.db
                        .insert(userRoles)
                        .values({
                            userId: user.id,
                            roleId: assignedRole.id
                        })

                    // Log audit event for automatic role assignment
                    await this.logAuditEvent(
                        user.id,
                        user.id, // Self-assigned on creation
                        'role_assigned',
                        null,
                        { role: assignedRoleName },
                        'Automatic role assignment on user creation',
                        true
                    )
                }

                isNewUser = true
            } else {
                // Update last login and Azure AD data
                await fastify.db
                    .update(users)
                    .set({
                        last_login_at: new Date(),
                        azure_ad_oid: userData.azure_ad_oid,
                        azure_ad_tid: userData.azure_ad_tid
                    })
                    .where(eq(users.id, user.id))
            }

            return { user, isNewUser }
        },

        // Determine role for new user (admin bootstrap logic)
        async determineNewUserRole(): Promise<string> {
            return await fastify.db.transaction(async (tx) => {
                // Count current admin users with SELECT FOR UPDATE to prevent race conditions
                const adminCount = await tx
                    .select({ count: sql<number>`count(*)` })
                    .from(users)
                    .innerJoin(userRoles, eq(users.id, userRoles.userId))
                    .innerJoin(roles, eq(userRoles.roleId, roles.id))
                    .where(eq(roles.name, 'admin'))

                const currentAdminCount = Number(adminCount[0]?.count || 0)

                // First 10 users get admin role, rest get user role
                return currentAdminCount < 10 ? 'admin' : 'user'
            })
        },

        // Log audit event for user management actions
        async logAuditEvent(targetUserId: string, performedBy: string | null, action: string, oldValue: any = null, newValue: any = null, reason: string | null = null, isAutomatic: boolean = false) {
            if (!performedBy) return // Skip logging for system actions without actor

            await fastify.db
                .insert(userAuditLogs)
                .values({
                    targetUserId,
                    performedBy,
                    action,
                    oldValue: oldValue ? JSON.stringify(oldValue) : null,
                    newValue: newValue ? JSON.stringify(newValue) : null,
                    reason,
                    isAutomatic
                })
        },

        // Validate test mode JWT token
        async validateTestToken(token: string): Promise<AuthUser | null> {
            if (!isTestMode) return null

            // Test tokens start with 'mock-'
            if (!token.startsWith('mock-')) return null

            try {
                let testUserData: { email: string; name: string; id?: string }

                if (token === 'mock-admin-jwt-token') {
                    testUserData = {
                        id: '11111111-1111-1111-1111-111111111111',
                        email: 'admin@example.com',
                        name: 'Admin User'
                    }
                } else if (token === 'mock-editor-jwt-token') {
                    testUserData = {
                        id: '00000000-0000-0000-0000-000000000002',
                        email: 'editor@example.com',
                        name: 'Editor User'
                    }
                } else if (token === 'mock-user-jwt-token') {
                    testUserData = {
                        id: '00000000-0000-0000-0000-000000000003',
                        email: 'user@example.com',
                        name: 'Basic User'
                    }
                } else if (token.startsWith('mock-') && token.endsWith('-jwt-token')) {
                    // Custom test user - extract ID from token and create UUID
                    const userId = token.replace('mock-', '').replace('-jwt-token', '')
                    const paddedId = userId.padStart(12, '0')
                    const testUuid = `00000000-0000-0000-0000-${paddedId}`
                    testUserData = {
                        id: testUuid,
                        email: `${userId}@test.local`,
                        name: `Test User ${userId}`
                    }
                } else {
                    return null
                }

                // Find or create test user in database
                const { user, isNewUser } = await this.findOrCreateUser({
                    email: testUserData.email,
                    name: testUserData.name
                })

                // Load roles and permissions from database
                const { roles, permissions } = await this.loadUserRolesAndPermissions(user.id)

                const authUser: AuthUser = {
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        azure_ad_oid: user.azure_ad_oid || undefined,
                        azure_ad_tid: user.azure_ad_tid || undefined,
                        last_login_at: user.last_login_at || undefined
                    },
                    roles,
                    permissions
                }

                fastify.log.warn({
                    token,
                    user: authUser.user.email,
                    roles: authUser.roles,
                    permissionsCount: authUser.permissions.length,
                    isNewUser
                }, 'Test mode authentication used')
                
                return authUser
            } catch (error) {
                fastify.log.error({ error, token }, 'Failed to validate test token')
                return null
            }
        },

        // Azure AD token validation
        async validateAzureToken(token: string): Promise<AuthUser> {
            try {
                // Decode base64 token for testing
                const decoded = JSON.parse(Buffer.from(token, 'base64').toString())

                // Find or create user using shared logic
                const { user } = await this.findOrCreateUser({
                    email: decoded.email,
                    name: decoded.name,
                    azure_ad_oid: decoded.oid,
                    azure_ad_tid: decoded.tid
                })

                // Load roles and permissions using shared logic
                const { roles, permissions } = await this.loadUserRolesAndPermissions(user.id)

                return {
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        azure_ad_oid: user.azure_ad_oid || undefined,
                        azure_ad_tid: user.azure_ad_tid || undefined,
                        last_login_at: user.last_login_at || undefined
                    },
                    roles,
                    permissions
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

                const serviceTokenResults = await fastify.db
                    .select()
                    .from(serviceTokens)
                    .where(eq(serviceTokens.token_hash, tokenHash))
                    .limit(1)

                const serviceToken = serviceTokenResults[0]

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
    fastify.decorate('authenticate', async function (request: any) {
        try {
            // Extract token from Authorization header
            const authHeader = request.headers.authorization
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw fastify.httpErrors.unauthorized('Missing or invalid authorization header')
            }

            const token = authHeader.substring(7) // Remove 'Bearer ' prefix

            // Check if this is a test token first
            if (token.startsWith('mock-')) {
                const testAuth = await fastify.auth.validateTestToken(token)
                if (testAuth) {
                    // Set request.user with test auth data
                    request.user = {
                        sub: testAuth.user.id,
                        email: testAuth.user.email,
                        name: testAuth.user.name,
                        roles: testAuth.roles,
                        permissions: testAuth.permissions
                    }
                    return
                }
            }

            // Normal JWT verification
            const decoded = await request.jwtVerify()
            request.user = decoded
        } catch (err: any) {
            if (err.message && err.message.includes('authorization header')) {
                throw err
            }
            throw fastify.httpErrors.unauthorized('Unauthorized')
        }
    })

    // Role-based access control decorator
    fastify.decorate('requireRole', function (requiredRole: string) {
        return async function (request: any) {
            const user = request.user

            // b for test environment
            if (process.env.TEST_MODE === 'true' || process.env.NODE_ENV === 'test') {
                fastify.log.debug({
                    requiredRole,
                    user: user ? { sub: user.sub, roles: user.roles } : null
                }, 'Role check in requireRole')
            }

            if (!user || !user.roles || !user.roles.includes(requiredRole)) {
                throw fastify.httpErrors.forbidden('Forbidden')
            }
        }
    })

    // Permission-based access control decorator
    fastify.decorate('requirePermission', function (requiredPermission: string) {
        return async function (request: any) {
            const user = request.user

            if (!user || !user.permissions || !user.permissions.includes(requiredPermission)) {
                throw fastify.httpErrors.forbidden('Forbidden - missing required permission')
            }
        }
    })

    // Multiple role check decorator (any of the roles)
    fastify.decorate('requireAnyRole', function (roles: string[]) {
        return async function (request: any) {
            const user = request.user

            if (!user || !user.roles || !roles.some(role => user.roles.includes(role))) {
                throw fastify.httpErrors.forbidden('Forbidden - missing required role')
            }
        }
    })

    // Decorate fastify instance with auth methods
    fastify.decorate('auth', authPlugin(fastify))
}, {
    name: 'auth',
    dependencies: ['db']
})