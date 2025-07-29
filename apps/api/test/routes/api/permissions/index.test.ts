import { it, describe, expect, afterEach, beforeEach } from 'bun:test'
import { build } from '../../../helpers/build-app'
import { users, permissions, userRoles, roles } from '@cms/db/schema'
import { eq } from 'drizzle-orm'

describe('Permissions API', () => {
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

    describe('GET /api/permissions', () => {
        let adminUser: any
        let regularUser: any
        let adminRole: any
        let userRole: any
        let testPermissions: any[]
        let userToken: string
        let adminToken: string

        beforeEach(async () => {
            const timestamp = Date.now()

            // Create test users
            const [createdAdminUser] = await app.db
                .insert(users)
                .values({
                    email: `admin-${timestamp}@example.com`,
                    name: 'Admin User',
                    azure_ad_oid: `admin-azure-oid-${timestamp}`,
                    azure_ad_tid: `admin-azure-tid-${timestamp}`,
                })
                .returning()
            adminUser = createdAdminUser

            const [createdRegularUser] = await app.db
                .insert(users)
                .values({
                    email: `regular-${timestamp}@example.com`,
                    name: 'Regular User',
                    azure_ad_oid: `regular-azure-oid-${timestamp}`,
                    azure_ad_tid: `regular-azure-tid-${timestamp}`,
                })
                .returning()
            regularUser = createdRegularUser

            // Create test roles
            const [createdAdminRole] = await app.db
                .insert(roles)
                .values({
                    name: `admin-role-${timestamp}`,
                    description: 'Admin role for testing',
                })
                .returning()
            adminRole = createdAdminRole

            const [createdUserRole] = await app.db
                .insert(roles)
                .values({
                    name: `user-role-${timestamp}`,
                    description: 'User role for testing',
                })
                .returning()
            userRole = createdUserRole

            // Create test permissions
            const permissionData = [
                {
                    name: `users:create-${timestamp}`,
                    description: 'Permission to create users',
                    resource: 'users',
                    action: 'create',
                    category: 'users',
                },
                {
                    name: `users:read-${timestamp}`,
                    description: 'Permission to read users',
                    resource: 'users', 
                    action: 'read',
                    category: 'users',
                },
                {
                    name: `content:publish-${timestamp}`,
                    description: 'Permission to publish content',
                    resource: 'content',
                    action: 'publish', 
                    category: 'content',
                }
            ]

            testPermissions = await app.db
                .insert(permissions)
                .values(permissionData)
                .returning()

            // Assign roles to users
            await app.db.insert(userRoles).values([
                { userId: adminUser.id, roleId: adminRole.id },
                { userId: regularUser.id, roleId: userRole.id }
            ])

            // Generate tokens
            adminToken = app.jwt.sign({
                sub: adminUser.id,
                email: adminUser.email,
                name: adminUser.name,
                roles: ['admin']
            })

            userToken = app.jwt.sign({
                sub: regularUser.id,
                email: regularUser.email,
                name: regularUser.name,
                roles: ['user']
            })
        })

        it('should return 401 for missing authentication', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/permissions',
            })

            expect(res.statusCode).toBe(401)
            const response = JSON.parse(res.payload)
            expect(response.message).toBe('Unauthorized')
        })

        it('should return 401 for invalid token', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/permissions',
                headers: {
                    authorization: 'Bearer invalid-token',
                },
            })

            expect(res.statusCode).toBe(401)
            const response = JSON.parse(res.payload)
            expect(response.message).toBe('Unauthorized')
        })

        it('should return permissions list for authenticated user', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/permissions',
                headers: {
                    authorization: `Bearer ${userToken}`,
                },
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('permissions')
            expect(response).toHaveProperty('pagination')
            expect(Array.isArray(response.permissions)).toBe(true)
            expect(response.permissions.length).toBeGreaterThan(0)
        })

        it('should support pagination parameters', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/permissions?page=1&pageSize=2',
                headers: {
                    authorization: `Bearer ${adminToken}`,
                },
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)
            expect(response.pagination.page).toBe(1)
            expect(response.pagination.pageSize).toBe(2)
        })

        it('should support search filtering', async () => {
            const res = await app.inject({
                method: 'GET',
                url: `/api/permissions?search=users`,
                headers: {
                    authorization: `Bearer ${adminToken}`,
                },
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)
            expect(response.permissions.every((p: any) => 
                p.name.includes('users') || p.category.includes('users')
            )).toBe(true)
        })

        it('should support category filtering', async () => {
            const res = await app.inject({
                method: 'GET',
                url: `/api/permissions?category=users`,
                headers: {
                    authorization: `Bearer ${adminToken}`,
                },
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)
            expect(response.permissions.every((p: any) => p.category === 'users')).toBe(true)
        })

        it('should support sorting', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/permissions?sortBy=name&sortDirection=asc',
                headers: {
                    authorization: `Bearer ${adminToken}`,
                },
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)
            const names = response.permissions.map((p: any) => p.name)
            const sortedNames = [...names].sort()
            expect(names).toEqual(sortedNames)
        })
    })

    describe('POST /api/permissions', () => {
        let adminUser: any
        let regularUser: any
        let adminToken: string
        let userToken: string

        beforeEach(async () => {
            const timestamp = Date.now()

            // Create admin user
            const [createdAdminUser] = await app.db
                .insert(users)
                .values({
                    email: `admin-${timestamp}@example.com`,
                    name: 'Admin User',
                    azure_ad_oid: `admin-azure-oid-${timestamp}`,
                    azure_ad_tid: `admin-azure-tid-${timestamp}`,
                })
                .returning()
            adminUser = createdAdminUser

            // Create regular user
            const [createdRegularUser] = await app.db
                .insert(users)
                .values({
                    email: `regular-${timestamp}@example.com`,
                    name: 'Regular User',
                    azure_ad_oid: `regular-azure-oid-${timestamp}`,
                    azure_ad_tid: `regular-azure-tid-${timestamp}`,
                })
                .returning()
            regularUser = createdRegularUser

            // Generate tokens
            adminToken = app.jwt.sign({
                sub: adminUser.id,
                email: adminUser.email,
                name: adminUser.name,
                roles: ['admin']
            })

            userToken = app.jwt.sign({
                sub: regularUser.id,
                email: regularUser.email,
                name: regularUser.name,
                roles: ['user']
            })
        })

        it('should return 401 for missing authentication', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/api/permissions',
                payload: {
                    name: 'test:permission',
                    description: 'Test permission',
                    resource: 'test',
                    action: 'permission',
                    category: 'test'
                }
            })

            expect(res.statusCode).toBe(401)
            const response = JSON.parse(res.payload)
            expect(response.message).toBe('Unauthorized')
        })

        it('should return 403 for non-admin user', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/api/permissions',
                headers: {
                    authorization: `Bearer ${userToken}`,
                },
                payload: {
                    name: 'test:permission',
                    description: 'Test permission',
                    resource: 'test',
                    action: 'permission',
                    category: 'test'
                }
            })

            expect(res.statusCode).toBe(403)
            const response = JSON.parse(res.payload)
            expect(response.message).toBe('Forbidden')
        })

        it('should return 400 for missing required fields', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/api/permissions',
                headers: {
                    authorization: `Bearer ${adminToken}`,
                },
                payload: {
                    description: 'Test permission'
                }
            })

            expect(res.statusCode).toBe(400)
        })

        it('should return 400 for invalid field types', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/api/permissions',
                headers: {
                    authorization: `Bearer ${adminToken}`,
                },
                payload: {
                    name: 123, // Should be string
                    description: 'Test permission',
                    resource: 'test',
                    action: 'permission',
                    category: 'test'
                }
            })

            expect(res.statusCode).toBe(400)
        })

        it('should successfully create permission when valid data provided', async () => {
            const timestamp = Date.now()
            const permissionData = {
                name: `test:create-${timestamp}`,
                description: 'Permission to create test resources',
                resource: 'test',
                action: 'create',
                category: 'test'
            }

            const res = await app.inject({
                method: 'POST',
                url: '/api/permissions',
                headers: {
                    authorization: `Bearer ${adminToken}`,
                },
                payload: permissionData
            })

            expect(res.statusCode).toBe(201)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('id')
            expect(response.name).toBe(permissionData.name)
            expect(response.description).toBe(permissionData.description)
            expect(response.category).toBe(permissionData.category)
            expect(response).toHaveProperty('created_at')
            expect(response).toHaveProperty('updated_at')

            // Verify permission was created in database
            const [dbPermission] = await app.db
                .select()
                .from(permissions)
                .where(eq(permissions.id, response.id))
            
            expect(dbPermission).toBeTruthy()
            expect(dbPermission.name).toBe(permissionData.name)
        })

        it('should return 409 for duplicate permission name', async () => {
            const timestamp = Date.now()
            const permissionName = `duplicate:permission-${timestamp}`

            // Create first permission
            await app.db
                .insert(permissions)
                .values({
                    name: permissionName,
                    description: 'First permission',
                    resource: 'test',
                    action: 'duplicate',
                    category: 'test'
                })

            // Try to create second permission with same name
            const res = await app.inject({
                method: 'POST',
                url: '/api/permissions',
                headers: {
                    authorization: `Bearer ${adminToken}`,
                },
                payload: {
                    name: permissionName,
                    description: 'Second permission',
                    resource: 'test',
                    action: 'duplicate',
                    category: 'test'
                }
            })

            expect(res.statusCode).toBe(409)
            const response = JSON.parse(res.payload)
            expect(response.message).toContain('already exists')
        })

        it('should create permission without description', async () => {
            const timestamp = Date.now()
            const permissionData = {
                name: `test:no-description-${timestamp}`,
                resource: 'test',
                action: 'no-description',
                category: 'test'
            }

            const res = await app.inject({
                method: 'POST',
                url: '/api/permissions',
                headers: {
                    authorization: `Bearer ${adminToken}`,
                },
                payload: permissionData
            })

            expect(res.statusCode).toBe(201)
            const response = JSON.parse(res.payload)
            expect(response.name).toBe(permissionData.name)
            expect(response.category).toBe(permissionData.category)
            expect(response.description).toBeNull()
        })
    })

    describe('GET /api/permissions/:id', () => {
        let adminUser: any
        let testPermission: any
        let adminToken: string

        beforeEach(async () => {
            const timestamp = Date.now()

            // Create admin user
            const [createdAdminUser] = await app.db
                .insert(users)
                .values({
                    email: `admin-${timestamp}@example.com`,
                    name: 'Admin User',
                    azure_ad_oid: `admin-azure-oid-${timestamp}`,
                    azure_ad_tid: `admin-azure-tid-${timestamp}`,
                })
                .returning()
            adminUser = createdAdminUser

            // Create test permission
            const [createdPermission] = await app.db
                .insert(permissions)
                .values({
                    name: `test:permission-${timestamp}`,
                    description: 'Test permission for GET endpoint',
                    resource: 'test',
                    action: 'permission',
                    category: 'test'
                })
                .returning()
            testPermission = createdPermission

            // Generate token
            adminToken = app.jwt.sign({
                sub: adminUser.id,
                email: adminUser.email,
                name: adminUser.name,
                roles: ['admin']
            })
        })

        it('should return 401 for missing authentication', async () => {
            const res = await app.inject({
                method: 'GET',
                url: `/api/permissions/${testPermission.id}`,
            })

            expect(res.statusCode).toBe(401)
        })

        it('should return 404 for non-existent permission', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/permissions/99999',
                headers: {
                    authorization: `Bearer ${adminToken}`,
                },
            })

            expect(res.statusCode).toBe(404)
        })

        it('should return permission by ID', async () => {
            const res = await app.inject({
                method: 'GET',
                url: `/api/permissions/${testPermission.id}`,
                headers: {
                    authorization: `Bearer ${adminToken}`,
                },
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)
            expect(response.id).toBe(testPermission.id)
            expect(response.name).toBe(testPermission.name)
            expect(response.description).toBe(testPermission.description)
            expect(response.resource).toBe(testPermission.resource)
            expect(response.action).toBe(testPermission.action)
            expect(response.category).toBe(testPermission.category)
        })
    })

    describe('PUT /api/permissions/:id', () => {
        let adminUser: any
        let testPermission: any
        let adminToken: string
        let userToken: string

        beforeEach(async () => {
            const timestamp = Date.now()

            // Create admin user
            const [createdAdminUser] = await app.db
                .insert(users)
                .values({
                    email: `admin-${timestamp}@example.com`,
                    name: 'Admin User',
                    azure_ad_oid: `admin-azure-oid-${timestamp}`,
                    azure_ad_tid: `admin-azure-tid-${timestamp}`,
                })
                .returning()
            adminUser = createdAdminUser

            // Create regular user
            const [createdRegularUser] = await app.db
                .insert(users)
                .values({
                    email: `regular-${timestamp}@example.com`,
                    name: 'Regular User',
                    azure_ad_oid: `regular-azure-oid-${timestamp}`,
                    azure_ad_tid: `regular-azure-tid-${timestamp}`,
                })
                .returning()

            // Create test permission
            const [createdPermission] = await app.db
                .insert(permissions)
                .values({
                    name: `test:permission-${timestamp}`,
                    description: 'Test permission for PUT endpoint',
                    resource: 'test',
                    action: 'permission',
                    category: 'test'
                })
                .returning()
            testPermission = createdPermission

            // Generate tokens
            adminToken = app.jwt.sign({
                sub: adminUser.id,
                email: adminUser.email,
                name: adminUser.name,
                roles: ['admin']
            })

            userToken = app.jwt.sign({
                sub: createdRegularUser.id,
                email: createdRegularUser.email,
                name: createdRegularUser.name,
                roles: ['user']
            })
        })

        it('should return 401 for missing authentication', async () => {
            const res = await app.inject({
                method: 'PUT',
                url: `/api/permissions/${testPermission.id}`,
                payload: {
                    name: 'updated:permission'
                }
            })

            expect(res.statusCode).toBe(401)
        })

        it('should return 403 for non-admin user', async () => {
            const res = await app.inject({
                method: 'PUT',
                url: `/api/permissions/${testPermission.id}`,
                headers: {
                    authorization: `Bearer ${userToken}`,
                },
                payload: {
                    name: 'updated:permission'
                }
            })

            expect(res.statusCode).toBe(403)
        })

        it('should return 404 for non-existent permission', async () => {
            const res = await app.inject({
                method: 'PUT',
                url: '/api/permissions/99999',
                headers: {
                    authorization: `Bearer ${adminToken}`,
                },
                payload: {
                    name: 'updated:permission'
                }
            })

            expect(res.statusCode).toBe(404)
        })

        it('should successfully update permission', async () => {
            const timestamp = Date.now()
            const updates = {
                name: `updated:permission-${timestamp}`,
                description: 'Updated permission description',
                resource: 'updated',
                action: 'permission',
                category: 'updated'
            }

            const res = await app.inject({
                method: 'PUT',
                url: `/api/permissions/${testPermission.id}`,
                headers: {
                    authorization: `Bearer ${adminToken}`,
                },
                payload: updates
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)
            expect(response.id).toBe(testPermission.id)
            expect(response.name).toBe(updates.name)
            expect(response.description).toBe(updates.description)
            expect(response.resource).toBe(updates.resource)
            expect(response.action).toBe(updates.action)
            expect(response.category).toBe(updates.category)

            // Verify update in database
            const [dbPermission] = await app.db
                .select()
                .from(permissions)
                .where(eq(permissions.id, testPermission.id))
            
            expect(dbPermission.name).toBe(updates.name)
            expect(dbPermission.description).toBe(updates.description)
            expect(dbPermission.resource).toBe(updates.resource)
            expect(dbPermission.action).toBe(updates.action)
            expect(dbPermission.category).toBe(updates.category)
        })

        it('should support partial updates', async () => {
            const updates = {
                description: 'Partially updated description'
            }

            const res = await app.inject({
                method: 'PUT',
                url: `/api/permissions/${testPermission.id}`,
                headers: {
                    authorization: `Bearer ${adminToken}`,
                },
                payload: updates
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)
            expect(response.id).toBe(testPermission.id)
            expect(response.name).toBe(testPermission.name) // Should remain unchanged
            expect(response.description).toBe(updates.description)
            expect(response.resource).toBe(testPermission.resource) // Should remain unchanged
            expect(response.action).toBe(testPermission.action) // Should remain unchanged
            expect(response.category).toBe(testPermission.category) // Should remain unchanged
        })
    })

    describe('DELETE /api/permissions/:id', () => {
        let adminUser: any
        let testPermission: any
        let adminToken: string
        let userToken: string

        beforeEach(async () => {
            const timestamp = Date.now()

            // Create admin user
            const [createdAdminUser] = await app.db
                .insert(users)
                .values({
                    email: `admin-${timestamp}@example.com`,
                    name: 'Admin User',
                    azure_ad_oid: `admin-azure-oid-${timestamp}`,
                    azure_ad_tid: `admin-azure-tid-${timestamp}`,
                })
                .returning()
            adminUser = createdAdminUser

            // Create regular user
            const [createdRegularUser] = await app.db
                .insert(users)
                .values({
                    email: `regular-${timestamp}@example.com`,
                    name: 'Regular User',
                    azure_ad_oid: `regular-azure-oid-${timestamp}`,
                    azure_ad_tid: `regular-azure-tid-${timestamp}`,
                })
                .returning()

            // Create test permission
            const [createdPermission] = await app.db
                .insert(permissions)
                .values({
                    name: `test:permission-${timestamp}`,
                    description: 'Test permission for DELETE endpoint',
                    resource: 'test',
                    action: 'permission',
                    category: 'test'
                })
                .returning()
            testPermission = createdPermission

            // Generate tokens
            adminToken = app.jwt.sign({
                sub: adminUser.id,
                email: adminUser.email,
                name: adminUser.name,
                roles: ['admin']
            })

            userToken = app.jwt.sign({
                sub: createdRegularUser.id,
                email: createdRegularUser.email,
                name: createdRegularUser.name,
                roles: ['user']
            })
        })

        it('should return 401 for missing authentication', async () => {
            const res = await app.inject({
                method: 'DELETE',
                url: `/api/permissions/${testPermission.id}`,
            })

            expect(res.statusCode).toBe(401)
        })

        it('should return 403 for non-admin user', async () => {
            const res = await app.inject({
                method: 'DELETE',
                url: `/api/permissions/${testPermission.id}`,
                headers: {
                    authorization: `Bearer ${userToken}`,
                },
            })

            expect(res.statusCode).toBe(403)
        })

        it('should return 404 for non-existent permission', async () => {
            const res = await app.inject({
                method: 'DELETE',
                url: '/api/permissions/99999',
                headers: {
                    authorization: `Bearer ${adminToken}`,
                },
            })

            expect(res.statusCode).toBe(404)
        })

        it('should successfully delete permission', async () => {
            const res = await app.inject({
                method: 'DELETE',
                url: `/api/permissions/${testPermission.id}`,
                headers: {
                    authorization: `Bearer ${adminToken}`,
                },
            })

            expect(res.statusCode).toBe(204)

            // Verify permission was deleted from database
            const deletedPermission = await app.db
                .select()
                .from(permissions)
                .where(eq(permissions.id, testPermission.id))
            
            expect(deletedPermission).toHaveLength(0)
        })
    })
})