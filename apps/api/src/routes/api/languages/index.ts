import type { FastifyInstance } from "fastify";
import {
    LanguageListResponseSchema,
    LanguageDetailResponseSchema,
    CreateLanguageRequestSchema,
    CreateLanguageResponseSchema,
    UpdateLanguageRequestSchema,
    UpdateLanguageResponseSchema,
    LanguageParamsSchema,
    LanguageQuerySchema
} from "@cms/contracts/schemas/languages";
import type {
    CreateLanguageRequest,
    UpdateLanguageRequest,
    LanguageParams,
    LanguageQuery
} from "@cms/contracts/types/languages";
import {
    UnauthorizedErrorSchema,
    NotFoundErrorSchema,
    ConflictErrorSchema,
    BadRequestErrorSchema,
    ForbiddenErrorSchema
} from "@cms/contracts/schemas/common";

export default async function (fastify: FastifyInstance) {
    // Get all languages
    fastify.get('/', {
        schema: {
            tags: ['languages'],
            summary: 'Get all languages with optional search and pagination',
            security: [{ bearerAuth: [] }],
            querystring: LanguageQuerySchema,
            response: {
                200: LanguageListResponseSchema,
                401: UnauthorizedErrorSchema
            }
        },
        onRequest: [fastify.authenticate, fastify.requirePermission('languages:read')]
    }, async (request, reply) => {
        const query = request.query as LanguageQuery

        // Apply pagination
        const page = query.page || 1
        const pageSize = Math.min(query.pageSize || 20, 100) // Cap at 100

        // Use locales service with search and pagination
        const result = await fastify.locales.listLocales(page, pageSize, {
            search: query.search,
            sortBy: 'name',
            sortDirection: 'asc'
        })

        return result.locales
    })

    // Get source language
    fastify.get('/source', {
        schema: {
            tags: ['languages'],
            summary: 'Get the source language',
            security: [{ bearerAuth: [] }],
            response: {
                200: LanguageDetailResponseSchema,
                401: UnauthorizedErrorSchema,
                404: NotFoundErrorSchema
            }
        },
        onRequest: [fastify.authenticate, fastify.requirePermission('languages:read')]
    }, async (request, reply) => {
        try {
            const sourceLocale = await fastify.locales.getSourceLocale()
            
            if (!sourceLocale) {
                return reply.notFound('No source language configured')
            }

            return sourceLocale
        } catch (error: any) {
            throw error
        }
    })

    // Get language by ID
    fastify.get('/:id', {
        schema: {
            tags: ['languages'],
            summary: 'Get language by ID',
            security: [{ bearerAuth: [] }],
            params: LanguageParamsSchema,
            response: {
                200: LanguageDetailResponseSchema,
                401: UnauthorizedErrorSchema,
                404: NotFoundErrorSchema
            }
        },
        onRequest: [fastify.authenticate, fastify.requirePermission('languages:read')]
    }, async (request, reply) => {
        const { id } = request.params as LanguageParams

        try {
            const language = await fastify.locales.getLocaleById(id)

            if (!language) {
                return reply.notFound(`Language with ID ${id} not found`)
            }

            return language
        } catch (error: any) {
            throw error
        }
    })

    // Create new language
    fastify.post('/', {
        schema: {
            tags: ['languages'],
            summary: 'Create new language',
            security: [{ bearerAuth: [] }],
            body: CreateLanguageRequestSchema,
            response: {
                201: CreateLanguageResponseSchema,
                400: BadRequestErrorSchema,
                401: UnauthorizedErrorSchema,
                403: ForbiddenErrorSchema,
                409: ConflictErrorSchema
            }
        },
        onRequest: [
            fastify.authenticate,
            fastify.requireRole('admin')
        ]
    }, async (request, reply) => {
        const data = request.body as CreateLanguageRequest

        try {
            const language = await fastify.locales.createLocale(data)

            reply.code(201)
            return language
        } catch (error: any) {
            if (error.message.includes('already exists')) {
                return reply.conflict(`Language with code "${data.code}" already exists`)
            }
            if (error.message.includes('source locale already exists')) {
                return reply.conflict('A source locale already exists. Only one locale can be marked as source.')
            }
            throw error
        }
    })

    // Update language
    fastify.put('/:id', {
        schema: {
            tags: ['languages'],
            summary: 'Update existing language',
            security: [{ bearerAuth: [] }],
            params: LanguageParamsSchema,
            body: UpdateLanguageRequestSchema,
            response: {
                200: UpdateLanguageResponseSchema,
                400: BadRequestErrorSchema,
                401: UnauthorizedErrorSchema,
                403: ForbiddenErrorSchema,
                404: NotFoundErrorSchema,
                409: ConflictErrorSchema
            }
        },
        onRequest: [
            fastify.authenticate,
            fastify.requireRole('admin')
        ]
    }, async (request, reply) => {
        const { id } = request.params as LanguageParams
        const data = request.body as UpdateLanguageRequest

        try {
            const language = await fastify.locales.updateLocale(id, data)
            return language
        } catch (error: any) {
            if (error.message.includes('not found')) {
                return reply.notFound(`Language with ID ${id} not found`)
            }
            if (error.message.includes('already exists')) {
                return reply.conflict(`Language with code "${data.code}" already exists`)
            }
            if (error.message.includes('Cannot modify the source locale')) {
                return reply.badRequest('Cannot modify the source locale. The source language is immutable once set.')
            }
            throw error
        }
    })

    // Delete language
    fastify.delete('/:id', {
        schema: {
            tags: ['languages'],
            summary: 'Delete language by ID',
            security: [{ bearerAuth: [] }],
            params: LanguageParamsSchema,
            response: {
                204: { type: 'null', description: 'Language deleted successfully' },
                401: UnauthorizedErrorSchema,
                403: ForbiddenErrorSchema,
                404: NotFoundErrorSchema
            }
        },
        onRequest: [
            fastify.authenticate,
            fastify.requireRole('admin')
        ]
    }, async (request, reply) => {
        const { id } = request.params as LanguageParams

        try {
            await fastify.locales.deleteLocale(id)
            reply.code(204)
            return null
        } catch (error: any) {
            if (error.message.includes('not found')) {
                return reply.notFound(`Language with ID ${id} not found`)
            }
            if (error.message.includes('Cannot delete the source locale')) {
                return reply.badRequest('Cannot delete the source locale. The source language cannot be removed.')
            }
            // Handle foreign key constraints - this would need to be implemented in the locales service
            if (error.code === '23503') {
                return reply.badRequest('Cannot delete language that is referenced by other entities')
            }
            throw error
        }
    })
}