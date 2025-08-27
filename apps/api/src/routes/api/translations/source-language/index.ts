import type { FastifyInstance } from 'fastify'
import {
  SourceLanguageTranslationSchema,
  SourceLanguageQuerySchema
} from '@cms/contracts/schemas/translations'
import {
  createPaginatedResponseSchema,
  UnauthorizedErrorSchema,
  ForbiddenErrorSchema,
  BadRequestErrorSchema,
  NotFoundErrorSchema
} from '@cms/contracts/schemas/common'
import type { SourceLanguageQuery } from '@cms/contracts/types/translations'

export default async function (fastify: FastifyInstance) {
  // Get source language translations
  fastify.get('/', {
    schema: {
      tags: ['translations'],
      summary: 'Get source language translations',
      description: 'Retrieve source language translations with combined key and variant data',
      security: [{ bearerAuth: [] }],
      querystring: SourceLanguageQuerySchema,
      response: {
        200: createPaginatedResponseSchema(SourceLanguageTranslationSchema),
        400: BadRequestErrorSchema,
        401: UnauthorizedErrorSchema,
        403: ForbiddenErrorSchema
      }
    },
    onRequest: [fastify.authenticate, fastify.requirePermission('translations:read')]
  }, async (request) => {
    const query = request.query as SourceLanguageQuery;

    try {
      const result = await fastify.translations.listSourceLanguageTranslations(
        {
          search: query.search,
          status: query.status,
          hasDescription: query.hasDescription,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder
        },
        {
          releaseId: request.releaseContext?.releaseId,
          page: query.page,
          pageSize: query.pageSize
        }
      );

      return result;
    } catch (error: any) {
      if (error.message.includes('Source locale not configured')) {
        return fastify.httpErrors.badRequest('Source locale not configured in the system');
      }
      throw error;
    }
  })

  // Get single source language translation by key
  fastify.get('/:key', {
    schema: {
      tags: ['translations'],
      summary: 'Get source language translation by key',
      description: 'Retrieve a single source language translation key with its details',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          key: { type: 'string' }
        },
        required: ['key']
      },
      response: {
        200: SourceLanguageTranslationSchema,
        401: UnauthorizedErrorSchema,
        403: ForbiddenErrorSchema,
        404: NotFoundErrorSchema
      }
    },
    onRequest: [fastify.authenticate, fastify.requirePermission('translations:read'), fastify.requireReleaseContext]
  }, async (request, reply) => {
    const { key } = request.params as { key: string };

    try {
      const translation = await fastify.translations.getSourceLanguageTranslationByKey(
        key,
        {
          releaseId: request.releaseContext?.releaseId
        }
      );

      if (!translation) {
        return reply.notFound('Translation key not found');
      }

      return translation;
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return reply.notFound('Translation key not found');
      }
      throw error;
    }
  })

  // Update source language translation
  fastify.patch('/:key', {
    schema: {
      tags: ['translations'],
      summary: 'Update source language translation',
      description: 'Update a source language translation key value and metadata',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          key: { type: 'string' }
        },
        required: ['key']
      },
      body: {
        type: 'object',
        properties: {
          value: { type: 'string' },
          description: { type: 'string' },
          needsUpdate: { type: 'boolean' },
          charLimit: { type: 'number', minimum: 1 }
        }
      },
      response: {
        200: SourceLanguageTranslationSchema,
        400: BadRequestErrorSchema,
        401: UnauthorizedErrorSchema,
        403: ForbiddenErrorSchema,
        404: NotFoundErrorSchema
      }
    },
    onRequest: [fastify.authenticate, fastify.requirePermission('translations:update'), fastify.requireReleaseContext]
  }, async (request, reply) => {
    const { key } = request.params as { key: string };
    const updateData = request.body as {
      value?: string;
      description?: string;
      needsUpdate?: boolean;
      charLimit?: number;
    };

    try {
      const updatedTranslation = await fastify.translations.updateSourceLanguageTranslationByKey(
        key,
        updateData,
        {
          releaseId: request.releaseContext?.releaseId,
          userId: (request.user as any)?.id.toString() || ''
        }
      );

      if (!updatedTranslation) {
        return reply.notFound('Translation key not found');
      }

      return updatedTranslation;
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return reply.notFound('Translation key not found');
      }
      if (error.message.includes('invalid')) {
        return reply.badRequest(error.message);
      }
      throw error;
    }
  })
}