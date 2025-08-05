import { it, describe, expect, afterEach, beforeEach } from 'bun:test'
import { build } from '../../../helpers/build-app'

describe('Languages API', () => {
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

    describe('GET /api/languages', () => {
        it('should return languages list successfully', async () => {
            const res = await app.inject({
                method: 'GET',
                url: '/api/languages',
                headers: {
                    authorization: 'Bearer mock-admin-jwt-token'
                }
            })

            if (res.statusCode !== 200) {
                console.log('Languages API error:', res.payload)
            }
            expect(res.statusCode).toBe(200)
            expect(Array.isArray(JSON.parse(res.payload))).toBe(true)
        })
    })
})