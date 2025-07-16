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
}, {
    description: 'Current user information with roles and permissions'
})

// GET / query parameters schema
export const ListUsersQuerySchema = Type.Object({
    page: Type.Optional(Type.Number({ default: 1, description: 'Page number for pagination (starts at 1)' })),
    pageSize: Type.Optional(Type.Number({ default: 20, description: 'Number of users per page (max 100)' }))
}, {
    description: 'Query parameters for listing users with pagination'
})

// GET / response schema
export const ListUsersResponseSchema = Type.Object({
    users: Type.Array(UserWithRolesSchema),
    total: Type.Number(),
    page: Type.Number(),
    pageSize: Type.Number()
}, {
    description: 'Paginated list of users with their roles'
})

// POST / request schema
export const CreateUserRequestSchema = Type.Object({
    email: Type.String({ format: 'email', description: 'User email address (must be valid email format)' }),
    name: Type.String({ description: 'Full name of the user' }),
    roles: Type.Optional(Type.Array(Type.String(), { default: ['user'], description: 'Array of role names to assign to the user' }))
}, {
    additionalProperties: false,
    description: 'Request body for creating a new user'
})

// POST / response schema
export const CreateUserResponseSchema = Type.Object({
    id: Type.String(),
    email: Type.String(),
    name: Type.String(),
    roles: Type.Array(Type.String())
}, {
    description: 'Successfully created user with assigned roles'
})

// PATCH /:id params schema
export const UpdateUserParamsSchema = Type.Object({
    id: Type.String({ description: 'Unique identifier of the user to update' })
}, {
    description: 'Path parameters for updating a user'
})

// PATCH /:id request schema
export const UpdateUserRequestSchema = Type.Object({
    name: Type.Optional(Type.String({ description: 'Updated full name of the user' })),
    email: Type.Optional(Type.String({ format: 'email', description: 'Updated email address (must be valid email format)' })),
    roles: Type.Optional(Type.Array(Type.String(), { description: 'Updated array of role names for the user' }))
}, {
    additionalProperties: false,
    description: 'Request body for updating user information (all fields are optional)'
})

// PATCH /:id response schema
export const UpdateUserResponseSchema = Type.Object({
    id: Type.String(),
    email: Type.String(),
    name: Type.String(),
    roles: Type.Array(Type.String())
}, {
    description: 'Successfully updated user information'
})

// DELETE /:id params schema
export const DeleteUserParamsSchema = Type.Object({
    id: Type.String({ description: 'Unique identifier of the user to delete' })
}, {
    description: 'Path parameters for deleting a user'
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