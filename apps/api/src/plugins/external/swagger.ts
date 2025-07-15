import fp from 'fastify-plugin'
import swagger from '@fastify/swagger'
import swaggerUI from '@fastify/swagger-ui'

export default fp(async function (fastify) {
    await fastify.register(swagger, {
        swagger: {
            info: {
                title: 'CMS Platform API',
                description: 'Multi-brand translation management system API',
                version: '1.0.0'
            },
            externalDocs: {
                url: 'https://swagger.io',
                description: 'Find more info here'
            },
            schemes: ['http', 'https'],
            consumes: ['application/json'],
            produces: ['application/json'],
            tags: [
                { name: 'translations', description: 'Translation management endpoints' },
                { name: 'releases', description: 'Release management endpoints' },
                { name: 'users', description: 'User management endpoints' },
                { name: 'brands', description: 'Brand management endpoints' },
                { name: 'assets', description: 'Asset management endpoints' },
                { name: 'flags', description: 'Feature flag endpoints' },
                { name: 'workflow', description: 'Workflow management endpoints' },
                { name: 'cms', description: 'CMS content endpoints' },
                { name: 'seo', description: 'SEO metadata endpoints' }
            ],
            securityDefinitions: {
                apiKey: {
                    type: 'apiKey',
                    name: 'Authorization',
                    in: 'header'
                }
            }
        }
    })

    await fastify.register(swaggerUI, {
        routePrefix: '/documentation',
        uiConfig: {
            docExpansion: 'none',
            deepLinking: true
        },
        staticCSP: true,
        transformStaticCSP: (header) => header,
        transformSpecification: (swaggerObject, request, reply) => {
            return swaggerObject
        },
        transformSpecificationClone: true
    })
}, {
    name: 'swagger'
}) 