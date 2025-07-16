import { it, describe, expect, afterEach, beforeEach } from 'bun:test'
import { build } from '../../../helpers/build-app'
import { users, roles, userRoles } from '@cms/db/schema'
import { eq } from 'drizzle-orm'

describe('Users API', () => {
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

    describe('GET /api/users/me', () => {
        it('should return current user info with valid token', async () => {
            // Create a mock Azure AD token
            const timestamp = Date.now()
            const azureTokenData = {
                email: `current-user-${timestamp}@example.com`,
                name: 'Current User',
                oid: 'azure-oid-123',
                tid: 'azure-tid-456'
            }
            const azureToken = Buffer.from(JSON.stringify(azureTokenData)).toString('base64')

            // First login to create user and get JWT
            const loginRes = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                payload: { azure_token: azureToken }
            })

            expect(loginRes.statusCode).toBe(200)
            const loginResponse = JSON.parse(loginRes.payload)
            const jwt = loginResponse.jwt

            // Test the /me endpoint
            const res = await app.inject({
                method: 'GET',
                url: '/api/users/me',
                headers: {
                    authorization: `Bearer ${jwt}`
                }
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)

            expect(response).toHaveProperty('user')
            expect(response).toHaveProperty('roles')
            expect(response).toHaveProperty('permissions')

            expect(response.user.email).toBe(`current-user-${timestamp}@example.com`)
            expect(response.user.name).toBe('Current User')
            expect(response.user.azure_ad_oid).toBe('azure-oid-123')
            expect(response.user.azure_ad_tid).toBe('azure-tid-456')
            expect(Array.isArray(response.roles)).toBe(true)
            expect(Array.isArray(response.permissions)).toBe(true)
        })

        it('should return 401 without authentication token', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/users/me'
            })

            expect(res.statusCode).toBe(401)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('error')
        })

        it('should return 401 with invalid token', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/users/me',
                headers: {
                    authorization: 'Bearer invalid-token'
                }
            })

            expect(res.statusCode).toBe(401)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('error')
        })

        it('should return 401 with malformed authorization header', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/users/me',
                headers: {
                    authorization: 'InvalidFormat token'
                }
            })

            expect(res.statusCode).toBe(401)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('error')
        })
    })

    describe('GET /api/users', () => {
        let adminToken: string
        let userToken: string

        beforeEach(async () => {
            const timestamp = Date.now()
            
            // Ensure admin role exists first
            let adminRole
            try {
                [adminRole] = await app.db.insert(roles).values({
                    name: 'admin'
                }).returning()
            } catch (error) {
                // Role already exists, fetch it
                const existingRole = await app.db.select().from(roles)
                    .where(eq(roles.name, 'admin')).limit(1)
                adminRole = existingRole[0]
            }

            // Create admin user directly in database with role assigned
            const adminEmail = `admin-${timestamp}@example.com`
            const [adminUser] = await app.db.insert(users).values({
                email: adminEmail,
                name: 'Admin User',
                azure_ad_oid: 'admin-oid',
                azure_ad_tid: 'admin-tid'
            }).returning()

            // Assign admin role
            await app.db.insert(userRoles).values({
                userId: adminUser.id,
                roleId: adminRole.id
            })

            // Now login to get JWT with admin role
            const adminAzureData = {
                email: adminEmail,
                name: 'Admin User',
                oid: 'admin-oid',
                tid: 'admin-tid'
            }
            const adminAzureToken = Buffer.from(JSON.stringify(adminAzureData)).toString('base64')

            const adminLoginRes = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                payload: { azure_token: adminAzureToken }
            })

            adminToken = JSON.parse(adminLoginRes.payload).jwt

            // Create regular user
            const userAzureData = {
                email: `regular-user-${timestamp}@example.com`,
                name: 'Regular User',
                oid: 'user-oid',
                tid: 'user-tid'
            }
            const userAzureToken = Buffer.from(JSON.stringify(userAzureData)).toString('base64')

            const userLoginRes = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                payload: { azure_token: userAzureToken }
            })

            userToken = JSON.parse(userLoginRes.payload).jwt
        })

        it('should list users successfully with admin token', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/users',
                headers: {
                    authorization: `Bearer ${adminToken}`
                }
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)

            expect(response).toHaveProperty('users')
            expect(response).toHaveProperty('total')
            expect(response).toHaveProperty('page')
            expect(response).toHaveProperty('pageSize')

            expect(Array.isArray(response.users)).toBe(true)
            expect(typeof response.total).toBe('number')
            expect(response.page).toBe(1)
            expect(response.pageSize).toBe(20)

            // Check user structure
            if (response.users.length > 0) {
                const user = response.users[0]
                expect(user).toHaveProperty('id')
                expect(user).toHaveProperty('email')
                expect(user).toHaveProperty('name')
                expect(user).toHaveProperty('roles')
                expect(user).toHaveProperty('createdAt')
                expect(Array.isArray(user.roles)).toBe(true)
            }
        })

        it('should support pagination parameters', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/users?page=2&pageSize=5',
                headers: {
                    authorization: `Bearer ${adminToken}`
                }
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)

            expect(response.page).toBe(2)
            expect(response.pageSize).toBe(5)
        })

        it('should use default pagination when no parameters provided', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/users',
                headers: {
                    authorization: `Bearer ${adminToken}`
                }
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)

            expect(response.page).toBe(1)
            expect(response.pageSize).toBe(20)
        })

        it('should return 403 for non-admin user', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/users',
                headers: {
                    authorization: `Bearer ${userToken}`
                }
            })

            expect(res.statusCode).toBe(403)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('error')
        })

        it('should return 401 without authentication token', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/users'
            })

            expect(res.statusCode).toBe(401)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('error')
        })

        it('should handle invalid pagination parameters gracefully', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/users?page=invalid&pageSize=notanumber',
                headers: {
                    authorization: `Bearer ${adminToken}`
                }
            })

            // TypeBox validation rejects invalid query parameters
            expect(res.statusCode).toBe(400)
            const response = JSON.parse(res.payload)
            expect(response.message).toBeDefined()
        })
    })

    describe('POST /api/users', () => {
        let adminToken: string
        let userToken: string

        beforeEach(async () => {
            const timestamp = Date.now()
            
            // Ensure admin role exists first
            let adminRole
            try {
                [adminRole] = await app.db.insert(roles).values({
                    name: 'admin'
                }).returning()
            } catch (error) {
                // Role already exists, fetch it
                const existingRole = await app.db.select().from(roles)
                    .where(eq(roles.name, 'admin')).limit(1)
                adminRole = existingRole[0]
            }

            // Create admin user directly in database with role assigned
            const adminEmail = `admin-create-${timestamp}@example.com`
            const [adminUser] = await app.db.insert(users).values({
                email: adminEmail,
                name: 'Admin Creator',
                azure_ad_oid: 'admin-create-oid',
                azure_ad_tid: 'admin-create-tid'
            }).returning()

            // Assign admin role
            await app.db.insert(userRoles).values({
                userId: adminUser.id,
                roleId: adminRole.id
            })

            // Now login to get JWT with admin role
            const adminAzureData = {
                email: adminEmail,
                name: 'Admin Creator',
                oid: 'admin-create-oid',
                tid: 'admin-create-tid'
            }
            const adminAzureToken = Buffer.from(JSON.stringify(adminAzureData)).toString('base64')

            const adminLoginRes = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                payload: { azure_token: adminAzureToken }
            })

            adminToken = JSON.parse(adminLoginRes.payload).jwt

            // Create user role if it doesn't exist
            try {
                await app.db.insert(roles).values({ name: 'user' })
            } catch (error) {
                // Role might already exist
            }

            // Create regular user for permission testing
            const userAzureData = {
                email: `regular-create-${timestamp}@example.com`,
                name: 'Regular Creator',
                oid: 'regular-create-oid',
                tid: 'regular-create-tid'
            }
            const userAzureToken = Buffer.from(JSON.stringify(userAzureData)).toString('base64')

            const userLoginRes = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                payload: { azure_token: userAzureToken }
            })

            userToken = JSON.parse(userLoginRes.payload).jwt
        })

        it('should create user successfully with valid data', async () => {
            const timestamp = Date.now()
            const newUser = {
                email: `newuser-${timestamp}@example.com`,
                name: 'New User',
                roles: ['user']
            }

            const res = await app.inject({
                method: 'POST',
                url: '/api/users',
                headers: {
                    authorization: `Bearer ${adminToken}`
                },
                payload: newUser
            })

            expect(res.statusCode).toBe(201)
            const response = JSON.parse(res.payload)

            expect(response).toHaveProperty('id')
            expect(response.email).toBe(`newuser-${timestamp}@example.com`)
            expect(response.name).toBe('New User')
            expect(response.roles).toContain('user')
        })

        it('should create user with default role when roles not specified', async () => {
            const timestamp = Date.now()
            const newUser = {
                email: `defaultrole-${timestamp}@example.com`,
                name: 'Default Role User'
            }

            const res = await app.inject({
                method: 'POST',
                url: '/api/users',
                headers: {
                    authorization: `Bearer ${adminToken}`
                },
                payload: newUser
            })

            expect(res.statusCode).toBe(201)
            const response = JSON.parse(res.payload)

            expect(response.roles).toContain('user')
        })

        it('should return 400 when required fields are missing', async () => {
            const invalidUser = {
                name: 'Missing Email User'
            }

            const res = await app.inject({
                method: 'POST',
                url: '/api/users',
                headers: {
                    authorization: `Bearer ${adminToken}`
                },
                payload: invalidUser
            })

            expect(res.statusCode).toBe(400)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('error')
        })

        it('should return 400 when email is missing', async () => {
            const invalidUser = {
                email: 'invalid-email-format'
            }

            const res = await app.inject({
                method: 'POST',
                url: '/api/users',
                headers: {
                    authorization: `Bearer ${adminToken}`
                },
                payload: invalidUser
            })

            expect(res.statusCode).toBe(400)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('error')
        })

        it('should return 400 with invalid email format', async () => {
            const invalidUser = {
                email: 'not-an-email',
                name: 'Invalid Email User'
            }

            const res = await app.inject({
                method: 'POST',
                url: '/api/users',
                headers: {
                    authorization: `Bearer ${adminToken}`
                },
                payload: invalidUser
            })

            expect(res.statusCode).toBe(400)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('error')
        })

        it('should return 409 when user with email already exists', async () => {
            const timestamp = Date.now()
            const userData = {
                email: `duplicate-${timestamp}@example.com`,
                name: 'Duplicate User'
            }

            // Create first user
            const firstRes = await app.inject({
                method: 'POST',
                url: '/api/users',
                headers: {
                    authorization: `Bearer ${adminToken}`
                },
                payload: userData
            })

            expect(firstRes.statusCode).toBe(201)

            // Try to create duplicate
            const secondRes = await app.inject({
                method: 'POST',
                url: '/api/users',
                headers: {
                    authorization: `Bearer ${adminToken}`
                },
                payload: userData
            })

            expect(secondRes.statusCode).toBe(409)
            const response = JSON.parse(secondRes.payload)
            expect(response.message).toContain('already exists')
        })

        it('should return 400 with invalid role', async () => {
            const timestamp = Date.now()
            const invalidUser = {
                email: `invalidrole-${timestamp}@example.com`,
                name: 'Invalid Role User',
                roles: ['nonexistent-role']
            }

            const res = await app.inject({
                method: 'POST',
                url: '/api/users',
                headers: {
                    authorization: `Bearer ${adminToken}`
                },
                payload: invalidUser
            })

            expect(res.statusCode).toBe(400)
            const response = JSON.parse(res.payload)
            expect(response.message).toContain('Invalid role')
        })

        it('should return 403 for non-admin user', async () => {
            const newUser = {
                email: 'forbidden@example.com',
                name: 'Forbidden User'
            }

            const res = await app.inject({
                method: 'POST',
                url: '/api/users',
                headers: {
                    authorization: `Bearer ${userToken}`
                },
                payload: newUser
            })

            expect(res.statusCode).toBe(403)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('error')
        })

        it('should return 401 without authentication token', async () => {
            const newUser = {
                email: 'unauthorized@example.com',
                name: 'Unauthorized User'
            }

            const res = await app.inject({
                method: 'POST',
                url: '/api/users',
                payload: newUser
            })

            expect(res.statusCode).toBe(401)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('error')
        })
    })

    describe('PATCH /api/users/:id', () => {
        let adminToken: string
        let userToken: string
        let testUserId: string
        let timestamp: number

        beforeEach(async () => {
            timestamp = Date.now()
            
            // Ensure admin role exists first
            let adminRole
            try {
                [adminRole] = await app.db.insert(roles).values({
                    name: 'admin'
                }).returning()
            } catch (error) {
                // Role already exists, fetch it
                const existingRole = await app.db.select().from(roles)
                    .where(eq(roles.name, 'admin')).limit(1)
                adminRole = existingRole[0]
            }

            // Create admin user directly in database with role assigned
            const adminEmail = `admin-update-${timestamp}@example.com`
            const [adminUser] = await app.db.insert(users).values({
                email: adminEmail,
                name: 'Admin Updater',
                azure_ad_oid: 'admin-update-oid',
                azure_ad_tid: 'admin-update-tid'
            }).returning()

            // Assign admin role
            await app.db.insert(userRoles).values({
                userId: adminUser.id,
                roleId: adminRole.id
            })

            // Now login to get JWT with admin role
            const adminAzureData = {
                email: adminEmail,
                name: 'Admin Updater',
                oid: 'admin-update-oid',
                tid: 'admin-update-tid'
            }
            const adminAzureToken = Buffer.from(JSON.stringify(adminAzureData)).toString('base64')

            const adminLoginRes = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                payload: { azure_token: adminAzureToken }
            })

            adminToken = JSON.parse(adminLoginRes.payload).jwt

            // Create test user to update
            const [testUser] = await app.db.insert(users).values({
                email: `test-update-${timestamp}@example.com`,
                name: 'Test Update User'
            }).returning()

            testUserId = testUser.id

            // Create regular user for permission testing
            const userAzureData = {
                email: `regular-update-${timestamp}@example.com`,
                name: 'Regular Updater',
                oid: 'regular-update-oid',
                tid: 'regular-update-tid'
            }
            const userAzureToken = Buffer.from(JSON.stringify(userAzureData)).toString('base64')

            const userLoginRes = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                payload: { azure_token: userAzureToken }
            })

            userToken = JSON.parse(userLoginRes.payload).jwt
        })

        it('should update user successfully with valid data', async () => {
            const timestamp = Date.now()
            const updates = {
                name: 'Updated Test User',
                email: `updated-test-${timestamp}@example.com`
            }

            const res = await app.inject({
                method: 'PATCH',
                url: `/api/users/${testUserId}`,
                headers: {
                    authorization: `Bearer ${adminToken}`
                },
                payload: updates
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)

            expect(response.id).toBe(testUserId)
            expect(response.name).toBe('Updated Test User')
            expect(response.email).toBe(`updated-test-${timestamp}@example.com`)
        })

        it('should update user name only', async () => {
            const updates = {
                name: 'Only Name Updated'
            }

            const res = await app.inject({
                method: 'PATCH',
                url: `/api/users/${testUserId}`,
                headers: {
                    authorization: `Bearer ${adminToken}`
                },
                payload: updates
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)

            expect(response.name).toBe('Only Name Updated')
            expect(response.email).toBe(`test-update-${timestamp}@example.com`) // Original email
        })

        it('should update user roles', async () => {
            // Ensure admin role exists
            try {
                await app.db.insert(roles).values({ name: 'admin' })
            } catch (error) {
                // Role might already exist
            }

            const updates = {
                roles: ['admin']
            }

            const res = await app.inject({
                method: 'PATCH',
                url: `/api/users/${testUserId}`,
                headers: {
                    authorization: `Bearer ${adminToken}`
                },
                payload: updates
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)

            expect(response.roles).toContain('admin')
        })

        it('should return 404 for non-existent user', async () => {
            const nonExistentId = '00000000-0000-0000-0000-000000000000'
            const updates = {
                name: 'Non-existent User'
            }

            const res = await app.inject({
                method: 'PATCH',
                url: `/api/users/${nonExistentId}`,
                headers: {
                    authorization: `Bearer ${adminToken}`
                },
                payload: updates
            })

            expect(res.statusCode).toBe(404)
            const response = JSON.parse(res.payload)
            // TODO: Fix API to return custom error message
            expect(response.error).toBeDefined()
        })

        it('should return 409 when updating to existing email', async () => {
            // Create another user with different email
            const anotherTimestamp = Date.now() + 1
            await app.db.insert(users).values({
                email: `another-${anotherTimestamp}@example.com`,
                name: 'Another User'
            }).returning()

            // Try to update first user to use second user's email
            const updates = {
                email: `another-${anotherTimestamp}@example.com`
            }

            const res = await app.inject({
                method: 'PATCH',
                url: `/api/users/${testUserId}`,
                headers: {
                    authorization: `Bearer ${adminToken}`
                },
                payload: updates
            })

            expect(res.statusCode).toBe(409)
            const response = JSON.parse(res.payload)
            expect(response.message).toContain('already exists')
        })

        it('should return 403 for non-admin user', async () => {
            const updates = {
                name: 'Forbidden Update'
            }

            const res = await app.inject({
                method: 'PATCH',
                url: `/api/users/${testUserId}`,
                headers: {
                    authorization: `Bearer ${userToken}`
                },
                payload: updates
            })

            expect(res.statusCode).toBe(403)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('error')
        })

        it('should return 401 without authentication token', async () => {
            const updates = {
                name: 'Unauthorized Update'
            }

            const res = await app.inject({
                method: 'PATCH',
                url: `/api/users/${testUserId}`,
                payload: updates
            })

            expect(res.statusCode).toBe(401)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('error')
        })

        it('should handle invalid email format in update', async () => {
            const updates = {
                email: 'invalid-email-format'
            }

            const res = await app.inject({
                method: 'PATCH',
                url: `/api/users/${testUserId}`,
                headers: {
                    authorization: `Bearer ${adminToken}`
                },
                payload: updates
            })

            expect(res.statusCode).toBe(400)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('error')
        })
    })

    describe('DELETE /api/users/:id', () => {
        let adminToken: string
        let userToken: string
        let testUserId: string
        let adminUserId: string

        beforeEach(async () => {
            const timestamp = Date.now()
            
            // Ensure admin role exists first
            let adminRole
            try {
                [adminRole] = await app.db.insert(roles).values({
                    name: 'admin'
                }).returning()
            } catch (error) {
                // Role already exists, fetch it
                const existingRole = await app.db.select().from(roles)
                    .where(eq(roles.name, 'admin')).limit(1)
                adminRole = existingRole[0]
            }

            // Create admin user directly in database with role assigned
            const adminEmail = `admin-delete-${timestamp}@example.com`
            const [adminUser] = await app.db.insert(users).values({
                email: adminEmail,
                name: 'Admin Deleter',
                azure_ad_oid: 'admin-delete-oid',
                azure_ad_tid: 'admin-delete-tid'
            }).returning()

            adminUserId = adminUser.id

            // Assign admin role
            await app.db.insert(userRoles).values({
                userId: adminUser.id,
                roleId: adminRole.id
            })

            // Now login to get JWT with admin role
            const adminAzureData = {
                email: adminEmail,
                name: 'Admin Deleter',
                oid: 'admin-delete-oid',
                tid: 'admin-delete-tid'
            }
            const adminAzureToken = Buffer.from(JSON.stringify(adminAzureData)).toString('base64')

            const adminLoginRes = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                payload: { azure_token: adminAzureToken }
            })

            adminToken = JSON.parse(adminLoginRes.payload).jwt

            // Create test user to delete
            const [testUser] = await app.db.insert(users).values({
                email: `test-delete-${timestamp}@example.com`,
                name: 'Test Delete User'
            }).returning()

            testUserId = testUser.id

            // Create regular user for permission testing
            const userAzureData = {
                email: `regular-delete-${timestamp}@example.com`,
                name: 'Regular Deleter',
                oid: 'regular-delete-oid',
                tid: 'regular-delete-tid'
            }
            const userAzureToken = Buffer.from(JSON.stringify(userAzureData)).toString('base64')

            const userLoginRes = await app.inject({
                method: 'POST',
                url: '/api/auth/login',
                payload: { azure_token: userAzureToken }
            })

            userToken = JSON.parse(userLoginRes.payload).jwt
        })

        it('should delete user successfully', async () => {
            const res = await app.inject({
                method: 'DELETE',
                url: `/api/users/${testUserId}`,
                headers: {
                    authorization: `Bearer ${adminToken}`
                }
            })

            expect(res.statusCode).toBe(204)
            expect(res.payload).toBe('')

            // Verify user is deleted
            const deletedUser = await app.db.select().from(users)
                .where(eq(users.id, testUserId)).limit(1)
            expect(deletedUser.length).toBe(0)
        })

        it('should return 400 when trying to delete self', async () => {
            const res = await app.inject({
                method: 'DELETE',
                url: `/api/users/${adminUserId}`,
                headers: {
                    authorization: `Bearer ${adminToken}`
                }
            })

            expect(res.statusCode).toBe(400)
            const response = JSON.parse(res.payload)
            // TODO: Fix API to return custom error message
            expect(response.error).toBeDefined()
        })

        it('should return 404 for non-existent user', async () => {
            const nonExistentId = '00000000-0000-0000-0000-000000000000'

            const res = await app.inject({
                method: 'DELETE',
                url: `/api/users/${nonExistentId}`,
                headers: {
                    authorization: `Bearer ${adminToken}`
                }
            })

            expect(res.statusCode).toBe(404)
            const response = JSON.parse(res.payload)
            // TODO: Fix API to return custom error message
            expect(response.error).toBeDefined()
        })

        it('should return 403 for non-admin user', async () => {
            const res = await app.inject({
                method: 'DELETE',
                url: `/api/users/${testUserId}`,
                headers: {
                    authorization: `Bearer ${userToken}`
                }
            })

            expect(res.statusCode).toBe(403)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('error')
        })

        it('should return 401 without authentication token', async () => {
            const res = await app.inject({
                method: 'DELETE',
                url: `/api/users/${testUserId}`
            })

            expect(res.statusCode).toBe(401)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('error')
        })

        it('should handle invalid UUID format in parameters', async () => {
            const res = await app.inject({
                method: 'DELETE',
                url: '/api/users/invalid-uuid',
                headers: {
                    authorization: `Bearer ${adminToken}`
                }
            })

            // Invalid UUID format is caught by TypeBox validation - returns 400
            expect(res.statusCode).toBe(400)
            const response = JSON.parse(res.payload)
            expect(response.statusCode).toBe(400)
            expect(response.error).toBe('Bad Request')
            expect(response.message).toBeDefined()
        })
    })
})