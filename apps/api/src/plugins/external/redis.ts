import fp from 'fastify-plugin'
import fastifyRedis from '@fastify/redis'

export default fp(async function (fastify) {

    await fastify.register(fastifyRedis, {
        url: fastify.config.REDIS_URL,
        closeClient: true
    })
}, {
    name: 'redis',
    dependencies: ['env']
}) 