import { FastifyPluginAsync } from 'fastify'

const home: FastifyPluginAsync = async (fastify) => {
    fastify.get('/', {
        schema: {
            tags: ['general'],
            summary: 'Welcome endpoint',
            response: {
                200: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        version: { type: 'string' },
                        documentation: { type: 'string' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        return {
            message: 'Welcome to CMS Platform API',
            version: '1.0.0',
            documentation: '/documentation'
        }
    })
}

export default home 