import type { FastifyInstance } from 'fastify'
import {
  TranslationVariantSchema,
  TranslationVariantQuerySchema,
  CreateTranslationVariantRequestSchema,
  UpdateTranslationVariantRequestSchema
} from '@cms/contracts/schemas/translations'
import {
  createPaginatedResponseSchema
} from '@cms/contracts/schemas/common'
import type {
  TranslationVariant,
  CreateTranslationVariantRequest,
  UpdateTranslationVariantRequest
} from '@cms/contracts/types/translations'
import { Type } from '@sinclair/typebox'

const ParamsSchema = Type.Object({
  id: Type.String({ pattern: '^[0-9]+$' })
})

// Using the reusable query schema from contracts
const QuerySchema = TranslationVariantQuerySchema

export default async function (fastify: FastifyInstance) {
  // Get translation variants
  fastify.get('/', {
    schema: {
      tags: ['translations'],
      summary: 'Get translation variants',
      security: [{ bearerAuth: [] }],
      querystring: QuerySchema,
      response: {
        200: createPaginatedResponseSchema(TranslationVariantSchema)
      }
    },
    onRequest: [fastify.authenticate, fastify.requirePermission('translations:read'), fastify.requireReleaseContext]
  }, async (request) => {
    const { entityKey, localeId, brandId, status, page, pageSize } = request.query as {
      entityKey?: string
      localeId?: number
      brandId?: number
      status?: 'DRAFT' | 'PENDING' | 'APPROVED'
      page?: number
      pageSize?: number
    }

    return fastify.translations.listVariants(
      {
        entityKey,
        localeId,
        brandId,
        status
      },
      {
        releaseId: request.releaseContext?.releaseId,
        page,
        pageSize
      }
    )
  })

  // Create translation variant
  fastify.post('/', {
    schema: {
      tags: ['translations'],
      summary: 'Create translation variant',
      security: [{ bearerAuth: [] }],
      body: CreateTranslationVariantRequestSchema,
      response: {
        201: TranslationVariantSchema
      }
    },
    onRequest: [
      fastify.authenticate,
      fastify.requirePermission('translations:create'),
      fastify.requireReleaseContext
    ]
  }, async (request, reply) => {
    const data = request.body as CreateTranslationVariantRequest

    try {
      const variant = await fastify.translations.createVariant(
        {
          entityKey: data.entityKey,
          localeId: data.localeId,
          value: data.value,
          status: data.status ?? 'DRAFT',
          brandId: data.brandId ?? null
        },
        (request.user as any).sub,
        request.releaseContext?.releaseId
      )
      reply.code(201)
      return variant
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        return reply.conflict('Translation variant already exists for this key/locale/brand combination')
      }
      if (error.message.includes('Duplicate entity') || error.message.includes('Entity already exists')) {
        return reply.conflict('Translation variant already exists for this key/locale/brand combination')
      }
      if (error.message.includes('Translation key not found') || error.message.includes('key not found')) {
        return reply.badRequest('Translation key does not exist')
      }
      throw error
    }
  })

  // Update translation variant
  fastify.put('/:id', {
    schema: {
      tags: ['translations'],
      summary: 'Update translation variant',
      security: [{ bearerAuth: [] }],
      params: ParamsSchema,
      body: UpdateTranslationVariantRequestSchema,
      response: {
        200: TranslationVariantSchema
      }
    },
    onRequest: [
      fastify.authenticate,
      fastify.requirePermission('translations:update'),
      fastify.requireReleaseContext
    ]
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const variantId = parseInt(id, 10)
    const data = request.body as UpdateTranslationVariantRequest

    try {
      const variant = await fastify.translations.updateVariant(
        variantId,
        data,
        (request.user as any).sub,
        request.releaseContext?.releaseId
      )
      return variant
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return reply.notFound('Translation variant not found')
      }
      throw error
    }
  })

  // Update translation status
  fastify.patch('/:id/status', {
    schema: {
      tags: ['translations'],
      summary: 'Update translation variant status',
      security: [{ bearerAuth: [] }],
      params: ParamsSchema,
      body: Type.Object({
        status: Type.Union([
          Type.Literal('DRAFT'),
          Type.Literal('PENDING'),
          Type.Literal('APPROVED')
        ])
      }),
      response: {
        200: TranslationVariantSchema
      }
    },
    onRequest: [
      fastify.authenticate,
      fastify.requirePermission('translations:approve'),
      fastify.requireReleaseContext
    ]
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const variantId = parseInt(id, 10)
    const { status } = request.body as { status: 'DRAFT' | 'PENDING' | 'APPROVED' }

    try {
      const variant = await fastify.translations.setStatus(
        variantId,
        status,
        (request.user as any).sub,
        request.releaseContext?.releaseId
      )
      return variant
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return reply.notFound('Translation variant not found')
      }
      throw error
    }
  })

  // Delete translation variant
  fastify.delete('/:id', {
    schema: {
      tags: ['translations'],
      summary: 'Delete translation variant',
      security: [{ bearerAuth: [] }],
      params: ParamsSchema,
      response: {
        204: Type.Null()
      }
    },
    onRequest: [
      fastify.authenticate,
      fastify.requirePermission('translations:delete'),
      fastify.requireReleaseContext
    ]
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const variantId = parseInt(id, 10)

    try {
      await fastify.translations.deleteVariant(
        variantId,
        (request.user as any).sub,
        request.releaseContext?.releaseId
      )
      reply.code(204)
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return reply.notFound('Translation variant not found')
      }
      throw error
    }
  })
}