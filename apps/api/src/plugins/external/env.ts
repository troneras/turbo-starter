import fp from 'fastify-plugin'
import fastifyEnv from '@fastify/env'
import { envSchema } from '../../lib/config.js'

export default fp(async function (fastify) {
    await fastify.register(fastifyEnv, {
        schema: envSchema,
        dotenv: true
    })
}, {
    name: 'env'
}) 