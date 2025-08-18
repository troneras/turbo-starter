import type { FastifyInstance } from 'fastify'
import {
  TranslationKeySchema,
  CreateTranslationKeyRequestSchema,
  UpdateTranslationKeyRequestSchema
} from '@cms/contracts/schemas/translations'
import type {
  TranslationKey,
  CreateTranslationKeyRequest,
  UpdateTranslationKeyRequest
} from '@cms/contracts/types/translations'
import { Type } from '@sinclair/typebox'

const ParamsSchema = Type.Object({
  id: Type.String({ pattern: '^[0-9]+$' })
})

const QuerySchema = Type.Object({
  parentPath: Type.Optional(Type.String()),
  depth: Type.Optional(Type.Number({ minimum: 1, default: 1 }))
})

export default async function (fastify: FastifyInstance) {
  // Get all translation keys
  fastify.get('/', {
    schema: {
      tags: ['translations'],
      summary: 'Get translation keys',
      security: [{ bearerAuth: [] }],
      querystring: QuerySchema,
      response: {
        200: Type.Array(TranslationKeySchema)
      }
    },
    onRequest: [fastify.authenticate, fastify.requirePermission('translations:read')]
  }, async (request) => {
    return fastify.translations.listKeys()
  })

  // Create translation key
  fastify.post('/', {
    schema: {
      tags: ['translations'],
      summary: 'Create translation key',
      security: [{ bearerAuth: [] }],
      body: CreateTranslationKeyRequestSchema,
      response: {
        201: TranslationKeySchema
      }
    },
    onRequest: [
      fastify.authenticate,
      fastify.requirePermission('translations:create'),
      fastify.requireReleaseContext
    ]
  }, async (request, reply) => {
    const data = request.body as CreateTranslationKeyRequest

    try {
      const key = await fastify.translations.createKey(
        { entityKey: data.entityKey, description: data.description ?? null },
        (request.user as any).sub,
        request.releaseContext?.releaseId
      )
      reply.code(201)
      return key
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        return reply.conflict('Translation key already exists')
      }
      throw error
    }
  })

  // Update translation key
  fastify.put('/:id', {
    schema: {
      tags: ['translations'],
      summary: 'Update translation key',
      security: [{ bearerAuth: [] }],
      params: ParamsSchema,
      body: UpdateTranslationKeyRequestSchema,
      response: {
        200: TranslationKeySchema
      }
    },
    onRequest: [
      fastify.authenticate,
      fastify.requirePermission('translations:update'),
      fastify.requireReleaseContext
    ]
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const keyId = parseInt(id, 10)
    const data = request.body as UpdateTranslationKeyRequest

    try {
      const key = await fastify.translations.updateKey(
        keyId,
        data,
        (request.user as any).sub,
        request.releaseContext?.releaseId
      )
      return key
    } catch (error: any) {
      console.log('error', error.message)
      if (error.message.includes('not found')) {
        return reply.notFound('Translation key not found')
      }
      throw error
    }
  })

  // Delete translation key
  fastify.delete('/:id', {
    schema: {
      tags: ['translations'],
      summary: 'Delete translation key',
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
    const keyId = parseInt(id, 10)

    try {
      await fastify.translations.deleteKey(
        keyId,
        (request.user as any).sub,
        request.releaseContext?.releaseId)
      reply.code(204)
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return reply.notFound('Translation key not found')
      }
      throw error
    }
  })
}