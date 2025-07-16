import { eq } from 'drizzle-orm'
import type { FastifyInstance } from "fastify";
import { brands as brandsTable, brandLocales, locales } from '@cms/db/schema'


export default async function (fastify: FastifyInstance) {
    // Get all brands
    fastify.get('/', {
        schema: {
            tags: ['brands'],
            summary: 'Get all brands',
            security: [{ apiKey: [] }],
            response: {
                200: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'number' },
                            name: { type: 'string' },
                            description: { type: 'string', nullable: true }
                        }
                    }
                }
            }
        },
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const allBrands = await fastify.db.select().from(brandsTable)
        return allBrands
    })

    // Get brand by ID
    fastify.get('/:id', {
        schema: {
            tags: ['brands'],
            summary: 'Get brand by ID',
            security: [{ apiKey: [] }],
            params: {
                type: 'object',
                properties: {
                    id: { type: 'number' }
                },
                required: ['id']
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        id: { type: 'number' },
                        name: { type: 'string' },
                        description: { type: 'string', nullable: true },
                        locales: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'number' },
                                    code: { type: 'string' },
                                    name: { type: 'string' }
                                }
                            }
                        }
                    }
                },
                404: {
                    type: 'object',
                    properties: {
                        statusCode: { type: 'number' },
                        error: { type: 'string' },
                        message: { type: 'string' }
                    }
                }
            }
        },
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const { id } = request.params as { id: number }

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
            security: [{ apiKey: [] }],
            body: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    description: { type: 'string' }
                },
                required: ['name']
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        id: { type: 'number' },
                        name: { type: 'string' },
                        description: { type: 'string', nullable: true }
                    }
                },
                409: {
                    type: 'object',
                    properties: {
                        statusCode: { type: 'number' },
                        error: { type: 'string' },
                        message: { type: 'string' }
                    }
                }
            }
        },
        onRequest: [fastify.authenticate]
    }, async (request, reply) => {
        const { name, description } = request.body as { name: string; description?: string }

        try {
            const [brand] = await fastify.db
                .insert(brandsTable)
                .values({ name, description })
                .returning()

            reply.code(201)
            return brand
        } catch (error: any) {
            if (error.code === '23505') { // Unique constraint violation
                return reply.conflict(`Brand with name "${name}" already exists`)
            }
            throw error
        }
    })
}