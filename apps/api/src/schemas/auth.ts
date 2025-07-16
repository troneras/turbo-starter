import { Type, type Static } from "@sinclair/typebox"
import {
    ErrorResponseSchema,
    UnauthorizedErrorSchema,
    BadRequestErrorSchema
} from "./common.js"

export const LoginRequestSchema = Type.Object({
    azure_token: Type.Optional(Type.String({ description: 'Azure AD access token for user authentication' })),
    service_token: Type.Optional(Type.String({ description: 'Service token for service-to-service authentication' }))
}, {
    additionalProperties: false,
    description: 'Login request body - provide either azure_token or service_token (not both)'
})

export const UserSchema = Type.Object({
    id: Type.String({ description: 'Unique user identifier' }),
    email: Type.String({ description: 'User email address' }),
    name: Type.String({ description: 'Full name of the user' })
}, {
    description: 'Basic user information'
})

export const LoginResponseSchema = Type.Object({
    jwt: Type.String({ description: 'JWT token for API authentication' }),
    user: UserSchema,
    roles: Type.Array(Type.String(), { description: 'Array of user role names' }),
    permissions: Type.Array(Type.String(), { description: 'Array of user permission names' })
}, {
    description: 'Successful login response with JWT token and user information'
})

export {
    ErrorResponseSchema,
    UnauthorizedErrorSchema,
    BadRequestErrorSchema
}

export type LoginRequest = Static<typeof LoginRequestSchema>
export type LoginResponse = Static<typeof LoginResponseSchema>
export type User = Static<typeof UserSchema>