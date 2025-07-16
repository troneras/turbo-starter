import { Type, type Static } from "@sinclair/typebox"

// Generic error response schema
export const ErrorResponseSchema = Type.Object({
    error: Type.String()
})

// Schema representations for response validation (what Fastify actually returns)
export const UnauthorizedErrorSchema = Type.Object({
    statusCode: Type.Literal(401),
    error: Type.Literal('Unauthorized'),
    message: Type.String()
})

export const ForbiddenErrorSchema = Type.Object({
    statusCode: Type.Literal(403),
    error: Type.Literal('Forbidden'),
    message: Type.String()
})

export const NotFoundErrorSchema = Type.Object({
    statusCode: Type.Literal(404),
    error: Type.Literal('Not Found'),
    message: Type.String()
})

export const ConflictErrorSchema = Type.Object({
    statusCode: Type.Literal(409),
    error: Type.Literal('Conflict'),
    message: Type.String()
})

export const BadRequestErrorSchema = Type.Object({
    statusCode: Type.Literal(400),
    error: Type.Literal('Bad Request'),
    message: Type.String()
})


export type ErrorResponse = Static<typeof ErrorResponseSchema>