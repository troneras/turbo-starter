import type { FastifyInstance } from 'fastify'
import { TranslationStatsResponseSchema } from '@cms/contracts/schemas/translations'

export default async function (fastify: FastifyInstance) {
  // Get translation stats
  fastify.get('/', {
    schema: {
      tags: ['translations'],
      summary: 'Get translation statistics',
      security: [{ bearerAuth: [] }],
      response: {
        200: TranslationStatsResponseSchema
      }
    },
    onRequest: [fastify.authenticate, fastify.requirePermission('translations:read')]
  }, async () => {
    // TODO: Implement
    return {
      totalKeys: 0,
      totalVariants: 0,
      totalBrands: 0,
      totalJurisdictions: 0,
      totalLocales: 0
    }
  })
}