import { type FastifyInstance, type FastifyPluginOptions } from 'fastify'
import autoload from '@fastify/autoload'
import { join } from 'path'
import { fileURLToPath } from 'url'


export const options: FastifyPluginOptions = {
    ajv: {
        customOptions: {
            coerceTypes: 'array',
            removeAdditional: 'all'
        }
    }
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, '..')

export default async function serviceApp(fastify: FastifyInstance, opts: FastifyPluginOptions) {
    delete opts.skipOverride // This option only serves testing purpose

    // Register external plugins (infrastructure)
    // This loads all external plugins defined in plugins/external
    // those should be registered first as application plugins might depend on them
    await fastify.register(autoload, {
        dir: join(__dirname, 'plugins', 'external'),
        options: { ...opts }
    })

    // Register application plugins (business logic)
    // This loads all the application plugins defined in plugins/app
    // those should be support plugins that are reused
    // through the application
    fastify.register(autoload, {
        dir: join(__dirname, 'plugins', 'app'),
        options: { ...opts }
    })

    // Register routes
    // This loads all the routes defined in routes
    fastify.register(autoload, {
        dir: join(__dirname, 'routes'),
        autoHooks: true,
        cascadeHooks: true,
        options: { ...opts }
    })

    fastify.setErrorHandler((err, request, reply) => {
        fastify.log.error(
            {
                err,
                request: {
                    method: request.method,
                    url: request.url,
                    query: request.query,
                    params: request.params
                }
            },
            'Unhandled error occurred'
        )

        const statusCode = err.statusCode ?? 500
        reply.code(statusCode)

        let message = 'Internal Server Error'
        let error = 'Internal Server Error'
        
        if (statusCode < 500) {
            message = err.message
            // Map status codes to error names
            switch (statusCode) {
                case 400:
                    error = 'Bad Request'
                    break
                case 401:
                    error = 'Unauthorized'
                    break
                case 403:
                    error = 'Forbidden'
                    break
                case 404:
                    error = 'Not Found'
                    break
                case 409:
                    error = 'Conflict'
                    break
                default:
                    error = 'Client Error'
            }
        } else if (process.env.NODE_ENV === 'test') {
            // In test mode, include the actual error message for debugging
            message = err.message || 'Internal Server Error'
        }

        return { 
            statusCode,
            error,
            message 
        }
    })

    // An attacker could search for valid URLs if your 404 error handling is not rate limited.
    fastify.setNotFoundHandler(
        {
            preHandler: fastify.rateLimit({
                max: 3,
                timeWindow: 500
            })
        },
        (request, reply) => {
            request.log.warn(
                {
                    request: {
                        method: request.method,
                        url: request.url,
                        query: request.query,
                        params: request.params
                    }
                },
                'Resource not found'
            )

            reply.code(404)

            return reply.notFound('Not Found')
        })
} 