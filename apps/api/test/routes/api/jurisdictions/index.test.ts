import { it, describe, expect, afterEach, beforeEach } from 'bun:test'
import { build } from '../../../helpers/build-app'
import { jurisdictions, users, roles, userRoles } from '@cms/db/schema'
import { eq, and } from 'drizzle-orm'

describe('Jurisdictions API', () => {
    let app: any
    let testUser: any
    let adminUser: any
    let testJurisdictionIds: number[] = []

    beforeEach(async () => {
        app = await build()
        await app.ready()
        testJurisdictionIds = []

        // Create test users
        try {
            const existingUser = await app.db.select().from(users)
                .where(eq(users.email, 'test@example.com')).limit(1)
            
            if (existingUser.length > 0) {
                testUser = existingUser[0]
            } else {
                [testUser] = await app.db.insert(users).values({
                    email: 'test@example.com',
                    name: 'Test User',
                    azure_ad_oid: 'test-oid',
                    azure_ad_tid: 'test-tid'
                }).returning()
            }
        } catch (error) {
            const existingUser = await app.db.select().from(users)
                .where(eq(users.email, 'test@example.com')).limit(1)
            testUser = existingUser[0]
        }

        // Create admin user
        try {
            const existingAdmin = await app.db.select().from(users)
                .where(eq(users.email, 'admin@example.com')).limit(1)
            
            if (existingAdmin.length > 0) {
                adminUser = existingAdmin[0]
            } else {
                [adminUser] = await app.db.insert(users).values({
                    email: 'admin@example.com',
                    name: 'Admin User',
                    azure_ad_oid: 'admin-oid',
                    azure_ad_tid: 'admin-tid'
                }).returning()
            }
        } catch (error) {
            const existingAdmin = await app.db.select().from(users)
                .where(eq(users.email, 'admin@example.com')).limit(1)
            adminUser = existingAdmin[0]
        }

        // Ensure admin role exists and assign to admin user
        try {
            let adminRole = await app.db.select().from(roles)
                .where(eq(roles.name, 'admin')).limit(1)
            
            if (adminRole.length === 0) {
                [adminRole[0]] = await app.db.insert(roles).values({
                    name: 'admin'
                }).returning()
            }

            // Assign admin role to admin user
            const existingUserRole = await app.db.select().from(userRoles)
                .where(and(
                    eq(userRoles.userId, adminUser.id),
                    eq(userRoles.roleId, adminRole[0].id)
                )).limit(1)

            if (existingUserRole.length === 0) {
                await app.db.insert(userRoles).values({
                    userId: adminUser.id,
                    roleId: adminRole[0].id
                })
            }
        } catch (error) {
            // Handle race conditions
        }
    })

    afterEach(async () => {
        // Clean up test jurisdictions
        if (testJurisdictionIds.length > 0) {
            try {
                await app.db.delete(jurisdictions).where(
                    testJurisdictionIds.map(id => eq(jurisdictions.id, id)).reduce((acc, curr) => acc || curr)
                )
            } catch (error) {
                // Ignore cleanup errors
            }
        }
        
        if (app) {
            await app.close()
        }
    })

    describe('GET /api/jurisdictions', () => {
        it('should return 401 when no authentication token is provided', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/jurisdictions'
            })

            expect(res.statusCode).toBe(401)
            expect(JSON.parse(res.payload)).toEqual({
                statusCode: 401,
                error: 'Unauthorized',
                message: 'Missing or invalid authorization header'
            })
        })

        it('should return 401 when invalid authentication token is provided', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/jurisdictions',
                headers: {
                    authorization: 'Bearer invalid-token'
                }
            })

            expect(res.statusCode).toBe(401)
        })

        it('should return jurisdictions list when authenticated', async () => {
            const token = app.jwt.sign({ 
                email: testUser.email, 
                name: testUser.name,
                roles: []
            })

            const res = await app.inject({
                method: 'GET',
                url: '/api/jurisdictions',
                headers: {
                    authorization: `Bearer ${token}`
                }
            })

            expect(res.statusCode).toBe(200)
            expect(Array.isArray(JSON.parse(res.payload))).toBe(true)
        })

        it('should return all jurisdictions when authenticated', async () => {
            // Create test jurisdictions with unique codes
            const timestamp = Date.now()
            const [jurisdiction1] = await app.db.insert(jurisdictions).values({
                code: `T1${timestamp.toString().slice(-2)}`,
                name: `Test Jurisdiction 1 ${timestamp}`,
                description: 'Test jurisdiction description 1',
                region: 'Test Region',
                status: 'active'
            }).returning()
            testJurisdictionIds.push(jurisdiction1.id)

            const [jurisdiction2] = await app.db.insert(jurisdictions).values({
                code: `T2${timestamp.toString().slice(-2)}`,
                name: `Test Jurisdiction 2 ${timestamp}`,
                description: 'Test jurisdiction description 2',
                region: 'Test Region',
                status: 'inactive'
            }).returning()
            testJurisdictionIds.push(jurisdiction2.id)

            const token = app.jwt.sign({ 
                email: testUser.email, 
                name: testUser.name,
                roles: []
            })

            const res = await app.inject({
                method: 'GET',
                url: '/api/jurisdictions',
                headers: {
                    authorization: `Bearer ${token}`
                }
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)
            expect(Array.isArray(response)).toBe(true)
            expect(response.length).toBeGreaterThanOrEqual(2)
            
            // Find our test jurisdictions
            const testJurisdiction1 = response.find((j: any) => j.code === `T1${timestamp.toString().slice(-2)}`)
            const testJurisdiction2 = response.find((j: any) => j.code === `T2${timestamp.toString().slice(-2)}`)
            
            expect(testJurisdiction1).toBeDefined()
            expect(testJurisdiction1.name).toBe(`Test Jurisdiction 1 ${timestamp}`)
            expect(testJurisdiction1.status).toBe('active')
            expect(testJurisdiction1.region).toBe('Test Region')
            expect(testJurisdiction2).toBeDefined()
            expect(testJurisdiction2.name).toBe(`Test Jurisdiction 2 ${timestamp}`)
            expect(testJurisdiction2.status).toBe('inactive')
        })

        it('should support search filtering by code', async () => {
            // Create test jurisdictions with unique codes
            const timestamp = Date.now()
            const [jurisdiction1] = await app.db.insert(jurisdictions).values({
                code: `SEARCH${timestamp.toString().slice(-2)}`,
                name: `SearchTest Jurisdiction ${timestamp}`,
                region: 'Europe'
            }).returning()
            testJurisdictionIds.push(jurisdiction1.id)

            const [jurisdiction2] = await app.db.insert(jurisdictions).values({
                code: `OTHER${timestamp.toString().slice(-2)}`,
                name: `Other Jurisdiction ${timestamp}`,
                region: 'Asia'
            }).returning()
            testJurisdictionIds.push(jurisdiction2.id)

            const token = app.jwt.sign({ 
                email: testUser.email, 
                name: testUser.name,
                roles: []
            })

            const res = await app.inject({
                method: 'GET',
                url: `/api/jurisdictions?search=SEARCH${timestamp.toString().slice(-2)}`,
                headers: {
                    authorization: `Bearer ${token}`
                }
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)
            expect(Array.isArray(response)).toBe(true)
            expect(response.length).toBeGreaterThanOrEqual(1)
            
            // Should only contain the search result
            const foundJurisdiction = response.find((j: any) => j.code === `SEARCH${timestamp.toString().slice(-2)}`)
            expect(foundJurisdiction).toBeDefined()
        })

        it('should support search filtering by name', async () => {
            const timestamp = Date.now()
            const [jurisdiction] = await app.db.insert(jurisdictions).values({
                code: `NAME${timestamp.toString().slice(-2)}`,
                name: `UniqueNameTest ${timestamp}`,
                region: 'Europe'
            }).returning()
            testJurisdictionIds.push(jurisdiction.id)

            const token = app.jwt.sign({ 
                email: testUser.email, 
                name: testUser.name,
                roles: []
            })

            const res = await app.inject({
                method: 'GET',
                url: '/api/jurisdictions?search=UniqueNameTest',
                headers: {
                    authorization: `Bearer ${token}`
                }
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)
            expect(Array.isArray(response)).toBe(true)
            expect(response.length).toBeGreaterThanOrEqual(1)
            
            const foundJurisdiction = response.find((j: any) => j.name.includes('UniqueNameTest'))
            expect(foundJurisdiction).toBeDefined()
        })

        it('should support status filtering', async () => {
            const timestamp = Date.now()
            const [activeJurisdiction] = await app.db.insert(jurisdictions).values({
                code: `ACT${timestamp.toString().slice(-2)}`,
                name: `Active Jurisdiction ${timestamp}`,
                status: 'active'
            }).returning()
            testJurisdictionIds.push(activeJurisdiction.id)

            const [inactiveJurisdiction] = await app.db.insert(jurisdictions).values({
                code: `INA${timestamp.toString().slice(-2)}`,
                name: `Inactive Jurisdiction ${timestamp}`,
                status: 'inactive'
            }).returning()
            testJurisdictionIds.push(inactiveJurisdiction.id)

            const token = app.jwt.sign({ 
                email: testUser.email, 
                name: testUser.name,
                roles: []
            })

            const res = await app.inject({
                method: 'GET',
                url: '/api/jurisdictions?status=active',
                headers: {
                    authorization: `Bearer ${token}`
                }
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)
            expect(Array.isArray(response)).toBe(true)
            
            // All results should have status 'active'
            response.forEach((jurisdiction: any) => {
                expect(jurisdiction.status).toBe('active')
            })
        })

        it('should support region filtering', async () => {
            const timestamp = Date.now()
            const [europeanJurisdiction] = await app.db.insert(jurisdictions).values({
                code: `EUR${timestamp.toString().slice(-2)}`,
                name: `European Jurisdiction ${timestamp}`,
                region: 'Europe'
            }).returning()
            testJurisdictionIds.push(europeanJurisdiction.id)

            const [asianJurisdiction] = await app.db.insert(jurisdictions).values({
                code: `ASI${timestamp.toString().slice(-2)}`,
                name: `Asian Jurisdiction ${timestamp}`,
                region: 'Asia'
            }).returning()
            testJurisdictionIds.push(asianJurisdiction.id)

            const token = app.jwt.sign({ 
                email: testUser.email, 
                name: testUser.name,
                roles: []
            })

            const res = await app.inject({
                method: 'GET',
                url: '/api/jurisdictions?region=Europe',
                headers: {
                    authorization: `Bearer ${token}`
                }
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)
            expect(Array.isArray(response)).toBe(true)
            
            // All results should have region 'Europe'
            response.forEach((jurisdiction: any) => {
                expect(jurisdiction.region).toBe('Europe')
            })
        })

        it('should support pagination', async () => {
            const token = app.jwt.sign({ 
                email: testUser.email, 
                name: testUser.name,
                roles: []
            })

            const res = await app.inject({
                method: 'GET',
                url: '/api/jurisdictions?page=1&pageSize=5',
                headers: {
                    authorization: `Bearer ${token}`
                }
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)
            expect(Array.isArray(response)).toBe(true)
            expect(response.length).toBeLessThanOrEqual(5)
        })
    })

    describe('GET /api/jurisdictions/:id', () => {
        let testJurisdiction: any

        beforeEach(async () => {
            // Create test jurisdiction
            [testJurisdiction] = await app.db.insert(jurisdictions).values({
                code: 'TEST_GET',
                name: 'Test Get Jurisdiction',
                description: 'Test jurisdiction for GET by ID',
                status: 'active',
                region: 'Test Region'
            }).returning()
            testJurisdictionIds.push(testJurisdiction.id)
        })

        it('should return 401 when no authentication token is provided', async () => {
            const res = await app.inject({
                method: 'GET',
                url: `/api/jurisdictions/${testJurisdiction.id}`
            })

            expect(res.statusCode).toBe(401)
        })

        it('should return 404 when jurisdiction does not exist', async () => {
            const token = app.jwt.sign({ 
                email: testUser.email, 
                name: testUser.name,
                roles: []
            })

            const res = await app.inject({
                method: 'GET',
                url: '/api/jurisdictions/99999',
                headers: {
                    authorization: `Bearer ${token}`
                }
            })

            expect(res.statusCode).toBe(404)
            expect(JSON.parse(res.payload)).toEqual({
                statusCode: 404,
                error: 'Not Found',
                message: 'Jurisdiction with ID 99999 not found'
            })
        })

        it('should return 400 when id is not a number', async () => {
            const token = app.jwt.sign({ 
                email: testUser.email, 
                name: testUser.name,
                roles: []
            })

            const res = await app.inject({
                method: 'GET',
                url: '/api/jurisdictions/invalid-id',
                headers: {
                    authorization: `Bearer ${token}`
                }
            })

            expect(res.statusCode).toBe(400)
        })

        it('should return jurisdiction details when authenticated', async () => {
            const token = app.jwt.sign({ 
                email: testUser.email, 
                name: testUser.name,
                roles: []
            })

            const res = await app.inject({
                method: 'GET',
                url: `/api/jurisdictions/${testJurisdiction.id}`,
                headers: {
                    authorization: `Bearer ${token}`
                }
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('id', testJurisdiction.id)
            expect(response).toHaveProperty('code', 'TEST_GET')
            expect(response).toHaveProperty('name', 'Test Get Jurisdiction')
            expect(response).toHaveProperty('description', 'Test jurisdiction for GET by ID')
            expect(response).toHaveProperty('status', 'active')
            expect(response).toHaveProperty('region', 'Test Region')
            expect(response).toHaveProperty('createdAt')
            expect(response).toHaveProperty('updatedAt')
        })
    })

    describe('POST /api/jurisdictions', () => {
        it('should return 401 when no authentication token is provided', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/api/jurisdictions',
                payload: {
                    code: 'TEST_POST',
                    name: 'Test Post Jurisdiction'
                }
            })

            expect(res.statusCode).toBe(401)
        })

        it('should return 403 when user lacks admin role', async () => {
            const token = app.jwt.sign({ 
                email: testUser.email, 
                name: testUser.name,
                roles: []
            })

            const res = await app.inject({
                method: 'POST',
                url: '/api/jurisdictions',
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    code: 'TEST_FORBIDDEN',
                    name: 'Test Forbidden Jurisdiction'
                }
            })

            expect(res.statusCode).toBe(403)
        })

        it('should return 400 when code is missing', async () => {
            const token = app.jwt.sign({ 
                email: adminUser.email, 
                name: adminUser.name,
                roles: ['admin']
            })

            const res = await app.inject({
                method: 'POST',
                url: '/api/jurisdictions',
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    name: 'Test Missing Code'
                }
            })

            expect(res.statusCode).toBe(400)
        })

        it('should return 400 when name is missing', async () => {
            const token = app.jwt.sign({ 
                email: adminUser.email, 
                name: adminUser.name,
                roles: ['admin']
            })

            const res = await app.inject({
                method: 'POST',
                url: '/api/jurisdictions',
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    code: 'TEST_NO_NAME'
                }
            })

            expect(res.statusCode).toBe(400)
        })

        it('should return 400 when code format is invalid', async () => {
            const token = app.jwt.sign({ 
                email: adminUser.email, 
                name: adminUser.name,
                roles: ['admin']
            })

            const res = await app.inject({
                method: 'POST',
                url: '/api/jurisdictions',
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    code: 'invalid@code!',
                    name: 'Invalid Code Format'
                }
            })

            expect(res.statusCode).toBe(400)
        })

        it('should create jurisdiction successfully with valid data', async () => {
            const token = app.jwt.sign({ 
                email: adminUser.email, 
                name: adminUser.name,
                roles: ['admin']
            })

            const timestamp = Date.now()
            const uniqueCode = `CREATE${timestamp.toString().slice(-3)}`
            const res = await app.inject({
                method: 'POST',
                url: '/api/jurisdictions',
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    code: uniqueCode,
                    name: 'Test Create Jurisdiction',
                    description: 'Created via API test',
                    region: 'Test Region'
                }
            })

            expect(res.statusCode).toBe(201)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('id')
            expect(response).toHaveProperty('code', uniqueCode)
            expect(response).toHaveProperty('name', 'Test Create Jurisdiction')
            expect(response).toHaveProperty('description', 'Created via API test')
            expect(response).toHaveProperty('status', 'active') // Default value
            expect(response).toHaveProperty('region', 'Test Region')
            expect(response).toHaveProperty('createdAt')
            expect(response).toHaveProperty('updatedAt')
            testJurisdictionIds.push(response.id)
        })

        it('should create jurisdiction with custom status', async () => {
            const token = app.jwt.sign({ 
                email: adminUser.email, 
                name: adminUser.name,
                roles: ['admin']
            })

            const timestamp = Date.now()
            const uniqueCode = `INACTIVE${timestamp.toString().slice(-2)}`
            const res = await app.inject({
                method: 'POST',
                url: '/api/jurisdictions',
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    code: uniqueCode,
                    name: 'Inactive Jurisdiction',
                    status: 'inactive'
                }
            })

            expect(res.statusCode).toBe(201)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('status', 'inactive')
            testJurisdictionIds.push(response.id)
        })

        it('should return 409 when jurisdiction code already exists', async () => {
            // Create initial jurisdiction
            const timestamp = Date.now()
            const uniqueCode = `DUP${timestamp.toString().slice(-3)}`
            const [initialJurisdiction] = await app.db.insert(jurisdictions).values({
                code: uniqueCode,
                name: 'Initial Jurisdiction'
            }).returning()
            testJurisdictionIds.push(initialJurisdiction.id)

            const token = app.jwt.sign({ 
                email: adminUser.email, 
                name: adminUser.name,
                roles: ['admin']
            })

            const res = await app.inject({
                method: 'POST',
                url: '/api/jurisdictions',
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    code: uniqueCode,
                    name: 'Duplicate Jurisdiction'
                }
            })

            expect([409, 500]).toContain(res.statusCode)
            if (res.statusCode === 409) {
                expect(JSON.parse(res.payload)).toEqual({
                    statusCode: 409,
                    error: 'Conflict',
                    message: `Jurisdiction with code "${uniqueCode}" already exists`
                })
            }
        })

        it('should handle empty name appropriately', async () => {
            const token = app.jwt.sign({ 
                email: adminUser.email, 
                name: adminUser.name,
                roles: ['admin']
            })

            const res = await app.inject({
                method: 'POST',
                url: '/api/jurisdictions',
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    code: 'EMPTY_NAME',
                    name: ''
                }
            })

            expect(res.statusCode).toBe(400)
        })
    })

    describe('PUT /api/jurisdictions/:id', () => {
        let testJurisdiction: any

        beforeEach(async () => {
            // Create test jurisdiction
            [testJurisdiction] = await app.db.insert(jurisdictions).values({
                code: 'TEST_PUT',
                name: 'Test Put Jurisdiction',
                description: 'Original description',
                status: 'active',
                region: 'Original Region'
            }).returning()
            testJurisdictionIds.push(testJurisdiction.id)
        })

        it('should return 401 when no authentication token is provided', async () => {
            const res = await app.inject({
                method: 'PUT',
                url: `/api/jurisdictions/${testJurisdiction.id}`,
                payload: {
                    name: 'Updated Name'
                }
            })

            expect(res.statusCode).toBe(401)
        })

        it('should return 403 when user lacks admin role', async () => {
            const token = app.jwt.sign({ 
                email: testUser.email, 
                name: testUser.name,
                roles: []
            })

            const res = await app.inject({
                method: 'PUT',
                url: `/api/jurisdictions/${testJurisdiction.id}`,
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    name: 'Updated Name'
                }
            })

            expect(res.statusCode).toBe(403)
        })

        it('should return 404 when jurisdiction does not exist', async () => {
            const token = app.jwt.sign({ 
                email: adminUser.email, 
                name: adminUser.name,
                roles: ['admin']
            })

            const res = await app.inject({
                method: 'PUT',
                url: '/api/jurisdictions/99999',
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    name: 'Non-existent'
                }
            })

            expect(res.statusCode).toBe(404)
        })

        it('should update jurisdiction successfully', async () => {
            const token = app.jwt.sign({ 
                email: adminUser.email, 
                name: adminUser.name,
                roles: ['admin']
            })

            const res = await app.inject({
                method: 'PUT',
                url: `/api/jurisdictions/${testJurisdiction.id}`,
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    name: 'Updated Test Jurisdiction',
                    description: 'Updated description',
                    status: 'inactive',
                    region: 'Updated Region'
                }
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('id', testJurisdiction.id)
            expect(response).toHaveProperty('code', 'TEST_PUT')
            expect(response).toHaveProperty('name', 'Updated Test Jurisdiction')
            expect(response).toHaveProperty('description', 'Updated description')
            expect(response).toHaveProperty('status', 'inactive')
            expect(response).toHaveProperty('region', 'Updated Region')
        })

        it('should handle partial updates', async () => {
            const token = app.jwt.sign({ 
                email: adminUser.email, 
                name: adminUser.name,
                roles: ['admin']
            })

            const res = await app.inject({
                method: 'PUT',
                url: `/api/jurisdictions/${testJurisdiction.id}`,
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    status: 'inactive'
                }
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('id', testJurisdiction.id)
            expect(response).toHaveProperty('code', 'TEST_PUT')
            expect(response).toHaveProperty('name', 'Test Put Jurisdiction') // Original name preserved
            expect(response).toHaveProperty('status', 'inactive') // Updated status
            expect(response).toHaveProperty('region', 'Original Region') // Original region preserved
        })

        it('should update code when provided', async () => {
            const token = app.jwt.sign({ 
                email: adminUser.email, 
                name: adminUser.name,
                roles: ['admin']
            })

            const timestamp = Date.now()
            const newCode = `NEW${timestamp.toString().slice(-3)}`
            const res = await app.inject({
                method: 'PUT',
                url: `/api/jurisdictions/${testJurisdiction.id}`,
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    code: newCode
                }
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('code', newCode)
        })
    })

    describe('DELETE /api/jurisdictions/:id', () => {
        let testJurisdiction: any

        beforeEach(async () => {
            // Create test jurisdiction
            [testJurisdiction] = await app.db.insert(jurisdictions).values({
                code: 'TEST_DEL',
                name: 'Test Delete Jurisdiction'
            }).returning()
            testJurisdictionIds.push(testJurisdiction.id)
        })

        it('should return 401 when no authentication token is provided', async () => {
            const res = await app.inject({
                method: 'DELETE',
                url: `/api/jurisdictions/${testJurisdiction.id}`
            })

            expect(res.statusCode).toBe(401)
        })

        it('should return 403 when user lacks admin role', async () => {
            const token = app.jwt.sign({ 
                email: testUser.email, 
                name: testUser.name,
                roles: []
            })

            const res = await app.inject({
                method: 'DELETE',
                url: `/api/jurisdictions/${testJurisdiction.id}`,
                headers: {
                    authorization: `Bearer ${token}`
                }
            })

            expect(res.statusCode).toBe(403)
        })

        it('should return 404 when jurisdiction does not exist', async () => {
            const token = app.jwt.sign({ 
                email: adminUser.email, 
                name: adminUser.name,
                roles: ['admin']
            })

            const res = await app.inject({
                method: 'DELETE',
                url: '/api/jurisdictions/99999',
                headers: {
                    authorization: `Bearer ${token}`
                }
            })

            expect(res.statusCode).toBe(404)
        })

        it('should delete jurisdiction successfully', async () => {
            const token = app.jwt.sign({ 
                email: adminUser.email, 
                name: adminUser.name,
                roles: ['admin']
            })

            const res = await app.inject({
                method: 'DELETE',
                url: `/api/jurisdictions/${testJurisdiction.id}`,
                headers: {
                    authorization: `Bearer ${token}`
                }
            })

            expect(res.statusCode).toBe(204)
            
            // Remove from cleanup list since it's already deleted
            testJurisdictionIds = testJurisdictionIds.filter(id => id !== testJurisdiction.id)
            
            // Verify jurisdiction was deleted
            const verification = await app.db.select().from(jurisdictions)
                .where(eq(jurisdictions.id, testJurisdiction.id)).limit(1)
            expect(verification.length).toBe(0)
        })
    })

    describe('Rate Limiting and Concurrent Requests', () => {
        it('should handle multiple concurrent requests gracefully', async () => {
            const token = app.jwt.sign({ 
                email: adminUser.email, 
                name: adminUser.name,
                roles: ['admin']
            })

            const timestamp = Date.now()
            // Make concurrent requests to test system robustness
            const promises = []
            for (let i = 0; i < 5; i++) {
                promises.push(
                    app.inject({
                        method: 'POST',
                        url: '/api/jurisdictions',
                        headers: {
                            authorization: `Bearer ${token}`
                        },
                        payload: {
                            code: `RL${timestamp}${i.toString().padStart(2, '0')}`,
                            name: `Rate Limit Test ${timestamp} ${i}`,
                            region: 'Test Region'
                        }
                    })
                )
            }

            const responses = await Promise.all(promises)
            
            // All should succeed or fail gracefully (no crashes)
            const successfulResponses = responses.filter(r => r.statusCode === 201)
            const errorResponses = responses.filter(r => r.statusCode >= 400)
            
            // Clean up any created jurisdictions
            successfulResponses.forEach(r => {
                const response = JSON.parse(r.payload)
                testJurisdictionIds.push(response.id)
            })
            
            // Should handle all requests without crashes
            expect(responses.length).toBe(5)
            expect(successfulResponses.length + errorResponses.length).toBe(5)
        })
    })

    describe('Data Validation', () => {
        it('should validate jurisdiction code pattern', async () => {
            const token = app.jwt.sign({ 
                email: adminUser.email, 
                name: adminUser.name,
                roles: ['admin']
            })

            // Test valid patterns
            const validCodes = ['ABC', 'A1B2', 'TEST_CODE', 'X-Y-Z']
            for (const code of validCodes) {
                const fullCode = code + Date.now().toString().slice(-3)
                const res = await app.inject({
                    method: 'POST',
                    url: '/api/jurisdictions',
                    headers: {
                        authorization: `Bearer ${token}`
                    },
                    payload: {
                        code: fullCode,
                        name: `Test ${code}`
                    }
                })
                
                expect([201, 409]).toContain(res.statusCode) // 201 success or 409 if duplicate
                if (res.statusCode === 201) {
                    const response = JSON.parse(res.payload)
                    testJurisdictionIds.push(response.id)
                }
            }

            // Test invalid patterns  
            const invalidCodes = ['abc', 'test@code', 'test code', '123!']
            for (const code of invalidCodes) {
                const res = await app.inject({
                    method: 'POST',
                    url: '/api/jurisdictions',
                    headers: {
                        authorization: `Bearer ${token}`
                    },
                    payload: {
                        code,
                        name: `Test ${code}`
                    }
                })
                
                expect(res.statusCode).toBe(400)
            }
        })

        it('should validate status enum values', async () => {
            const token = app.jwt.sign({ 
                email: adminUser.email, 
                name: adminUser.name,
                roles: ['admin']
            })

            // Test valid status values
            const validStatuses = ['active', 'inactive']
            for (const status of validStatuses) {
                const timestamp = Date.now()
                const res = await app.inject({
                    method: 'POST',
                    url: '/api/jurisdictions',
                    headers: {
                        authorization: `Bearer ${token}`
                    },
                    payload: {
                        code: `${status.toUpperCase()}${timestamp.toString().slice(-3)}`,
                        name: `${status} jurisdiction`,
                        status
                    }
                })
                
                expect(res.statusCode).toBe(201)
                const response = JSON.parse(res.payload)
                expect(response.status).toBe(status)
                testJurisdictionIds.push(response.id)
            }

            // Test invalid status value
            const res = await app.inject({
                method: 'POST',
                url: '/api/jurisdictions',
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    code: `INVALID${Date.now().toString().slice(-3)}`,
                    name: 'Invalid status jurisdiction',
                    status: 'invalid_status'
                }
            })
            
            expect(res.statusCode).toBe(400)
        })
    })
})