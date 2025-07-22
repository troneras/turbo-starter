import { Type } from "@sinclair/typebox"
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
    status: Type.Union([Type.Literal('active'), Type.Literal('inactive')], { default: 'active' }),
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

// GET / query parameters schema (enhanced with search and filters)
export const ListUsersQuerySchema = Type.Object({
    page: Type.Optional(Type.Number({ default: 1, description: 'Page number for pagination (starts at 1)' })),
    pageSize: Type.Optional(Type.Number({ default: 20, description: 'Number of users per page (max 100)' })),
    search: Type.Optional(Type.String({ description: 'Search query for user name or email' })),
    role: Type.Optional(Type.String({ description: 'Filter by role name' })),
    status: Type.Optional(Type.Union([Type.Literal('active'), Type.Literal('inactive')], { description: 'Filter by user status' }))
}, {
    description: 'Query parameters for listing users with search, filtering, and pagination'
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

// PATCH /:id/status params schema
export const UpdateUserStatusParamsSchema = Type.Object({
    id: Type.String({ description: 'Unique identifier of the user to update status' })
}, {
    description: 'Path parameters for updating user status'
})

// PATCH /:id/status request schema
export const UpdateUserStatusRequestSchema = Type.Object({
    status: Type.Union([Type.Literal('active'), Type.Literal('inactive')], { description: 'New user status' })
}, {
    additionalProperties: false,
    description: 'Request body for updating user status'
})

// PATCH /:id/status response schema
export const UpdateUserStatusResponseSchema = Type.Object({
    id: Type.String(),
    email: Type.String(),
    name: Type.String(),
    status: Type.Union([Type.Literal('active'), Type.Literal('inactive')])
}, {
    description: 'Successfully updated user status'
})

// POST /bulk-assign-role request schema
export const BulkAssignRoleRequestSchema = Type.Object({
    userIds: Type.Array(Type.String({ minLength: 1 }), { minItems: 1, maxItems: 100, description: 'Array of user IDs to assign role to (max 100)' }),
    roleName: Type.String({ minLength: 1, description: 'Role name to assign to users' }),
    reason: Type.Optional(Type.String({ description: 'Optional reason for the role assignment' }))
}, {
    additionalProperties: false,
    description: 'Request body for bulk role assignment'
})

// POST /bulk-assign-role response schema
export const BulkAssignRoleResponseSchema = Type.Object({
    success: Type.Boolean(),
    processedCount: Type.Number(),
    skippedCount: Type.Number(),
    errors: Type.Array(Type.Object({
        userId: Type.String(),
        error: Type.String()
    }))
}, {
    description: 'Results of bulk role assignment operation'
})

// POST /bulk-deactivate request schema
export const BulkDeactivateRequestSchema = Type.Object({
    userIds: Type.Array(Type.String({ minLength: 1 }), { minItems: 1, maxItems: 100, description: 'Array of user IDs to deactivate (max 100)' }),
    reason: Type.Optional(Type.String({ description: 'Optional reason for deactivation' }))
}, {
    additionalProperties: false,
    description: 'Request body for bulk user deactivation'
})

// POST /bulk-deactivate response schema  
export const BulkDeactivateResponseSchema = Type.Object({
    success: Type.Boolean(),
    processedCount: Type.Number(),
    skippedCount: Type.Number(),
    errors: Type.Array(Type.Object({
        userId: Type.String(),
        error: Type.String()
    }))
}, {
    description: 'Results of bulk user deactivation operation'
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

