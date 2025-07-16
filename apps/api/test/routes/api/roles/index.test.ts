import { it, describe, expect, afterEach, beforeEach } from 'bun:test'
import { build } from '../../../helpers/build-app'
import { users, roles, permissions, rolePermissions, userRoles } from '@cms/db/schema'
import { createHash } from 'crypto'
import { eq } from 'drizzle-orm'

describe('Roles API', () => {
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

    describe('GET /api/roles', () => {
        let testUser: any
        let adminUser: any
        let regularUser: any
        let adminRole: any
        let userRole: any
        let testPermission: any
        let userToken: string
        let adminToken: string

        beforeEach(async () => {
            // Create test users with unique emails for each test run
            const timestamp = Date.now()
            
            const [createdTestUser] = await app.db
                .insert(users)
                .values({
                    email: `test-${timestamp}@example.com`,
                    name: 'Test User',
                    azure_ad_oid: `test-azure-oid-${timestamp}`,
                    azure_ad_tid: `test-azure-tid-${timestamp}`,
                })
                .returning()
            testUser = createdTestUser

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

            // Create test roles with unique names
            const [createdAdminRole] = await app.db
                .insert(roles)
                .values({
                    name: `admin-${timestamp}`,
                })
                .returning()
            adminRole = createdAdminRole

            const [createdUserRole] = await app.db
                .insert(roles)
                .values({
                    name: `user-${timestamp}`,
                })
                .returning()
            userRole = createdUserRole

            // Create test permission with unique name
            const [createdPermission] = await app.db
                .insert(permissions)
                .values({
                    name: `read:users-${timestamp}`,
                    description: 'Read user information',
                    resource: 'users',
                    action: 'read',
                })
                .returning()
            testPermission = createdPermission

            // Associate permission with admin role
            await app.db
                .insert(rolePermissions)
                .values({
                    roleId: adminRole.id,
                    permissionId: testPermission.id,
                })

            // Assign roles to users
            await app.db
                .insert(userRoles)
                .values({
                    userId: adminUser.id,
                    roleId: adminRole.id,
                })

            await app.db
                .insert(userRoles)
                .values({
                    userId: regularUser.id,
                    roleId: userRole.id,
                })

            // Generate JWT tokens
            adminToken = app.jwt.sign({
                id: adminUser.id,
                email: adminUser.email,
                name: adminUser.name,
                roles: ['admin'], // Use exact 'admin' string that route expects
            })

            userToken = app.jwt.sign({
                id: regularUser.id,
                email: regularUser.email,
                name: regularUser.name,
                roles: ['user'], // Use exact 'user' string
            })
        })

        it('should return all roles with permissions for admin user', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/roles',
                headers: {
                    authorization: `Bearer ${adminToken}`,
                },
            })

            expect(res.statusCode).toBe(200)
            
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('roles')
            expect(Array.isArray(response.roles)).toBe(true)
            expect(response.roles.length).toBeGreaterThanOrEqual(2)

            // Find admin role in response
            const adminRoleResponse = response.roles.find((r: any) => r.id === adminRole.id)
            expect(adminRoleResponse).toBeDefined()
            expect(adminRoleResponse.id).toBe(adminRole.id)
            expect(adminRoleResponse.name).toBe(adminRole.name)
            expect(Array.isArray(adminRoleResponse.permissions)).toBe(true)
            expect(adminRoleResponse.permissions.length).toBeGreaterThan(0)

            // Verify permission structure
            const permission = adminRoleResponse.permissions[0]
            expect(permission).toHaveProperty('id')
            expect(permission).toHaveProperty('name')
            expect(permission).toHaveProperty('description')
            expect(permission).toHaveProperty('resource')
            expect(permission).toHaveProperty('action')
        })

        it('should return all roles without permissions for non-admin user', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/roles',
                headers: {
                    authorization: `Bearer ${userToken}`,
                },
            })

            expect(res.statusCode).toBe(200)
            
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('roles')
            expect(Array.isArray(response.roles)).toBe(true)
            expect(response.roles.length).toBeGreaterThanOrEqual(2)

            // All roles should have empty permissions array for non-admin
            response.roles.forEach((role: any) => {
                expect(role).toHaveProperty('id')
                expect(role).toHaveProperty('name')
                expect(role).toHaveProperty('permissions')
                expect(Array.isArray(role.permissions)).toBe(true)
                expect(role.permissions.length).toBe(0)
            })
        })

        it('should return 401 without authentication token', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/roles',
            })

            expect(res.statusCode).toBe(401)
            
            const response = JSON.parse(res.payload)
            expect(response).toEqual({
                statusCode: 401,
                error: 'Unauthorized',
                message: 'Unauthorized',
            })
        })

        it('should return 401 with invalid token', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/roles',
                headers: {
                    authorization: 'Bearer invalid-token',
                },
            })

            expect(res.statusCode).toBe(401)
            
            const response = JSON.parse(res.payload)
            expect(response.statusCode).toBe(401)
            expect(response.error).toBe('Unauthorized')
            expect(response.message).toBe('Unauthorized')
        })

        it('should return 401 with malformed authorization header', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/roles',
                headers: {
                    authorization: 'InvalidFormat token',
                },
            })

            expect(res.statusCode).toBe(401)
            
            const response = JSON.parse(res.payload)
            expect(response.statusCode).toBe(401)
            expect(response.error).toBe('Unauthorized')
            expect(response.message).toBe('Unauthorized')
        })

        it('should return 401 with expired token', async () => {
            // Create an expired token (exp in past)
            const expiredToken = app.jwt.sign({
                id: adminUser.id,
                email: adminUser.email,
                name: adminUser.name,
                roles: ['admin'],
                exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
            })

            const res = await app.inject({
                method: 'GET',
                url: '/api/roles',
                headers: {
                    authorization: `Bearer ${expiredToken}`,
                },
            })

            expect(res.statusCode).toBe(401)
            
            const response = JSON.parse(res.payload)
            expect(response.statusCode).toBe(401)
            expect(response.error).toBe('Unauthorized')
            expect(response.message).toBe('Unauthorized')
        })

        it('should handle empty roles table gracefully', async () => {
            // Delete all roles
            await app.db.delete(rolePermissions)
            await app.db.delete(userRoles)
            await app.db.delete(roles)

            const res = await app.inject({
                method: 'GET',
                url: '/api/roles',
                headers: {
                    authorization: `Bearer ${adminToken}`,
                },
            })

            expect(res.statusCode).toBe(200)
            
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('roles')
            expect(Array.isArray(response.roles)).toBe(true)
            expect(response.roles.length).toBe(0)
        })

        it('should return roles in alphabetical order', async () => {
            // Create additional roles to test ordering
            const timestamp = Date.now()
            await app.db
                .insert(roles)
                .values([
                    { name: `zzz-last-role-${timestamp}` },
                    { name: `aaa-first-role-${timestamp}` },
                    { name: `mmm-middle-role-${timestamp}` },
                ])

            const res = await app.inject({
                method: 'GET',
                url: '/api/roles',
                headers: {
                    authorization: `Bearer ${adminToken}`,
                },
            })

            expect(res.statusCode).toBe(200)
            
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('roles')
            expect(Array.isArray(response.roles)).toBe(true)
            
            // Check that roles are sorted alphabetically
            const roleNames = response.roles.map((r: any) => r.name)
            const sortedRoleNames = [...roleNames].sort()
            expect(roleNames).toEqual(sortedRoleNames)
        })

        it('should handle user with no roles gracefully', async () => {
            // Create user with no roles
            const timestamp = Date.now()
            const [userWithoutRoles] = await app.db
                .insert(users)
                .values({
                    email: `noroles-${timestamp}@example.com`,
                    name: 'No Roles User',
                    azure_ad_oid: `noroles-azure-oid-${timestamp}`,
                    azure_ad_tid: `noroles-azure-tid-${timestamp}`,
                })
                .returning()

            const noRolesToken = app.jwt.sign({
                id: userWithoutRoles.id,
                email: userWithoutRoles.email,
                name: userWithoutRoles.name,
                roles: [], // No roles
            })

            const res = await app.inject({
                method: 'GET',
                url: '/api/roles',
                headers: {
                    authorization: `Bearer ${noRolesToken}`,
                },
            })

            expect(res.statusCode).toBe(200)
            
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('roles')
            expect(Array.isArray(response.roles)).toBe(true)
            
            // Should return roles without permissions (like non-admin)
            response.roles.forEach((role: any) => {
                expect(role.permissions.length).toBe(0)
            })
        })
    })
})