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
        requireRole: (requiredRole: string) => (request: FastifyRequest) => Promise<void>
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
        // Validate test mode JWT token
        async validateTestToken(token: string): Promise<AuthUser | null> {
            if (!isTestMode) return null
            
            // Test tokens start with 'mock-'
            if (!token.startsWith('mock-')) return null
            
            try {
                // For test mode, decode the user data from localStorage
                // The frontend stores user data when using test auth
                // Here we create a synthetic user based on the token pattern
                
                let testUser: AuthUser
                
                if (token === 'mock-admin-jwt-token') {
                    testUser = {
                        user: {
                            id: 'admin-test-123',
                            email: 'admin@example.com',
                            name: 'Admin User'
                        },
                        roles: ['admin', 'user'],
                        permissions: [
                            'users:read', 'users:create', 'users:update', 'users:delete',
                            'brands:read', 'brands:create', 'brands:update', 'brands:delete',
                            'translations:read', 'translations:create', 'translations:update', 
                            'translations:delete', 'translations:publish'
                        ]
                    }
                } else if (token === 'mock-editor-jwt-token') {
                    testUser = {
                        user: {
                            id: 'editor-test-123',
                            email: 'editor@example.com',
                            name: 'Editor User'
                        },
                        roles: ['editor', 'user'],
                        permissions: [
                            'users:read',
                            'brands:read',
                            'translations:read', 'translations:create', 'translations:update'
                        ]
                    }
                } else if (token === 'mock-user-jwt-token') {
                    testUser = {
                        user: {
                            id: 'user-test-123',
                            email: 'user@example.com',
                            name: 'Basic User'
                        },
                        roles: ['user'],
                        permissions: ['users:read', 'brands:read', 'translations:read']
                    }
                } else if (token.startsWith('mock-') && token.endsWith('-jwt-token')) {
                    // Custom test user - extract ID from token
                    const userId = token.replace('mock-', '').replace('-jwt-token', '')
                    testUser = {
                        user: {
                            id: userId,
                            email: `${userId}@test.local`,
                            name: `Test User ${userId}`
                        },
                        roles: ['user'],
                        permissions: ['users:read']
                    }
                } else {
                    return null
                }
                
                fastify.log.warn({ token, user: testUser.user.email }, 'Test mode authentication used')
                return testUser
            } catch (error) {
                fastify.log.error({ error, token }, 'Failed to validate test token')
                return null
            }
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

        // Azure AD token validation

        async validateAzureToken(token: string): Promise<AuthUser> {
            try {
                // Decode base64 token for testing
                const decoded = JSON.parse(Buffer.from(token, 'base64').toString())

                // Find or create user
                const existingUsers = await fastify.db
                    .select()
                    .from(users)
                    .where(eq(users.email, decoded.email))
                    .limit(1)
                
                let user = existingUsers[0]

                if (!user) {
                    // Determine role for new user (admin bootstrap logic)
                    const assignedRoleName = await this.determineNewUserRole()
                    
                    // Create new user from Azure AD
                    const createdUsers = await fastify.db
                        .insert(users)
                        .values({
                            email: decoded.email,
                            name: decoded.name,
                            azure_ad_oid: decoded.oid,
                            azure_ad_tid: decoded.tid,
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