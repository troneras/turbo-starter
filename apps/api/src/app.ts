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

        // Default values
        let statusCode = (err as any).statusCode ?? 500
        let message = 'Internal Server Error'
        let error = 'Internal Server Error'

        // Extract database error details if present (drizzle/postgres)
        const anyErr: any = err
        const pgErr: any = anyErr?.cause ?? anyErr?.originalError ?? anyErr?.parent
        const pgCode: string | undefined = pgErr?.code
        const pgConstraint: string | undefined = pgErr?.constraint
        const pgMessage: string | undefined = pgErr?.message

        // Map well-known database errors to friendly client responses
        if (pgCode === 'P0001' && /Cannot modify entities in .* release/.test(pgMessage ?? '')) {
            // Business rule from trigger: closed/deployed releases are immutable
            statusCode = 409
            error = 'Conflict'
            message = 'This release cannot be modified. Create or select an OPEN release to make changes.'
        } else if (pgCode === '23505') {
            // Unique violation
            statusCode = 409
            error = 'Conflict'
            if (pgConstraint === 'uq_translation_key_locale_release') {
                message = 'A translation for this key and locale already exists in the current release.'
            } else if (pgConstraint === 'uq_relation_versions_unique') {
                message = 'This relation already exists in the current release.'
            } else {
                message = 'Duplicate resource.'
            }
        } else if (pgCode === '23514') {
            // Check constraint violation
            statusCode = 400
            error = 'Bad Request'
            switch (pgConstraint) {
                case 'releases_status_valid':
                    message = 'Invalid release status.'
                    break
                case 'entity_versions_change_type_valid':
                    message = 'Invalid change type.'
                    break
                case 'relation_versions_action_valid':
                    message = 'Invalid relation action.'
                    break
                case 'releases_deployseq_status_ck':
                    message = 'deploy_seq must be set only for DEPLOYED releases and vice versa.'
                    break
                case 'ck_entity_key_required':
                    message = 'entityKey is required for this entity type.'
                    break
                case 'ck_translation_locale_required':
                    message = 'localeId is required for translations.'
                    break
                case 'check_translation_status':
                    message = 'Invalid translation status.'
                    break
                default:
                    message = 'Invalid data.'
            }
        } else if (pgCode === '23503') {
            // Foreign key violation
            statusCode = 400
            error = 'Bad Request'
            message = 'Invalid reference to a related resource.'
        } else if (anyErr?.message?.includes('Duplicate entity for given keys')) {
            // Application-level uniqueness pre-check
            statusCode = 409
            error = 'Conflict'
            message = 'Resource already exists for the provided key(s).'
        } else if (statusCode < 500) {
            // Preserve provided client error codes
            message = err.message
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

        reply.code(statusCode)
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