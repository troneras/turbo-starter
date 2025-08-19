import type { FastifyInstance } from 'fastify'
import {
    BatchTranslationRequestSchema,
    BatchTranslationResultSchema,
    TranslationCsvImportRequestSchema
} from '@cms/contracts/schemas/translations'
import type {
    BatchTranslationRequest,
    BatchTranslationResult,
    TranslationCsvImportRequest
} from '@cms/contracts/types/translations'

export default async function (fastify: FastifyInstance) {
    // Batch create/update translations
    fastify.post('/', {
        schema: {
            tags: ['translations'],
            summary: 'Batch create/update translations',
            description: 'Creates or updates multiple translations in a single operation. Useful for bulk imports and data migrations.',
            security: [{ bearerAuth: [] }],
            body: BatchTranslationRequestSchema,
            response: {
                200: BatchTranslationResultSchema
            }
        },
        onRequest: [
            fastify.authenticate,
            fastify.requirePermission('translations:create'),
            fastify.requireReleaseContext
        ]
    }, async (request, reply) => {
        const data = request.body as BatchTranslationRequest

        try {
            const result = await fastify.translations.batchCreateTranslations(
                {
                    translations: data.translations,
                    defaultBrandId: data.defaultBrandId,
                    defaultJurisdictionId: data.defaultJurisdictionId,
                    overwriteExisting: data.overwriteExisting,
                    createMissingKeys: data.createMissingKeys
                },
                (request.user as any).sub,
                request.releaseContext?.releaseId
            )

            return result
        } catch (error: any) {
            fastify.log.error('Batch translation error:', error)
            return reply.badRequest(`Batch operation failed: ${error.message}`)
        }
    })

    // Import translations from CSV
    fastify.post('/csv-import', {
        schema: {
            tags: ['translations'],
            summary: 'Import translations from CSV',
            description: 'Imports translations from CSV content with configurable column mapping and import options.',
            security: [{ bearerAuth: [] }],
            body: TranslationCsvImportRequestSchema,
            response: {
                200: BatchTranslationResultSchema
            }
        },
        onRequest: [
            fastify.authenticate,
            fastify.requirePermission('translations:create'),
            fastify.requireReleaseContext
        ]
    }, async (request, reply) => {
        const data = request.body as TranslationCsvImportRequest

        try {
            const result = await fastify.translations.importFromCsv(
                {
                    csvContent: data.csvContent,
                    defaultBrandId: data.defaultBrandId,
                    defaultJurisdictionId: data.defaultJurisdictionId,
                    overwriteExisting: data.overwriteExisting,
                    createMissingKeys: data.createMissingKeys,
                    csvOptions: data.csvOptions
                },
                (request.user as any).sub,
                request.releaseContext?.releaseId
            )

            return result
        } catch (error: any) {
            fastify.log.error('CSV import error:', error)
            return reply.badRequest(`CSV import failed: ${error.message}`)
        }
    })
}
