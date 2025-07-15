import fp from 'fastify-plugin'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import sensible from '@fastify/sensible'

export default fp(async function (fastify) {
    // Wait for env plugin to load first
    await fastify.after()

    // Helmet for security headers
    await fastify.register(helmet, {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
            }
        }
    })

    // CORS
    await fastify.register(cors, {
        origin: fastify.config.CORS_ORIGIN,
        credentials: true
    })

    // Rate limiting
    await fastify.register(rateLimit, {
        max: fastify.config.RATE_LIMIT_MAX,
        timeWindow: fastify.config.RATE_LIMIT_WINDOW,
        redis: fastify.redis
    })

    // Sensible defaults
    await fastify.register(sensible)
}, {
    name: 'security',
    dependencies: ['env', 'redis']
}) 