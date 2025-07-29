import { eq, like, or, and } from 'drizzle-orm'
import type { FastifyInstance } from "fastify";
import { jurisdictions } from '@cms/db/schema'
import {
    JurisdictionListResponseSchema,
    JurisdictionDetailResponseSchema,
    CreateJurisdictionRequestSchema,
    CreateJurisdictionResponseSchema,
    UpdateJurisdictionRequestSchema,
    UpdateJurisdictionResponseSchema,
    JurisdictionParamsSchema,
    JurisdictionQuerySchema
} from "@cms/contracts/schemas/jurisdictions";
import type {
    CreateJurisdictionRequest,
    UpdateJurisdictionRequest,
    JurisdictionParams,
    JurisdictionQuery
} from "@cms/contracts/types/jurisdictions";
import {
    UnauthorizedErrorSchema,
    NotFoundErrorSchema,
    ConflictErrorSchema,
    BadRequestErrorSchema,
    ForbiddenErrorSchema
} from "@cms/contracts/schemas/common";

export default async function (fastify: FastifyInstance) {
    // Get all jurisdictions
    fastify.get('/', {
        schema: {
            tags: ['jurisdictions'],
            summary: 'Get all jurisdictions with optional search, pagination, and filtering',
            security: [{ bearerAuth: [] }],
            querystring: JurisdictionQuerySchema,
            response: {
                200: JurisdictionListResponseSchema,
                401: UnauthorizedErrorSchema
            }
        },
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const query = request.query as JurisdictionQuery
        
        // Apply pagination
        const page = query.page || 1
        const pageSize = Math.min(query.pageSize || 20, 100) // Cap at 100
        const offset = (page - 1) * pageSize
        
        // Build where conditions
        const whereConditions = []
        
        // Search filter
        if (query.search) {
            const searchTerm = `%${query.search}%`
            whereConditions.push(
                or(
                    like(jurisdictions.code, searchTerm),
                    like(jurisdictions.name, searchTerm),
                    like(jurisdictions.region, searchTerm)
                )
            )
        }
        
        // Status filter
        if (query.status) {
            whereConditions.push(eq(jurisdictions.status, query.status))
        }
        
        // Region filter
        if (query.region) {
            whereConditions.push(eq(jurisdictions.region, query.region))
        }
        
        // Build final query
        let allJurisdictions
        if (whereConditions.length > 0) {
            allJurisdictions = await fastify.db.select().from(jurisdictions)
                .where(and(...whereConditions))
                .limit(pageSize)
                .offset(offset)
        } else {
            allJurisdictions = await fastify.db.select().from(jurisdictions)
                .limit(pageSize)
                .offset(offset)
        }
        
        return allJurisdictions
    })

    // Get jurisdiction by ID
    fastify.get('/:id', {
        schema: {
            tags: ['jurisdictions'],
            summary: 'Get jurisdiction by ID',
            security: [{ bearerAuth: [] }],
            params: JurisdictionParamsSchema,
            response: {
                200: JurisdictionDetailResponseSchema,
                401: UnauthorizedErrorSchema,
                404: NotFoundErrorSchema
            }
        },
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const { id } = request.params as JurisdictionParams

        const jurisdiction = await fastify.db.select().from(jurisdictions).where(eq(jurisdictions.id, id)).limit(1)

        if (jurisdiction.length === 0) {
            return reply.notFound(`Jurisdiction with ID ${id} not found`)
        }

        return jurisdiction[0]
    })

    // Create new jurisdiction
    fastify.post('/', {
        schema: {
            tags: ['jurisdictions'],
            summary: 'Create new jurisdiction',
            security: [{ bearerAuth: [] }],
            body: CreateJurisdictionRequestSchema,
            response: {
                201: CreateJurisdictionResponseSchema,
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
        const data = request.body as CreateJurisdictionRequest

        try {
            const [jurisdiction] = await fastify.db
                .insert(jurisdictions)
                .values({
                    ...data,
                    status: data.status || 'active'
                })
                .returning()

            reply.code(201)
            return jurisdiction
        } catch (error: any) {
            if (error.code === '23505') { // Unique constraint violation
                return reply.conflict(`Jurisdiction with code "${data.code}" already exists`)
            }
            throw error
        }
    })

    // Update jurisdiction
    fastify.put('/:id', {
        schema: {
            tags: ['jurisdictions'],
            summary: 'Update existing jurisdiction',
            security: [{ bearerAuth: [] }],
            params: JurisdictionParamsSchema,
            body: UpdateJurisdictionRequestSchema,
            response: {
                200: UpdateJurisdictionResponseSchema,
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
        const { id } = request.params as JurisdictionParams
        const data = request.body as UpdateJurisdictionRequest

        try {
            // Check if jurisdiction exists
            const existing = await fastify.db.select().from(jurisdictions).where(eq(jurisdictions.id, id)).limit(1)
            
            if (existing.length === 0) {
                return reply.notFound(`Jurisdiction with ID ${id} not found`)
            }

            // Update only provided fields
            const updateData: Partial<typeof data> = {}
            if (data.code !== undefined) updateData.code = data.code
            if (data.name !== undefined) updateData.name = data.name
            if (data.description !== undefined) updateData.description = data.description
            if (data.status !== undefined) updateData.status = data.status
            if (data.region !== undefined) updateData.region = data.region

            const [jurisdiction] = await fastify.db
                .update(jurisdictions)
                .set({ ...updateData, updatedAt: new Date() })
                .where(eq(jurisdictions.id, id))
                .returning()

            return jurisdiction
        } catch (error: any) {
            if (error.code === '23505') { // Unique constraint violation
                return reply.conflict(`Jurisdiction with code "${data.code}" already exists`)
            }
            throw error
        }
    })

    // Delete jurisdiction
    fastify.delete('/:id', {
        schema: {
            tags: ['jurisdictions'],
            summary: 'Delete jurisdiction by ID',
            security: [{ bearerAuth: [] }],
            params: JurisdictionParamsSchema,
            response: {
                204: { type: 'null', description: 'Jurisdiction deleted successfully' },
                401: UnauthorizedErrorSchema,
                403: ForbiddenErrorSchema,
                404: NotFoundErrorSchema,
                400: BadRequestErrorSchema
            }
        },
        onRequest: [
            fastify.authenticate,
            fastify.requireRole('admin')
        ]
    }, async (request, reply) => {
        const { id } = request.params as JurisdictionParams

        // Check if jurisdiction exists
        const existing = await fastify.db.select().from(jurisdictions).where(eq(jurisdictions.id, id)).limit(1)
        
        if (existing.length === 0) {
            return reply.notFound(`Jurisdiction with ID ${id} not found`)
        }

        try {
            await fastify.db.delete(jurisdictions).where(eq(jurisdictions.id, id))
            reply.code(204)
            return null
        } catch (error: any) {
            // Handle foreign key constraints
            if (error.code === '23503') {
                return reply.badRequest('Cannot delete jurisdiction that is referenced by other entities (brands, translations, etc.)')
            }
            throw error
        }
    })
}