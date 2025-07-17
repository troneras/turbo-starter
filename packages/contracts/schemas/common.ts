import { Type } from "@sinclair/typebox"

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


