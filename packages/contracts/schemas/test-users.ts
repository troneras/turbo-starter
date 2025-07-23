import { Type } from "@sinclair/typebox"
import {
    ErrorResponseSchema,
    UnauthorizedErrorSchema,
    ForbiddenErrorSchema,
    NotFoundErrorSchema,
    ConflictErrorSchema,
    BadRequestErrorSchema
} from "./common.js"

export const TestUserSchema = Type.Object({
    id: Type.String({ description: 'Unique identifier of the test user' }),
    email: Type.String({ format: 'email', description: 'Email address of the test user' }),
    name: Type.String({ description: 'Full name of the test user' }),
    roles: Type.Array(Type.String(), { description: 'Array of role names assigned to the user' }),
    permissions: Type.Array(Type.String(), { description: 'Array of permission names the user has' }),
    jwt: Type.String({ description: 'Mock JWT token for testing purposes' })
}, {
    description: 'Test user data with roles and permissions for frontend testing'
})

export const TestUsersResponseSchema = Type.Object({
    admin: Type.Optional(TestUserSchema),
    editor: Type.Optional(TestUserSchema),
    translator: Type.Optional(TestUserSchema)
}, {
    description: 'Available test users grouped by role type for easy frontend access'
})

// Re-export common error schemas
export {
    ErrorResponseSchema,
    UnauthorizedErrorSchema,
    ForbiddenErrorSchema,
    NotFoundErrorSchema,
    ConflictErrorSchema,
    BadRequestErrorSchema
}