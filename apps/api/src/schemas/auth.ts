import { Type, type Static } from "@sinclair/typebox"
import { 
    ErrorResponseSchema,
    UnauthorizedErrorSchema,
    BadRequestErrorSchema
} from "./common.js"

export const LoginRequestSchema = Type.Object({
    azure_token: Type.Optional(Type.String()),
    service_token: Type.Optional(Type.String())
}, {
    additionalProperties: false
})

export const UserSchema = Type.Object({
    id: Type.String(),
    email: Type.String(),
    name: Type.String()
})

export const LoginResponseSchema = Type.Object({
    jwt: Type.String(),
    user: UserSchema,
    roles: Type.Array(Type.String()),
    permissions: Type.Array(Type.String())
})

export { 
    ErrorResponseSchema,
    UnauthorizedErrorSchema,
    BadRequestErrorSchema
}

export type LoginRequest = Static<typeof LoginRequestSchema>
export type LoginResponse = Static<typeof LoginResponseSchema>
export type User = Static<typeof UserSchema>