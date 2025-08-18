import { Type, type TSchema } from "@sinclair/typebox"

// Generic error response schema
export const ErrorResponseSchema = Type.Object({
    error: Type.String()
})

// Schema representations for response validation (what Fastify actually returns)
export const UnauthorizedErrorSchema = Type.Object({
    statusCode: Type.Literal(401),
    error: Type.Literal('Unauthorized'),
    message: Type.String()
}, {
    description: 'Unauthorized - invalid, expired, or malformed token'
})

export const ForbiddenErrorSchema = Type.Object({
    statusCode: Type.Literal(403),
    error: Type.Literal('Forbidden'),
    message: Type.String()
}, {
    description: 'Forbidden - insufficient permissions to access this resource'
})

export const NotFoundErrorSchema = Type.Object({
    statusCode: Type.Literal(404),
    error: Type.Literal('Not Found'),
    message: Type.String()
}, {
    description: 'Not Found - the requested resource does not exist'
})

export const ConflictErrorSchema = Type.Object({
    statusCode: Type.Literal(409),
    error: Type.Literal('Conflict'),
    message: Type.String()
}, {
    description: 'Conflict - the request conflicts with the current state of the resource'
})

export const BadRequestErrorSchema = Type.Object({
    statusCode: Type.Literal(400),
    error: Type.Literal('Bad Request'),
    message: Type.String()
}, {
    description: 'Bad Request - invalid request parameters or missing required fields'
})

// Pagination schemas
export const PaginationQuerySchema = Type.Object({
    page: Type.Optional(Type.Number({ minimum: 1, default: 1 })),
    pageSize: Type.Optional(Type.Number({ minimum: 1, maximum: 500, default: 100 }))
}, {
    description: 'Common pagination query parameters'
})

export const PaginationMetaSchema = Type.Object({
    page: Type.Number({ description: 'Current page number' }),
    pageSize: Type.Number({ description: 'Number of items per page' }),
    totalItems: Type.Number({ description: 'Total number of items across all pages' }),
    totalPages: Type.Number({ description: 'Total number of pages' }),
    hasNextPage: Type.Boolean({ description: 'Whether there is a next page' }),
    hasPreviousPage: Type.Boolean({ description: 'Whether there is a previous page' })
}, {
    description: 'Pagination metadata included in paginated responses'
})

// Generic paginated response schema factory
// Usage example:
// const MyEntityListResponse = createPaginatedResponseSchema(MyEntitySchema)
export const createPaginatedResponseSchema = <T extends TSchema>(dataSchema: T) => Type.Object({
    data: Type.Array(dataSchema),
    pagination: PaginationMetaSchema
}, {
    description: 'Paginated response with data and pagination metadata'
})


