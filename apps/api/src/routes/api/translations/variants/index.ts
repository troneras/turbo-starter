import type { FastifyInstance } from 'fastify'
import {
  TranslationVariantSchema,
  CreateTranslationVariantRequestSchema,
  UpdateTranslationVariantRequestSchema
} from '@cms/contracts/schemas/translations'
import type {
  TranslationVariant,
  CreateTranslationVariantRequest,
  UpdateTranslationVariantRequest
} from '@cms/contracts/types/translations'
import { Type } from '@sinclair/typebox'

const ParamsSchema = Type.Object({
  id: Type.Number()
})

const QuerySchema = Type.Object({
  fullKey: Type.Optional(Type.String()),
  locale: Type.Optional(Type.String()),
  brandId: Type.Optional(Type.Number()),
  status: Type.Optional(Type.Union([
    Type.Literal('DRAFT'),
    Type.Literal('PENDING'),
    Type.Literal('APPROVED')
  ]))
})

export default async function (fastify: FastifyInstance) {
  // Get translation variants
  fastify.get('/', {
    schema: {
      tags: ['translations'],
      summary: 'Get translation variants',
      security: [{ bearerAuth: [] }],
      querystring: QuerySchema,
      response: {
        200: Type.Array(TranslationVariantSchema)
      }
    },
    onRequest: [fastify.authenticate]
  }, async (request) => {
    const { fullKey, locale, brandId, status } = request.query as {
      fullKey?: string
      locale?: string
      brandId?: number
      status?: 'DRAFT' | 'PENDING' | 'APPROVED'
    }

    return fastify.translationsRepository.getTranslationVariants({
      fullKey,
      locale,
      brandId,
      status
    })
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
      fastify.requirePermission('translations:create')
    ]
  }, async (request, reply) => {
    const data = request.body as CreateTranslationVariantRequest

    try {
      const variant = await fastify.translationsRepository.createTranslationVariant(
        data,
        (request.user as any).sub
      )
      reply.code(201)
      return variant
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        return reply.conflict('Translation variant already exists for this key/locale/brand combination')
      }
      if (error.message.includes('key not found')) {
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
      fastify.requirePermission('translations:update')
    ]
  }, async (request, reply) => {
    const { id } = request.params as { id: number }
    const data = request.body as UpdateTranslationVariantRequest

    try {
      const variant = await fastify.translationsRepository.updateTranslationVariant(
        id,
        data,
        (request.user as any).sub
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
      fastify.requirePermission('translations:approve')
    ]
  }, async (request, reply) => {
    const { id } = request.params as { id: number }
    const { status } = request.body as { status: 'DRAFT' | 'PENDING' | 'APPROVED' }

    try {
      const variant = await fastify.translationsRepository.updateTranslationStatus(
        id,
        status,
        (request.user as any).sub
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
      fastify.requirePermission('translations:delete')
    ]
  }, async (request, reply) => {
    const { id } = request.params as { id: number }

    try {
      await fastify.translationsRepository.deleteTranslationVariant(id, (request.user as any).sub)
      reply.code(204)
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return reply.notFound('Translation variant not found')
      }
      throw error
    }
  })
}