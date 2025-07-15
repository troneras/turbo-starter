import fp from 'fastify-plugin'
import fastifyRedis from '@fastify/redis'

export default fp(async function (fastify) {
    // Wait for env plugin to load first
    await fastify.after()

    await fastify.register(fastifyRedis, {
        url: fastify.config.REDIS_URL,
        closeClient: true
    })
}, {
    name: 'redis',
    dependencies: ['env']
}) 