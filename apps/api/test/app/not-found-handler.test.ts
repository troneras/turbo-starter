import { it, describe, expect, afterEach, beforeEach, beforeAll } from 'bun:test'
import { build } from '../helpers/build-app'

describe('Not Found Handler', () => {
    let app: any
    let rateLimitMax: string

    beforeEach(async () => {
        rateLimitMax = process.env.RATE_LIMIT_MAX || '500'
        process.env.RATE_LIMIT_MAX = '3'
        app = await build()
        await app.redis.flushall()
    })

    afterEach(async () => {
        if (app) {
            await app.close()
            process.env.RATE_LIMIT_MAX = rateLimitMax
        }
    })

    it('should call notFoundHandler', async () => {
        const res = await app.inject({
            method: 'GET',
            url: '/this-route-does-not-exist'
        })

        expect(res.statusCode).toBe(404)
        expect(JSON.parse(res.payload)).toEqual({ 
            statusCode: 404,
            error: 'Not Found',
            message: 'Not Found' 
        })
    })

    it('should be rate limited', async () => {
        for (let i = 0; i < 3; i++) {
            const res = await app.inject({
                method: 'GET',
                url: '/this-route-does-not-exist'
            })

            expect(res.statusCode).toBe(404)
        }

        const res = await app.inject({
            method: 'GET',
            url: '/this-route-does-not-exist'
        })
        expect(res.statusCode).toBe(429)
    })
})