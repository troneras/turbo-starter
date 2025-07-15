import { FastifyPluginAsync } from 'fastify'
import { eq } from 'drizzle-orm'

const brands: FastifyPluginAsync = async (fastify) => {
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
        const brands = await fastify.db.query.brands.findMany()
        return brands
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

        const brand = await fastify.db.query.brands.findFirst({
            where: eq(fastify.db.schema.brands.id, id),
            with: {
                brandLocales: {
                    with: {
                        locale: true
                    }
                }
            }
        })

        if (!brand) {
            return reply.notFound(`Brand with ID ${id} not found`)
        }

        return {
            ...brand,
            locales: brand.brandLocales?.map(bl => bl.locale) || []
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
                .insert(fastify.db.schema.brands)
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

export default brands 