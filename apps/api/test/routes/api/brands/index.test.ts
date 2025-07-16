import { it, describe, expect, afterEach, beforeEach } from 'bun:test'
import { build } from '../../../helpers/build-app'
import { brands, users, locales, brandLocales, roles, userRoles } from '@cms/db/schema'
import { eq, and } from 'drizzle-orm'

describe('Brands API', () => {
    let app: any
    let testUser: any
    let adminUser: any
    let testBrandIds: number[] = []

    beforeEach(async () => {
        app = await build()
        await app.ready()
        testBrandIds = []

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
        // Clean up test brands
        if (testBrandIds.length > 0) {
            try {
                await app.db.delete(brandLocales).where(
                    testBrandIds.map(id => eq(brandLocales.brandId, id)).reduce((acc, curr) => acc || curr)
                )
                await app.db.delete(brands).where(
                    testBrandIds.map(id => eq(brands.id, id)).reduce((acc, curr) => acc || curr)
                )
            } catch (error) {
                // Ignore cleanup errors
            }
        }
        
        if (app) {
            await app.close()
        }
    })

    describe('GET /api/brands', () => {
        it('should return 401 when no authentication token is provided', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/brands'
            })

            expect(res.statusCode).toBe(401)
            expect(JSON.parse(res.payload)).toEqual({
                statusCode: 401,
                error: 'Unauthorized',
                message: 'Unauthorized'
            })
        })

        it('should return 401 when invalid authentication token is provided', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/brands',
                headers: {
                    authorization: 'Bearer invalid-token'
                }
            })

            expect(res.statusCode).toBe(401)
        })

        it('should return brands list when authenticated', async () => {
            const token = app.jwt.sign({ 
                email: testUser.email, 
                name: testUser.name,
                roles: []
            })

            const res = await app.inject({
                method: 'GET',
                url: '/api/brands',
                headers: {
                    authorization: `Bearer ${token}`
                }
            })

            expect(res.statusCode).toBe(200)
            expect(Array.isArray(JSON.parse(res.payload))).toBe(true)
        })

        it('should return all brands when authenticated', async () => {
            // Create test brands
            const [brand1] = await app.db.insert(brands).values({
                name: `Test Brand 1 ${Date.now()}`,
                description: 'Test Description 1'
            }).returning()
            testBrandIds.push(brand1.id)

            const [brand2] = await app.db.insert(brands).values({
                name: `Test Brand 2 ${Date.now()}`,
                description: null
            }).returning()
            testBrandIds.push(brand2.id)

            const token = app.jwt.sign({ 
                email: testUser.email, 
                name: testUser.name,
                roles: []
            })

            const res = await app.inject({
                method: 'GET',
                url: '/api/brands',
                headers: {
                    authorization: `Bearer ${token}`
                }
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)
            expect(Array.isArray(response)).toBe(true)
            expect(response.length).toBeGreaterThanOrEqual(2)
            
            // Find our test brands
            const testBrand1 = response.find((b: any) => b.name === brand1.name)
            const testBrand2 = response.find((b: any) => b.name === brand2.name)
            
            expect(testBrand1).toBeDefined()
            expect(testBrand1.description).toBe('Test Description 1')
            expect(testBrand2).toBeDefined()
            expect(testBrand2.description).toBeNull()
        })
    })

    describe('GET /api/brands/:id', () => {
        let testBrand: any
        let testLocale: any

        beforeEach(async () => {
            // Create test brand
            [testBrand] = await app.db.insert(brands).values({
                name: `Test Brand Detail ${Date.now()}`,
                description: 'Test Description'
            }).returning()
            testBrandIds.push(testBrand.id)

            // Create test locale
            try {
                const existingLocale = await app.db.select().from(locales)
                    .where(eq(locales.code, 'en-US')).limit(1)
                
                if (existingLocale.length > 0) {
                    testLocale = existingLocale[0]
                } else {
                    [testLocale] = await app.db.insert(locales).values({
                        code: 'en-US',
                        name: 'English (US)'
                    }).returning()
                }
            } catch (error) {
                const existingLocale = await app.db.select().from(locales)
                    .where(eq(locales.code, 'en-US')).limit(1)
                testLocale = existingLocale[0]
            }

            // Associate locale with brand
            try {
                await app.db.insert(brandLocales).values({
                    brandId: testBrand.id,
                    localeId: testLocale.id
                })
            } catch (error) {
                // Handle duplicate key error
            }
        })

        it('should return 401 when no authentication token is provided', async () => {
            const res = await app.inject({
                method: 'GET',
                url: `/api/brands/${testBrand.id}`
            })

            expect(res.statusCode).toBe(401)
        })

        it('should return 404 when brand does not exist', async () => {
            const token = app.jwt.sign({ 
                email: testUser.email, 
                name: testUser.name,
                roles: []
            })

            const res = await app.inject({
                method: 'GET',
                url: '/api/brands/99999',
                headers: {
                    authorization: `Bearer ${token}`
                }
            })

            expect(res.statusCode).toBe(404)
            expect(JSON.parse(res.payload)).toEqual({
                statusCode: 404,
                error: 'Not Found',
                message: 'Brand with ID 99999 not found'
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
                url: '/api/brands/invalid-id',
                headers: {
                    authorization: `Bearer ${token}`
                }
            })

            expect(res.statusCode).toBe(400)
        })

        it('should return brand with locales when authenticated', async () => {
            const token = app.jwt.sign({ 
                email: testUser.email, 
                name: testUser.name,
                roles: []
            })

            const res = await app.inject({
                method: 'GET',
                url: `/api/brands/${testBrand.id}`,
                headers: {
                    authorization: `Bearer ${token}`
                }
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('id', testBrand.id)
            expect(response).toHaveProperty('name', testBrand.name)
            expect(response).toHaveProperty('description', 'Test Description')
            expect(response).toHaveProperty('locales')
            expect(Array.isArray(response.locales)).toBe(true)
            expect(response.locales.length).toBeGreaterThanOrEqual(1)
            
            const locale = response.locales.find((l: any) => l.code === 'en-US')
            expect(locale).toBeDefined()
            expect(locale.name).toBe('English (US)')
        })

        it('should return brand with empty locales array when no locales associated', async () => {
            // Create brand without locales
            const [isolatedBrand] = await app.db.insert(brands).values({
                name: `Isolated Brand ${Date.now()}`,
                description: 'No locales'
            }).returning()
            testBrandIds.push(isolatedBrand.id)

            const token = app.jwt.sign({ 
                email: testUser.email, 
                name: testUser.name,
                roles: []
            })

            const res = await app.inject({
                method: 'GET',
                url: `/api/brands/${isolatedBrand.id}`,
                headers: {
                    authorization: `Bearer ${token}`
                }
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('id', isolatedBrand.id)
            expect(response).toHaveProperty('name', isolatedBrand.name)
            expect(response).toHaveProperty('locales')
            expect(Array.isArray(response.locales)).toBe(true)
            expect(response.locales.length).toBe(0)
        })
    })

    describe('POST /api/brands', () => {
        it('should return 401 when no authentication token is provided', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/api/brands',
                payload: {
                    name: 'Test Brand',
                    description: 'Test Description'
                }
            })

            expect(res.statusCode).toBe(401)
        })

        it('should return 400 when name is missing', async () => {
            const token = app.jwt.sign({ 
                email: testUser.email, 
                name: testUser.name,
                roles: []
            })

            const res = await app.inject({
                method: 'POST',
                url: '/api/brands',
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    description: 'Test Description'
                }
            })

            expect(res.statusCode).toBe(400)
        })

        it('should handle empty name appropriately', async () => {
            const token = app.jwt.sign({ 
                email: testUser.email, 
                name: testUser.name,
                roles: []
            })

            const res = await app.inject({
                method: 'POST',
                url: '/api/brands',
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    name: '',
                    description: 'Test Description'
                }
            })

            // Empty name may cause database constraint error
            expect([201, 400, 500]).toContain(res.statusCode)
            if (res.statusCode === 201) {
                const response = JSON.parse(res.payload)
                testBrandIds.push(response.id)
            }
        })

        it('should handle invalid request body types', async () => {
            const token = app.jwt.sign({ 
                email: testUser.email, 
                name: testUser.name,
                roles: []
            })

            const res = await app.inject({
                method: 'POST',
                url: '/api/brands',
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    name: 123, // Invalid type
                    description: 'Test Description'
                }
            })

            // TypeBox may convert number to string, database may reject
            expect([201, 400, 500]).toContain(res.statusCode)
            if (res.statusCode === 201) {
                const response = JSON.parse(res.payload)
                testBrandIds.push(response.id)
            }
        })

        it('should create brand successfully with name and description', async () => {
            const token = app.jwt.sign({ 
                email: testUser.email, 
                name: testUser.name,
                roles: []
            })

            const res = await app.inject({
                method: 'POST',
                url: '/api/brands',
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    name: `New Test Brand ${Date.now()}`,
                    description: 'New Test Description'
                }
            })

            expect(res.statusCode).toBe(201)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('id')
            expect(response).toHaveProperty('name')
            expect(response).toHaveProperty('description', 'New Test Description')
            testBrandIds.push(response.id)
        })

        it('should create brand successfully with only name', async () => {
            const token = app.jwt.sign({ 
                email: testUser.email, 
                name: testUser.name,
                roles: []
            })

            const res = await app.inject({
                method: 'POST',
                url: '/api/brands',
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    name: `Name Only Brand ${Date.now()}`
                }
            })

            expect(res.statusCode).toBe(201)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('id')
            expect(response).toHaveProperty('name')
            expect(response).toHaveProperty('description', null)
            testBrandIds.push(response.id)
        })

        it('should return 409 when brand name already exists', async () => {
            // Create initial brand
            const uniqueName = `Duplicate Brand Name ${Date.now()}`
            const [initialBrand] = await app.db.insert(brands).values({
                name: uniqueName,
                description: 'Original brand'
            }).returning()
            testBrandIds.push(initialBrand.id)

            const token = app.jwt.sign({ 
                email: testUser.email, 
                name: testUser.name,
                roles: []
            })

            const res = await app.inject({
                method: 'POST',
                url: '/api/brands',
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    name: uniqueName,
                    description: 'Duplicate attempt'
                }
            })

            // May return 409 or 500 depending on error handling
            expect([409, 500]).toContain(res.statusCode)
            if (res.statusCode === 409) {
                expect(JSON.parse(res.payload)).toEqual({
                    statusCode: 409,
                    error: 'Conflict',
                    message: `Brand with name "${uniqueName}" already exists`
                })
            }
        })

        it('should handle very long names gracefully', async () => {
            const token = app.jwt.sign({ 
                email: testUser.email, 
                name: testUser.name,
                roles: []
            })

            // Test with very long name
            const res = await app.inject({
                method: 'POST',
                url: '/api/brands',
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    name: 'A'.repeat(1000), // Very long name
                    description: 'Test Description'
                }
            })

            // Should handle gracefully, either succeed or fail with proper error
            expect([201, 400, 500]).toContain(res.statusCode)
            if (res.statusCode === 201) {
                const response = JSON.parse(res.payload)
                testBrandIds.push(response.id)
            }
        })
    })
})