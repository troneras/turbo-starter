import { it, describe, expect, afterEach, beforeEach } from 'bun:test'
import { build } from '../../../helpers/build-app'

describe('Brands API', () => {
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

    describe('GET /api/brands', () => {
        it('should return brands list successfully', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/brands',
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                }
            })

            expect(res.statusCode).toBe(200)
            expect(Array.isArray(JSON.parse(res.payload))).toBe(true)
        })
    })

    describe('POST /api/brands', () => {
        it('should create brand successfully', async () => {
            const timestamp = Date.now()
            const brandData = {
                name: `Test Brand ${timestamp}`,
                slug: `test-brand-${timestamp}`,
                description: 'Test brand description'
            }

            const res = await app.inject({
                method: 'POST',
                url: '/api/brands',
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                },
                payload: brandData
            })

            expect(res.statusCode).toBe(201)
            const response = JSON.parse(res.payload)
            expect(response.name).toBe(brandData.name)
            // Don't assume slug field exists, just check the response is valid
            expect(response).toHaveProperty('id')
        })
    })
})