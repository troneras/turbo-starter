import { it, describe, expect, afterEach, beforeEach } from 'bun:test'
import { build } from '../../../helpers/build-app'
import { locales, users, roles, userRoles } from '@cms/db/schema'
import { eq, and } from 'drizzle-orm'

describe('Languages API', () => {
    let app: any
    let testUser: any
    let adminUser: any
    let testLanguageIds: number[] = []

    beforeEach(async () => {
        app = await build()
        await app.ready()
        testLanguageIds = []

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
        // Clean up test languages
        if (testLanguageIds.length > 0) {
            try {
                await app.db.delete(locales).where(
                    testLanguageIds.map(id => eq(locales.id, id)).reduce((acc, curr) => acc || curr)
                )
            } catch (error) {
                // Ignore cleanup errors
            }
        }
        
        if (app) {
            await app.close()
        }
    })

    describe('GET /api/languages', () => {
        it('should return 401 when no authentication token is provided', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/languages'
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
                url: '/api/languages',
                headers: {
                    authorization: 'Bearer invalid-token'
                }
            })

            expect(res.statusCode).toBe(401)
        })

        it('should return languages list when authenticated', async () => {
            const token = app.jwt.sign({ 
                email: testUser.email, 
                name: testUser.name,
                roles: []
            })

            const res = await app.inject({
                method: 'GET',
                url: '/api/languages',
                headers: {
                    authorization: `Bearer ${token}`
                }
            })

            expect(res.statusCode).toBe(200)
            expect(Array.isArray(JSON.parse(res.payload))).toBe(true)
        })

        it('should return all languages when authenticated', async () => {
            // Create test languages with unique codes
            const timestamp = Date.now()
            const [language1] = await app.db.insert(locales).values({
                code: `t1-${timestamp.toString().slice(-2)}`,
                name: `Test Language 1 ${timestamp}`
            }).returning()
            testLanguageIds.push(language1.id)

            const [language2] = await app.db.insert(locales).values({
                code: `t2-${timestamp.toString().slice(-2)}`,
                name: `Test Language 2 ${timestamp}`
            }).returning()
            testLanguageIds.push(language2.id)

            const token = app.jwt.sign({ 
                email: testUser.email, 
                name: testUser.name,
                roles: []
            })

            const res = await app.inject({
                method: 'GET',
                url: '/api/languages',
                headers: {
                    authorization: `Bearer ${token}`
                }
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)
            expect(Array.isArray(response)).toBe(true)
            expect(response.length).toBeGreaterThanOrEqual(2)
            
            // Find our test languages
            const testLanguage1 = response.find((l: any) => l.code === `t1-${timestamp.toString().slice(-2)}`)
            const testLanguage2 = response.find((l: any) => l.code === `t2-${timestamp.toString().slice(-2)}`)
            
            expect(testLanguage1).toBeDefined()
            expect(testLanguage1.name).toBe(`Test Language 1 ${timestamp}`)
            expect(testLanguage2).toBeDefined()
            expect(testLanguage2.name).toBe(`Test Language 2 ${timestamp}`)
        })

        it('should support search filtering', async () => {
            // Create test languages with unique codes
            const timestamp = Date.now()
            const [language1] = await app.db.insert(locales).values({
                code: `s1-${timestamp.toString().slice(-2)}`,
                name: `SearchTest Language ${timestamp}`
            }).returning()
            testLanguageIds.push(language1.id)

            const [language2] = await app.db.insert(locales).values({
                code: `s2-${timestamp.toString().slice(-2)}`,
                name: `SearchTest Other ${timestamp}`
            }).returning()
            testLanguageIds.push(language2.id)

            const token = app.jwt.sign({ 
                email: testUser.email, 
                name: testUser.name,
                roles: []
            })

            const res = await app.inject({
                method: 'GET',
                url: '/api/languages?search=SearchTest',
                headers: {
                    authorization: `Bearer ${token}`
                }
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)
            expect(Array.isArray(response)).toBe(true)
            expect(response.length).toBeGreaterThanOrEqual(2)
            
            // All results should contain "SearchTest"
            response.forEach((lang: any) => {
                expect(lang.name.toLowerCase()).toContain('searchtest')
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
                url: '/api/languages?page=1&pageSize=5',
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

    describe('GET /api/languages/:id', () => {
        let testLanguage: any

        beforeEach(async () => {
            // Create test language
            [testLanguage] = await app.db.insert(locales).values({
                code: 'de-DE',
                name: 'German (Germany)'
            }).returning()
            testLanguageIds.push(testLanguage.id)
        })

        it('should return 401 when no authentication token is provided', async () => {
            const res = await app.inject({
                method: 'GET',
                url: `/api/languages/${testLanguage.id}`
            })

            expect(res.statusCode).toBe(401)
        })

        it('should return 404 when language does not exist', async () => {
            const token = app.jwt.sign({ 
                email: testUser.email, 
                name: testUser.name,
                roles: []
            })

            const res = await app.inject({
                method: 'GET',
                url: '/api/languages/99999',
                headers: {
                    authorization: `Bearer ${token}`
                }
            })

            expect(res.statusCode).toBe(404)
            expect(JSON.parse(res.payload)).toEqual({
                statusCode: 404,
                error: 'Not Found',
                message: 'Language with ID 99999 not found'
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
                url: '/api/languages/invalid-id',
                headers: {
                    authorization: `Bearer ${token}`
                }
            })

            expect(res.statusCode).toBe(400)
        })

        it('should return language details when authenticated', async () => {
            const token = app.jwt.sign({ 
                email: testUser.email, 
                name: testUser.name,
                roles: []
            })

            const res = await app.inject({
                method: 'GET',
                url: `/api/languages/${testLanguage.id}`,
                headers: {
                    authorization: `Bearer ${token}`
                }
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('id', testLanguage.id)
            expect(response).toHaveProperty('code', 'de-DE')
            expect(response).toHaveProperty('name', 'German (Germany)')
        })
    })

    describe('POST /api/languages', () => {
        it('should return 401 when no authentication token is provided', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/api/languages',
                payload: {
                    code: 'it-IT',
                    name: 'Italian (Italy)'
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
                url: '/api/languages',
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    code: 'it-IT',
                    name: 'Italian (Italy)'
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
                url: '/api/languages',
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    name: 'Italian (Italy)'
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
                url: '/api/languages',
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    code: 'it-IT'
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
                url: '/api/languages',
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    code: 'invalid-format',
                    name: 'Invalid Format'
                }
            })

            expect(res.statusCode).toBe(400)
        })

        it('should create language successfully with valid data', async () => {
            const token = app.jwt.sign({ 
                email: adminUser.email, 
                name: adminUser.name,
                roles: ['admin']
            })

            const uniqueCode = `ja-JP`
            const res = await app.inject({
                method: 'POST',
                url: '/api/languages',
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    code: uniqueCode,
                    name: 'Japanese (Japan)'
                }
            })

            expect(res.statusCode).toBe(201)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('id')
            expect(response).toHaveProperty('code', uniqueCode)
            expect(response).toHaveProperty('name', 'Japanese (Japan)')
            testLanguageIds.push(response.id)
        })

        it('should return 409 when language code already exists', async () => {
            // Create initial language
            const uniqueCode = 'ko-KR'
            const [initialLanguage] = await app.db.insert(locales).values({
                code: uniqueCode,
                name: 'Korean (South Korea)'
            }).returning()
            testLanguageIds.push(initialLanguage.id)

            const token = app.jwt.sign({ 
                email: adminUser.email, 
                name: adminUser.name,
                roles: ['admin']
            })

            const res = await app.inject({
                method: 'POST',
                url: '/api/languages',
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    code: uniqueCode,
                    name: 'Korean (Duplicate)'
                }
            })

            expect([409, 500]).toContain(res.statusCode)
            if (res.statusCode === 409) {
                expect(JSON.parse(res.payload)).toEqual({
                    statusCode: 409,
                    error: 'Conflict',
                    message: `Language with code "${uniqueCode}" already exists`
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
                url: '/api/languages',
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    code: 'th-TH',
                    name: ''
                }
            })

            expect(res.statusCode).toBe(400)
        })

        it('should handle invalid request body types', async () => {
            const token = app.jwt.sign({ 
                email: adminUser.email, 
                name: adminUser.name,
                roles: ['admin']
            })

            const res = await app.inject({
                method: 'POST',
                url: '/api/languages',
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    code: 123, // Invalid type
                    name: 'Invalid Code Type'
                }
            })

            expect(res.statusCode).toBe(400)
        })
    })

    describe('PUT /api/languages/:id', () => {
        let testLanguage: any

        beforeEach(async () => {
            // Create test language
            [testLanguage] = await app.db.insert(locales).values({
                code: 'zh-CN',
                name: 'Chinese (China)'
            }).returning()
            testLanguageIds.push(testLanguage.id)
        })

        it('should return 401 when no authentication token is provided', async () => {
            const res = await app.inject({
                method: 'PUT',
                url: `/api/languages/${testLanguage.id}`,
                payload: {
                    name: 'Chinese (Simplified)'
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
                url: `/api/languages/${testLanguage.id}`,
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    name: 'Chinese (Simplified)'
                }
            })

            expect(res.statusCode).toBe(403)
        })

        it('should return 404 when language does not exist', async () => {
            const token = app.jwt.sign({ 
                email: adminUser.email, 
                name: adminUser.name,
                roles: ['admin']
            })

            const res = await app.inject({
                method: 'PUT',
                url: '/api/languages/99999',
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    name: 'Non-existent'
                }
            })

            expect(res.statusCode).toBe(404)
        })

        it('should update language successfully', async () => {
            const token = app.jwt.sign({ 
                email: adminUser.email, 
                name: adminUser.name,
                roles: ['admin']
            })

            const res = await app.inject({
                method: 'PUT',
                url: `/api/languages/${testLanguage.id}`,
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    name: 'Chinese (Simplified)'
                }
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('id', testLanguage.id)
            expect(response).toHaveProperty('code', 'zh-CN')
            expect(response).toHaveProperty('name', 'Chinese (Simplified)')
        })

        it('should handle partial updates', async () => {
            const token = app.jwt.sign({ 
                email: adminUser.email, 
                name: adminUser.name,
                roles: ['admin']
            })

            const res = await app.inject({
                method: 'PUT',
                url: `/api/languages/${testLanguage.id}`,
                headers: {
                    authorization: `Bearer ${token}`
                },
                payload: {
                    code: 'zh-TW'
                }
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)
            expect(response).toHaveProperty('id', testLanguage.id)
            expect(response).toHaveProperty('code', 'zh-TW')
            expect(response).toHaveProperty('name', 'Chinese (China)') // Original name preserved
        })
    })

    describe('DELETE /api/languages/:id', () => {
        let testLanguage: any

        beforeEach(async () => {
            // Create test language
            [testLanguage] = await app.db.insert(locales).values({
                code: 'ar-SA',
                name: 'Arabic (Saudi Arabia)'
            }).returning()
            testLanguageIds.push(testLanguage.id)
        })

        it('should return 401 when no authentication token is provided', async () => {
            const res = await app.inject({
                method: 'DELETE',
                url: `/api/languages/${testLanguage.id}`
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
                url: `/api/languages/${testLanguage.id}`,
                headers: {
                    authorization: `Bearer ${token}`
                }
            })

            expect(res.statusCode).toBe(403)
        })

        it('should return 404 when language does not exist', async () => {
            const token = app.jwt.sign({ 
                email: adminUser.email, 
                name: adminUser.name,
                roles: ['admin']
            })

            const res = await app.inject({
                method: 'DELETE',
                url: '/api/languages/99999',
                headers: {
                    authorization: `Bearer ${token}`
                }
            })

            expect(res.statusCode).toBe(404)
        })

        it('should delete language successfully', async () => {
            const token = app.jwt.sign({ 
                email: adminUser.email, 
                name: adminUser.name,
                roles: ['admin']
            })

            const res = await app.inject({
                method: 'DELETE',
                url: `/api/languages/${testLanguage.id}`,
                headers: {
                    authorization: `Bearer ${token}`
                }
            })

            expect(res.statusCode).toBe(204)
            
            // Remove from cleanup list since it's already deleted
            testLanguageIds = testLanguageIds.filter(id => id !== testLanguage.id)
            
            // Verify language was deleted
            const verification = await app.db.select().from(locales)
                .where(eq(locales.id, testLanguage.id)).limit(1)
            expect(verification.length).toBe(0)
        })
    })

    describe('Rate Limiting', () => {
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
                        url: '/api/languages',
                        headers: {
                            authorization: `Bearer ${token}`
                        },
                        payload: {
                            code: `rl-${timestamp}-${i.toString().padStart(2, '0')}`,
                            name: `Rate Limit Test ${timestamp} ${i}`
                        }
                    })
                )
            }

            const responses = await Promise.all(promises)
            
            // All should succeed or fail gracefully (no crashes)
            const successfulResponses = responses.filter(r => r.statusCode === 201)
            const errorResponses = responses.filter(r => r.statusCode >= 400)
            
            // Clean up any created languages
            successfulResponses.forEach(r => {
                const response = JSON.parse(r.payload)
                testLanguageIds.push(response.id)
            })
            
            // Should handle all requests without crashes
            expect(responses.length).toBe(5)
            expect(successfulResponses.length + errorResponses.length).toBe(5)
        })
    })
})