import { test } from 'node:test'
import assert from 'node:assert'
import { build } from '../helpers/build-app'

test('GET /health/liveness', async (t) => {
    const app = await build(t)
    const res = await app.inject({
        url: '/health/liveness'
    })

    assert.deepStrictEqual(JSON.parse(res.payload), {
        status: 'ok'
    })
})

test('GET /health/readiness', async (t) => {
    const app = await build(t)
    const res = await app.inject({
        url: '/health/readiness'
    })

    assert.deepStrictEqual(JSON.parse(res.payload), {
        status: 'ok',
        services: {
            database: 'up',
            redis: 'up'
        }
    })
})