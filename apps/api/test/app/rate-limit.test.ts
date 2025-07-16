import { it, describe, expect, afterEach, beforeEach } from 'bun:test'
import { build } from '../helpers/build-app'

describe('Rate Limiting', () => {
    let app: any
    let rateLimitMax: string

    beforeEach(async () => {
        rateLimitMax = process.env.RATE_LIMIT_MAX || '500'
        process.env.RATE_LIMIT_MAX = '4'
        app = await build()
        await app.redis.flushall()
    })

    afterEach(async () => {
        if (app) {
            await app.close()
            process.env.RATE_LIMIT_MAX = rateLimitMax
        }
    })

    it('should be rate limited', async () => {

        for (let i = 0; i < 4; i++) {
            const res = await app.inject({
                method: 'GET',
                url: '/'
            })

            expect(res.statusCode).toBe(200)
        }

        const res = await app.inject({
            method: 'GET',
            url: '/'
        })

        expect(res.statusCode).toBe(429)
    })
})