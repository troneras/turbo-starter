import { eq, like, or } from 'drizzle-orm'
import type { FastifyInstance } from "fastify";
import { locales } from '@cms/db/schema'
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
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const query = request.query as LanguageQuery
        
        // Apply pagination
        const page = query.page || 1
        const pageSize = Math.min(query.pageSize || 20, 100) // Cap at 100
        const offset = (page - 1) * pageSize
        
        // Build query with optional search filter
        let allLanguages
        if (query.search) {
            const searchTerm = `%${query.search}%`
            allLanguages = await fastify.db.select().from(locales)
                .where(
                    or(
                        like(locales.code, searchTerm),
                        like(locales.name, searchTerm)
                    )
                )
                .limit(pageSize)
                .offset(offset)
        } else {
            allLanguages = await fastify.db.select().from(locales)
                .limit(pageSize)
                .offset(offset)
        }
        return allLanguages
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
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const { id } = request.params as LanguageParams

        const language = await fastify.db.select().from(locales).where(eq(locales.id, id)).limit(1)

        if (language.length === 0) {
            return reply.notFound(`Language with ID ${id} not found`)
        }

        return language[0]
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
            const [language] = await fastify.db
                .insert(locales)
                .values(data)
                .returning()

            reply.code(201)
            return language
        } catch (error: any) {
            if (error.code === '23505') { // Unique constraint violation
                return reply.conflict(`Language with code "${data.code}" already exists`)
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
            // Check if language exists
            const existing = await fastify.db.select().from(locales).where(eq(locales.id, id)).limit(1)
            
            if (existing.length === 0) {
                return reply.notFound(`Language with ID ${id} not found`)
            }

            // Update only provided fields
            const updateData: Partial<typeof data> = {}
            if (data.code !== undefined) updateData.code = data.code
            if (data.name !== undefined) updateData.name = data.name

            const [language] = await fastify.db
                .update(locales)
                .set(updateData)
                .where(eq(locales.id, id))
                .returning()

            return language
        } catch (error: any) {
            if (error.code === '23505') { // Unique constraint violation
                return reply.conflict(`Language with code "${data.code}" already exists`)
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

        // Check if language exists
        const existing = await fastify.db.select().from(locales).where(eq(locales.id, id)).limit(1)
        
        if (existing.length === 0) {
            return reply.notFound(`Language with ID ${id} not found`)
        }

        try {
            await fastify.db.delete(locales).where(eq(locales.id, id))
            reply.code(204)
            return null
        } catch (error: any) {
            // Handle foreign key constraints
            if (error.code === '23503') {
                return reply.badRequest('Cannot delete language that is referenced by other entities')
            }
            throw error
        }
    })
}