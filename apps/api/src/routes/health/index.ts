import { type FastifyPluginAsync } from 'fastify'

const health: FastifyPluginAsync = async (fastify) => {
    // Liveness check - is the app running?
    fastify.get('/liveness', {
        schema: {
            tags: ['health'],
            summary: 'Liveness check',
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        return { status: 'ok' }
    })

    // Readiness check - is the app ready to serve traffic?
    fastify.get('/readiness', {
        schema: {
            tags: ['health'],
            summary: 'Readiness check',
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        services: {
                            type: 'object',
                            properties: {
                                database: { type: 'string' },
                                redis: { type: 'string' }
                            }
                        }
                    }
                },
                503: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        services: { type: 'object' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        const services = {
            database: 'down',
            redis: 'down'
        }

        try {
            // Check database connection
            await fastify.db.execute('SELECT 1')
            services.database = 'up'
        } catch (err) {
            fastify.log.error(err, 'Database health check failed')
        }

        try {
            // Check Redis connection
            await fastify.redis.ping()
            services.redis = 'up'
        } catch (err) {
            fastify.log.error(err, 'Redis health check failed')
        }

        const allHealthy = Object.values(services).every(status => status === 'up')

        reply.code(allHealthy ? 200 : 503)
        return {
            status: allHealthy ? 'ok' : 'degraded',
            services
        }
    })
}

export default health 