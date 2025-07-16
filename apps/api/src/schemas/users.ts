import { Type, type Static } from "@sinclair/typebox"
import { 
    ErrorResponseSchema,
    UnauthorizedErrorSchema,
    ForbiddenErrorSchema,
    NotFoundErrorSchema,
    ConflictErrorSchema,
    BadRequestErrorSchema
} from "./common.js"

// Base User Schema (can be reused)
export const UserSchema = Type.Object({
    id: Type.String(),
    email: Type.String(),
    name: Type.String(),
    azure_ad_oid: Type.Optional(Type.String()),
    azure_ad_tid: Type.Optional(Type.String()),
    last_login_at: Type.Optional(Type.String())
})

// User with roles schema
export const UserWithRolesSchema = Type.Object({
    id: Type.String(),
    email: Type.String(),
    name: Type.String(),
    roles: Type.Array(Type.String()),
    createdAt: Type.String(),
    last_login_at: Type.Optional(Type.String())
})

// GET /me response schema
export const GetMeResponseSchema = Type.Object({
    user: UserSchema,
    roles: Type.Array(Type.String()),
    permissions: Type.Array(Type.String())
})

// GET / query parameters schema
export const ListUsersQuerySchema = Type.Object({
    page: Type.Optional(Type.Number({ default: 1 })),
    pageSize: Type.Optional(Type.Number({ default: 20 }))
})

// GET / response schema
export const ListUsersResponseSchema = Type.Object({
    users: Type.Array(UserWithRolesSchema),
    total: Type.Number(),
    page: Type.Number(),
    pageSize: Type.Number()
})

// POST / request schema
export const CreateUserRequestSchema = Type.Object({
    email: Type.String({ format: 'email' }),
    name: Type.String(),
    roles: Type.Optional(Type.Array(Type.String(), { default: ['user'] }))
}, {
    additionalProperties: false
})

// POST / response schema
export const CreateUserResponseSchema = Type.Object({
    id: Type.String(),
    email: Type.String(),
    name: Type.String(),
    roles: Type.Array(Type.String())
})

// PATCH /:id params schema
export const UpdateUserParamsSchema = Type.Object({
    id: Type.String()
})

// PATCH /:id request schema
export const UpdateUserRequestSchema = Type.Object({
    name: Type.Optional(Type.String()),
    email: Type.Optional(Type.String({ format: 'email' })),
    roles: Type.Optional(Type.Array(Type.String()))
}, {
    additionalProperties: false
})

// PATCH /:id response schema
export const UpdateUserResponseSchema = Type.Object({
    id: Type.String(),
    email: Type.String(),
    name: Type.String(),
    roles: Type.Array(Type.String())
})

// DELETE /:id params schema
export const DeleteUserParamsSchema = Type.Object({
    id: Type.String()
})

// Re-export common schemas
export { 
    ErrorResponseSchema,
    UnauthorizedErrorSchema,
    ForbiddenErrorSchema,
    NotFoundErrorSchema,
    ConflictErrorSchema,
    BadRequestErrorSchema
}

// Type exports
export type User = Static<typeof UserSchema>
export type UserWithRoles = Static<typeof UserWithRolesSchema>
export type GetMeResponse = Static<typeof GetMeResponseSchema>
export type ListUsersQuery = Static<typeof ListUsersQuerySchema>
export type ListUsersResponse = Static<typeof ListUsersResponseSchema>
export type CreateUserRequest = Static<typeof CreateUserRequestSchema>
export type CreateUserResponse = Static<typeof CreateUserResponseSchema>
export type UpdateUserParams = Static<typeof UpdateUserParamsSchema>
export type UpdateUserRequest = Static<typeof UpdateUserRequestSchema>
export type UpdateUserResponse = Static<typeof UpdateUserResponseSchema>
export type DeleteUserParams = Static<typeof DeleteUserParamsSchema>