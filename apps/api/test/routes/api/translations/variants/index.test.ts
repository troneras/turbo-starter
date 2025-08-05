import { it, describe, expect, afterEach, beforeEach } from 'bun:test'
import { build } from '../../../../helpers/build-app'

describe('Translation Variants API', () => {
    let app: any
    let testKeyId: number

    beforeEach(async () => {
        app = await build()
        await app.ready()

        // Create a test translation key for variant operations
        const timestamp = Date.now()
        const keyRes = await app.inject({
            method: 'POST',
            url: '/api/translations/keys',
            headers: {
                authorization: 'Bearer mock-admin-jwt-token'
            },
            payload: {
                entityKey: `test.variant.key.${timestamp}`,
                description: 'Test key for variants'
            }
        })
        testKeyId = JSON.parse(keyRes.payload).id
    })

    afterEach(async () => {
        if (app) {
            await app.close()
        }
    })

    describe('GET /api/translations/variants', () => {
        it('should return translation variants list successfully', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/translations/variants',
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
                url: '/api/translations/variants?entityKey=test.key&locale=en-US&status=DRAFT',
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
                url: '/api/translations/variants'
            })

            expect(res.statusCode).toBe(401)
        })
    })

    describe('POST /api/translations/variants', () => {
        it('should create translation variant successfully', async () => {
            const timestamp = Date.now()
            const variantData = {
                entityKey: `test.variant.key.${timestamp}`,
                locale: 'en-US',
                value: 'Test translation value',
                status: 'DRAFT',
                keyId: testKeyId
            }

            const res = await app.inject({
                method: 'POST',
                url: '/api/translations/variants',
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                },
                payload: variantData
            })

            expect(res.statusCode).toBe(201)
            const response = JSON.parse(res.payload)
            expect(response.entityKey).toBe(variantData.entityKey)
            expect(response.locale).toBe(variantData.locale)
            expect(response.value).toBe(variantData.value)
            expect(response).toHaveProperty('id')
        })

        it('should create variant with default status when not specified', async () => {
            const timestamp = Date.now()
            const variantData = {
                entityKey: `test.variant.key.${timestamp}`,
                locale: 'fr-FR',
                value: 'Valeur de traduction test',
                keyId: testKeyId
            }

            const res = await app.inject({
                method: 'POST',
                url: '/api/translations/variants',
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                },
                payload: variantData
            })

            expect(res.statusCode).toBe(201)
            const response = JSON.parse(res.payload)
            expect(response.status).toBe('DRAFT')
        })

        it('should handle duplicate variant creation', async () => {
            const timestamp = Date.now()
            const variantData = {
                entityKey: `test.variant.key.${timestamp}`,
                locale: 'en-US',
                value: 'Duplicate variant',
                keyId: testKeyId
            }

            // Create first variant
            await app.inject({
                method: 'POST',
                url: '/api/translations/variants',
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                },
                payload: variantData
            })

            // Try to create duplicate
            const res = await app.inject({
                method: 'POST',
                url: '/api/translations/variants',
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                },
                payload: variantData
            })

            expect(res.statusCode).toBe(409)
        })

        it('should handle non-existent key reference', async () => {
            const variantData = {
                entityKey: 'nonexistent.key',
                locale: 'en-US',
                value: 'Test value',
                keyId: 99999
            }

            const res = await app.inject({
                method: 'POST',
                url: '/api/translations/variants',
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                },
                payload: variantData
            })

            expect(res.statusCode).toBe(400)
        })

        it('should require authentication', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/api/translations/variants',
                payload: {
                    entityKey: 'test.key',
                    locale: 'en-US',
                    value: 'Test value',
                    keyId: testKeyId
                }
            })

            expect(res.statusCode).toBe(401)
        })

        it('should validate request body', async () => {
            const res = await app.inject({
                method: 'POST',
                url: '/api/translations/variants',
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                },
                payload: {
                    // Missing required fields
                    value: 'Test value'
                }
            })

            expect(res.statusCode).toBe(400)
        })
    })

    describe('PUT /api/translations/variants/:id', () => {
        let createdVariantId: number

        beforeEach(async () => {
            // Create a test variant for update operations
            const timestamp = Date.now()
            const res = await app.inject({
                method: 'POST',
                url: '/api/translations/variants',
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                },
                payload: {
                    entityKey: `update.variant.${timestamp}`,
                    locale: 'en-US',
                    value: 'Original value',
                    keyId: testKeyId
                }
            })
            createdVariantId = JSON.parse(res.payload).id
        })

        it('should update translation variant successfully', async () => {
            const updateData = {
                value: 'Updated translation value',
                status: 'PENDING'
            }

            const res = await app.inject({
                method: 'PUT',
                url: `/api/translations/variants/${createdVariantId}`,
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                },
                payload: updateData
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)
            expect(response.value).toBe(updateData.value)
            expect(response.id).toBe(createdVariantId)
        })

        it('should handle non-existent variant', async () => {
            const res = await app.inject({
                method: 'PUT',
                url: '/api/translations/variants/99999',
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                },
                payload: {
                    value: 'Updated value'
                }
            })

            expect(res.statusCode).toBe(404)
        })

        it('should require authentication', async () => {
            const res = await app.inject({
                method: 'PUT',
                url: `/api/translations/variants/${createdVariantId}`,
                payload: {
                    value: 'Updated value'
                }
            })

            expect(res.statusCode).toBe(401)
        })
    })

    describe('PATCH /api/translations/variants/:id/status', () => {
        let createdVariantId: number

        beforeEach(async () => {
            // Create a test variant for status update operations
            const timestamp = Date.now()
            const res = await app.inject({
                method: 'POST',
                url: '/api/translations/variants',
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                },
                payload: {
                    entityKey: `status.variant.${timestamp}`,
                    locale: 'en-US',
                    value: 'Status test value',
                    keyId: testKeyId
                }
            })
            createdVariantId = JSON.parse(res.payload).id
        })

        it('should update translation variant status successfully', async () => {
            const statusUpdate = {
                status: 'APPROVED'
            }

            const res = await app.inject({
                method: 'PATCH',
                url: `/api/translations/variants/${createdVariantId}/status`,
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                },
                payload: statusUpdate
            })

            expect(res.statusCode).toBe(200)
            const response = JSON.parse(res.payload)
            expect(response.status).toBe(statusUpdate.status)
            expect(response.id).toBe(createdVariantId)
        })

        it('should handle non-existent variant', async () => {
            const res = await app.inject({
                method: 'PATCH',
                url: '/api/translations/variants/99999/status',
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                },
                payload: {
                    status: 'APPROVED'
                }
            })

            expect(res.statusCode).toBe(404)
        })

        it('should validate status values', async () => {
            const res = await app.inject({
                method: 'PATCH',
                url: `/api/translations/variants/${createdVariantId}/status`,
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                },
                payload: {
                    status: 'INVALID_STATUS'
                }
            })

            expect(res.statusCode).toBe(400)
        })

        it('should require authentication', async () => {
            const res = await app.inject({
                method: 'PATCH',
                url: `/api/translations/variants/${createdVariantId}/status`,
                payload: {
                    status: 'APPROVED'
                }
            })

            expect(res.statusCode).toBe(401)
        })
    })

    describe('DELETE /api/translations/variants/:id', () => {
        let createdVariantId: number

        beforeEach(async () => {
            // Create a test variant for delete operations
            const timestamp = Date.now()
            const res = await app.inject({
                method: 'POST',
                url: '/api/translations/variants',
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                },
                payload: {
                    entityKey: `delete.variant.${timestamp}`,
                    locale: 'en-US',
                    value: 'Delete test value',
                    keyId: testKeyId
                }
            })
            createdVariantId = JSON.parse(res.payload).id
        })

        it('should delete translation variant successfully', async () => {
            const res = await app.inject({
                method: 'DELETE',
                url: `/api/translations/variants/${createdVariantId}`,
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                }
            })

            expect(res.statusCode).toBe(204)
        })

        it('should handle non-existent variant', async () => {
            const res = await app.inject({
                method: 'DELETE',
                url: '/api/translations/variants/99999',
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                }
            })

            expect(res.statusCode).toBe(404)
        })

        it('should require authentication', async () => {
            const res = await app.inject({
                method: 'DELETE',
                url: `/api/translations/variants/${createdVariantId}`
            })

            expect(res.statusCode).toBe(401)
        })
    })
})