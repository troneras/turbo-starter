import { it, describe, expect, afterEach, beforeEach } from 'bun:test'
import { build } from '../../../../helpers/build-app'

describe('Translation Keys API', () => {
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

    describe('GET /api/translations/keys', () => {
        it('should return translation keys list successfully', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/translations/keys',
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                }
            })

            expect(res.statusCode).toBe(200)
            expect(Array.isArray(JSON.parse(res.payload))).toBe(true)
        })

        it('should support query parameters', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/translations/keys?parentPath=test&depth=2',
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                }
            })

            expect(res.statusCode).toBe(200)
            expect(Array.isArray(JSON.parse(res.payload))).toBe(true)
        })

        it('should require authentication', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/translations/keys'
            })

            expect(res.statusCode).toBe(401)
        })
    })

    describe('POST /api/translations/keys', () => {
        it('should create translation key successfully', async () => {
            const timestamp = Date.now()
            const keyData = {
                entityKey: `test.key.${timestamp}`,
                description: 'Test translation key'
            }

            const res = await app.inject({
                method: 'POST',
                url: '/api/translations/keys',
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                },
                payload: keyData
            })

            expect(res.statusCode).toBe(201)
            const response = JSON.parse(res.payload)
            expect(response.entityKey).toBe(keyData.entityKey)
            expect(response).toHaveProperty('id')
        })

        it('should handle duplicate key creation', async () => {
            const timestamp = Date.now()
            const keyData = {
                entityKey: `duplicate.key.${timestamp}`,
                description: 'Duplicate test key'
            }

            // Create first key
            await app.inject({
                method: 'POST',
                url: '/api/translations/keys',
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                },
                payload: keyData
            })

            // Try to create duplicate
            const res = await app.inject({
                method: 'POST',
                url: '/api/translations/keys',
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                },
                payload: keyData
            })

            expect(res.statusCode).toBe(409)
        })

        it('should require authentication', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/api/translations/keys',
                payload: {
                    entityKey: 'test.key',
                    description: 'Test key'
                }
            })

            expect(res.statusCode).toBe(401)
        })

        it('should validate request body', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/api/translations/keys',
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                },
                payload: {
                    // Missing required entityKey
                    description: 'Test key'
                }
            })

            expect(res.statusCode).toBe(400)
        })
    })

    describe('PUT /api/translations/keys/:id', () => {
        let createdKeyId: number

        beforeEach(async () => {
            // Create a test key for update operations
            const timestamp = Date.now()
            const res = await app.inject({
                method: 'POST',
                url: '/api/translations/keys',
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                },
                payload: {
                    entityKey: `update.test.${timestamp}`,
                    description: 'Key for update tests'
                }
            })
            createdKeyId = JSON.parse(res.payload).id
        })

        it('should update translation key successfully', async () => {
            const updateData = {
                description: 'Updated description'
            }

            const res = await app.inject({
                method: 'PUT',
                url: `/api/translations/keys/${createdKeyId}`,
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                },
                payload: updateData
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)
            expect(response.description).toBe(updateData.description)
            expect(response.id).toBe(createdKeyId)
        })

        it('should handle non-existent key', async () => {
            const res = await app.inject({
                method: 'PUT',
                url: '/api/translations/keys/99999',
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                },
                payload: {
                    description: 'Updated description'
                }
            })

            expect(res.statusCode).toBe(404)
        })

        it('should require authentication', async () => {
            const res = await app.inject({
                method: 'PUT',
                url: `/api/translations/keys/${createdKeyId}`,
                payload: {
                    description: 'Updated description'
                }
            })

            expect(res.statusCode).toBe(401)
        })
    })

    describe('DELETE /api/translations/keys/:id', () => {
        let createdKeyId: number

        beforeEach(async () => {
            // Create a test key for delete operations
            const timestamp = Date.now()
            const res = await app.inject({
                method: 'POST',
                url: '/api/translations/keys',
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                },
                payload: {
                    entityKey: `delete.test.${timestamp}`,
                    description: 'Key for delete tests'
                }
            })
            createdKeyId = JSON.parse(res.payload).id
        })

        it('should delete translation key successfully', async () => {
            const res = await app.inject({
                method: 'DELETE',
                url: `/api/translations/keys/${createdKeyId}`,
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                }
            })

            expect(res.statusCode).toBe(204)
        })

        it('should handle non-existent key', async () => {
            const res = await app.inject({
                method: 'DELETE',
                url: '/api/translations/keys/99999',
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                }
            })

            expect(res.statusCode).toBe(404)
        })

        it('should require authentication', async () => {
            const res = await app.inject({
                method: 'DELETE',
                url: `/api/translations/keys/${createdKeyId}`
            })

            expect(res.statusCode).toBe(401)
        })
    })
})