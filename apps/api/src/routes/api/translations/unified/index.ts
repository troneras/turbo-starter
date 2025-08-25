import type { FastifyInstance } from 'fastify'
import {
    CreateUnifiedTranslationRequestSchema,
    UnifiedTranslationResponseSchema
} from '@cms/contracts/schemas/translations'
import type {
    CreateUnifiedTranslationRequest,
    UnifiedTranslationResponse
} from '@cms/contracts/types/translations'

export default async function (fastify: FastifyInstance) {
    // Create unified translation (key + default variant + optional additional variants)
    fastify.post('/', {
        schema: {
            tags: ['translations'],
            summary: 'Create translation with key and variants in a single operation',
            description: 'Creates a translation key and its default variant (plus optional additional variants) in a single transaction. This simplifies the translation creation process for clients.',
            security: [{ bearerAuth: [] }],
            body: CreateUnifiedTranslationRequestSchema,
            response: {
                201: UnifiedTranslationResponseSchema
            }
        },
        onRequest: [
            fastify.authenticate,
            fastify.requirePermission('translations:create'),
            fastify.requireReleaseContext
        ]
    }, async (request, reply) => {
        const data = request.body as CreateUnifiedTranslationRequest

        try {
            const result = await fastify.translations.createUnifiedTranslation(
                {
                    entityKey: data.entityKey,
                    description: data.description,
                    defaultValue: data.defaultValue,
                    defaultLocaleId: data.defaultLocaleId,
                    brandId: data.brandId,
                    jurisdictionId: data.jurisdictionId,
                    status: data.status,
                    metadata: data.metadata,
                    additionalVariants: data.additionalVariants
                },
                (request.user as any).sub,
                request.releaseContext?.releaseId
            )

            // TODO: Trigger machine translations for empty variants if autoTranslateWithAI is enabled
            // This will be implemented once the event system is ready
            if (data.metadata?.autoTranslateWithAI) {
                // Event system integration pending
                fastify.log.info('Auto-translation with AI requested for key:', data.entityKey)
            }

            reply.code(201)
            return result
        } catch (error: any) {
            if (error.message.includes('already exists')) {
                return reply.conflict('Translation key already exists')
            }
            if (error.message.includes('Duplicate entity') || error.message.includes('Entity already exists')) {
                return reply.conflict('Translation key or variant already exists')
            }
            throw error
        }
    })
}
