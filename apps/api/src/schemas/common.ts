import { Type, type Static } from "@sinclair/typebox"

export const ErrorResponseSchema = Type.Object({
    error: Type.String()
})

export type ErrorResponse = Static<typeof ErrorResponseSchema>