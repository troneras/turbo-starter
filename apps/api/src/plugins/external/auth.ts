import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import { FastifyRequest, FastifyReply } from 'fastify'

declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    }
}

declare module '@fastify/jwt' {
    interface FastifyJWT {
        payload: {
            id: string
            email: string
            roles: string[]
        }
        user: {
            id: string
            email: string
            roles: string[]
        }
    }
}

export default fp(async function (fastify) {
    // Wait for env plugin to load first
    await fastify.after()

    await fastify.register(fastifyJwt, {
        secret: fastify.config.JWT_SECRET,
        sign: {
            expiresIn: fastify.config.JWT_EXPIRES_IN
        }
    })

    // Add authenticate decorator
    fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
        try {
            await request.jwtVerify()
        } catch (err) {
            reply.send(err)
        }
    })
}, {
    name: 'auth',
    dependencies: ['env']
}) 