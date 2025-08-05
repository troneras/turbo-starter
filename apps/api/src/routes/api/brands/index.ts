import { eq } from 'drizzle-orm'
import type { FastifyInstance } from "fastify";
import { brands as brandsTable, brandLocales, locales } from '@cms/db/schema'
import {
    BrandListResponseSchema,
    BrandDetailResponseSchema,
    CreateBrandRequestSchema,
    CreateBrandResponseSchema,
    BrandParamsSchema
} from "@cms/contracts/schemas/brands";
import type {
    CreateBrandRequest,
    BrandParams
} from "@cms/contracts/types/brands";
import {
    UnauthorizedErrorSchema,
    NotFoundErrorSchema,
    ConflictErrorSchema,
    BadRequestErrorSchema
} from "@cms/contracts/schemas/common";

export default async function (fastify: FastifyInstance) {
    // Get all brands
    fastify.get('/', {
        schema: {
            tags: ['brands'],
            summary: 'Get all brands',
            security: [{ bearerAuth: [] }],
            response: {
                200: BrandListResponseSchema,
                401: UnauthorizedErrorSchema
            }
        },
        onRequest: [fastify.authenticate, fastify.requirePermission('brands:read')]
    }, async (request, reply) => {
        const allBrands = await fastify.db.select().from(brandsTable)
        return allBrands
    })

    // Get brand by ID
    fastify.get('/:id', {
        schema: {
            tags: ['brands'],
            summary: 'Get brand by ID',
            security: [{ bearerAuth: [] }],
            params: BrandParamsSchema,
            response: {
                200: BrandDetailResponseSchema,
                401: UnauthorizedErrorSchema,
                404: NotFoundErrorSchema
            }
        },
        onRequest: [fastify.authenticate, fastify.requirePermission('brands:read')]
    }, async (request, reply) => {
        const { id } = request.params as BrandParams

        const brand = await fastify.db.select().from(brandsTable).where(eq(brandsTable.id, id)).limit(1)

        if (brand.length === 0) {
            return reply.notFound(`Brand with ID ${id} not found`)
        }

        // Get associated locales
        const brandLocalesList = await fastify.db
            .select({
                locale: locales
            })
            .from(brandLocales)
            .innerJoin(locales, eq(brandLocales.localeId, locales.id))
            .where(eq(brandLocales.brandId, id))

        return {
            ...brand[0],
            locales: brandLocalesList.map(bl => bl.locale)
        }
    })

    // Create new brand
    fastify.post('/', {
        schema: {
            tags: ['brands'],
            summary: 'Create new brand',
            security: [{ bearerAuth: [] }],
            body: CreateBrandRequestSchema,
            response: {
                201: CreateBrandResponseSchema,
                400: BadRequestErrorSchema,
                401: UnauthorizedErrorSchema,
                409: ConflictErrorSchema
            }
        },
        onRequest: [fastify.authenticate, fastify.requirePermission('brands:create')]
    }, async (request, reply) => {
        const data = request.body as CreateBrandRequest

        try {
            const [brand] = await fastify.db
                .insert(brandsTable)
                .values(data)
                .returning()

            reply.code(201)
            return brand
        } catch (error: any) {
            if (error.code === '23505') { // Unique constraint violation
                return reply.conflict(`Brand with name "${data.name}" already exists`)
            }
            throw error
        }
    })
}