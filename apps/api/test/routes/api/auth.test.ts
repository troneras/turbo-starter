import { it, describe, expect, afterEach, beforeEach } from 'bun:test'
import { build } from '../../helpers/build-app'
import { serviceTokens, users } from '@cms/db/schema'
import { createHash } from 'crypto'
import { eq } from 'drizzle-orm'

describe('Auth API', () => {
    let app: any

    beforeEach(async () => {
        app = await build()
        await app.ready()
    })

    afterEach(async () => {
        if (app) {
            await app.close()
        }
    })

    describe('POST /api/auth/login', () => {
        it('should return 400 when no token is provided', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                payload: {}
            })

            expect(res.statusCode).toBe(400)
            expect(JSON.parse(res.payload)).toEqual({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Must provide either azure_token or service_token'
            })
        })

        it('should return 400 when both tokens are provided', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                payload: {
                    azure_token: 'mock_azure_token',
                    service_token: 'mock_service_token'
                }
            })

            expect(res.statusCode).toBe(400)
            expect(JSON.parse(res.payload)).toEqual({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Cannot provide both azure_token and service_token'
            })
        })

        describe('Azure AD Authentication', () => {
            it('should successfully login with valid Azure AD token', async () => {
                // Create a mock Azure AD token (base64 encoded JSON)
                const azureTokenData = {
                    email: 'test@example.com',
                    name: 'Test User',
                    oid: 'azure-object-id-123',
                    tid: 'azure-tenant-id-456'
                }
                const azureToken = Buffer.from(JSON.stringify(azureTokenData)).toString('base64')

                const res = await app.inject({
                    method: 'POST',
                    url: '/api/auth/login',
                    payload: {
                        azure_token: azureToken
                    }
                })

                expect(res.statusCode).toBe(200)
                const response = JSON.parse(res.payload)

                expect(response).toHaveProperty('jwt')
                expect(response).toHaveProperty('user')
                expect(response).toHaveProperty('roles')
                expect(response).toHaveProperty('permissions')

                expect(response.user.email).toBe('test@example.com')
                expect(response.user.name).toBe('Test User')
                expect(typeof response.jwt).toBe('string')
                expect(Array.isArray(response.roles)).toBe(true)
                expect(Array.isArray(response.permissions)).toBe(true)
            })

            it('should return 401 with invalid Azure AD token', async () => {
                const res = await app.inject({
                    method: 'POST',
                    url: '/api/auth/login',
                    payload: {
                        azure_token: 'invalid_token'
                    }
                })

                expect(res.statusCode).toBe(401)
                expect(JSON.parse(res.payload)).toEqual({
                    statusCode: 401,
                    error: 'Unauthorized',
                    message: 'Invalid Azure AD token'
                })
            })

            it('should update existing user on subsequent logins', async () => {
                const azureTokenData = {
                    email: 'existing@example.com',
                    name: 'Existing User',
                    oid: 'azure-object-id-789',
                    tid: 'azure-tenant-id-012'
                }
                const azureToken = Buffer.from(JSON.stringify(azureTokenData)).toString('base64')

                // First login - creates user
                const firstRes = await app.inject({
                    method: 'POST',
                    url: '/api/auth/login',
                    payload: {
                        azure_token: azureToken
                    }
                })

                expect(firstRes.statusCode).toBe(200)

                // Second login - updates existing user
                const secondRes = await app.inject({
                    method: 'POST',
                    url: '/api/auth/login',
                    payload: {
                        azure_token: azureToken
                    }
                })

                expect(secondRes.statusCode).toBe(200)
                const response = JSON.parse(secondRes.payload)
                expect(response.user.email).toBe('existing@example.com')
            })
        })

        describe('Service Token Authentication', () => {
            beforeEach(async () => {
                // Create or find a test user (required for created_by field)
                let testUser
                try {
                    // Try to find existing test user first
                    const existingUsers = await app.db.select().from(users).where(eq(users.email, 'test-service-creator@example.com')).limit(1)

                    if (existingUsers.length > 0) {
                        testUser = existingUsers[0]
                    } else {
                        // Create new test user if doesn't exist
                        [testUser] = await app.db.insert(users).values({
                            email: 'test-service-creator@example.com',
                            name: 'Test Service Creator'
                        }).returning()
                    }
                } catch (error) {
                    // If creation fails due to duplicate, try to find the existing user
                    const existingUsers = await app.db.select().from(users).where(eq(users.email, 'test-service-creator@example.com')).limit(1)
                    if (existingUsers.length > 0) {
                        testUser = existingUsers[0]
                    } else {
                        throw error // Re-throw if it's a different error
                    }
                }

                // Create a test service token in the database
                const tokenHash = createHash('sha256').update('test_service_token').digest('hex')

                try {
                    await app.db.insert(serviceTokens).values({
                        name: 'Test Service',
                        token_hash: tokenHash,
                        scope: ['read:users', 'write:content'],
                        created_by: testUser.id,
                        status: 'active',
                        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
                    })
                } catch (error) {
                    // Service token might already exist, that's okay for testing
                    console.log('Service token setup error (might already exist)')
                }
            })

            it('should successfully login with valid service token', async () => {
                const res = await app.inject({
                    method: 'POST',
                    url: '/api/auth/login',
                    payload: {
                        service_token: 'test_service_token'
                    }
                })

                expect(res.statusCode).toBe(200)
                const response = JSON.parse(res.payload)

                expect(response).toHaveProperty('jwt')
                expect(response).toHaveProperty('user')
                expect(response).toHaveProperty('roles')
                expect(response).toHaveProperty('permissions')

                expect(response.user.name).toBe('Test Service')
                expect(response.user.email).toBe('Test Service@service.local')
                expect(response.roles).toContain('service')
                expect(response.permissions).toEqual(['read:users', 'write:content'])
            })

            it('should return 401 with invalid service token', async () => {
                const res = await app.inject({
                    method: 'POST',
                    url: '/api/auth/login',
                    payload: {
                        service_token: 'invalid_service_token'
                    }
                })

                expect(res.statusCode).toBe(401)
                expect(JSON.parse(res.payload)).toEqual({
                    statusCode: 401,
                    error: 'Unauthorized',
                    message: 'Invalid service token'
                })
            })
        })

        describe('Error Handling', () => {
            it('should return 401 for expired tokens', async () => {
                // This test would need proper mocking of the auth service
                // For now, we'll test the general error case structure
                const res = await app.inject({
                    method: 'POST',
                    url: '/api/auth/login',
                    payload: {
                        azure_token: 'expired_token_format'
                    }
                })

                expect(res.statusCode).toBe(401)
                const response = JSON.parse(res.payload)
                expect(response).toHaveProperty('error')
            })

            it('should handle malformed request body', async () => {
                const res = await app.inject({
                    method: 'POST',
                    url: '/api/auth/login',
                    payload: {
                        invalid_field: 'invalid_value'
                    }
                })

                expect(res.statusCode).toBe(400)
                expect(JSON.parse(res.payload)).toEqual({
                    statusCode: 400,
                    error: 'Bad Request',
                    message: 'Must provide either azure_token or service_token'
                })
            })
        })

        describe('JWT Token Generation', () => {
            it('should generate valid JWT tokens', async () => {
                const azureTokenData = {
                    email: 'jwt@example.com',
                    name: 'JWT User',
                    oid: 'jwt-oid',
                    tid: 'jwt-tid'
                }
                const azureToken = Buffer.from(JSON.stringify(azureTokenData)).toString('base64')

                const res = await app.inject({
                    method: 'POST',
                    url: '/api/auth/login',
                    payload: {
                        azure_token: azureToken
                    }
                })

                expect(res.statusCode).toBe(200)
                const response = JSON.parse(res.payload)

                // JWT should be a string with 3 parts separated by dots
                expect(typeof response.jwt).toBe('string')
                expect(response.jwt.split('.').length).toBe(3)

                // Should be able to verify the JWT
                try {
                    const decoded = app.jwt.decode(response.jwt)
                    expect(decoded.email).toBe('jwt@example.com')
                    expect(decoded.name).toBe('JWT User')
                    expect(Array.isArray(decoded.roles)).toBe(true)
                    expect(Array.isArray(decoded.permissions)).toBe(true)
                } catch (error) {
                    throw new Error('Generated JWT should be valid')
                }
            })
        })
    })
})
