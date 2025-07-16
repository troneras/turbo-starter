import { it, describe, afterEach, expect, beforeEach } from 'bun:test'
import fastify from 'fastify'
import serviceApp from '../../src/app.js'
import fp from 'fastify-plugin'

import { build } from '../helpers/build-app.js'
describe('Error Handler', () => {
    let app: any

    it('should call errorHandler', async () => {
        app = fastify()
        app.register(fp(serviceApp))

        app.get('/error', () => {
            throw new Error('Kaboom!')
        })

        await app.ready()

        const res = await app.inject({
            method: 'GET',
            url: '/error'
        })

        expect(JSON.parse(res.payload)).toEqual({
            message: 'Internal Server Error'
        })
    })
})