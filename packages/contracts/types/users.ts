import { type Static } from "@sinclair/typebox"
import {
    UserSchema,
    UserWithRolesSchema,
    GetMeResponseSchema,
    ListUsersQuerySchema,
    ListUsersResponseSchema,
    CreateUserRequestSchema,
    CreateUserResponseSchema,
    UpdateUserParamsSchema,
    UpdateUserRequestSchema,
    UpdateUserResponseSchema,
    DeleteUserParamsSchema
} from "../schemas/users.js"

/**
 * Base user entity with core profile information.
 * 
 * @description Represents a user in the system with essential profile data 
 * and optional Azure AD integration fields.
 * 
 * @example
 * ```typescript
 * const user: User = {
 *   id: "user-123",
 *   email: "john.doe@example.com",
 *   name: "John Doe",
 *   azure_ad_oid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
 *   azure_ad_tid: "tenant-123",
 *   last_login_at: "2024-01-15T10:30:00Z"
 * }
 * ```
 */
export type User = Static<typeof UserSchema>

/**
 * User entity enriched with assigned role information.
 * 
 * @description Extended user object that includes role assignments and creation timestamp.
 * Used primarily in user management interfaces and administrative operations.
 * 
 * @example
 * ```typescript
 * const userWithRoles: UserWithRoles = {
 *   id: "user-123",
 *   email: "john.doe@example.com", 
 *   name: "John Doe",
 *   roles: ["user", "editor", "content-manager"],
 *   createdAt: "2024-01-01T12:00:00Z",
 *   last_login_at: "2024-01-15T10:30:00Z"
 * }
 * ```
 */
export type UserWithRoles = Static<typeof UserWithRolesSchema>

/**
 * Current user information response from the /me endpoint.
 * 
 * @description Complete user profile including roles and permissions for the 
 * currently authenticated user. Used to populate user interface elements and 
 * determine feature access.
 * 
 * @example
 * ```typescript
 * const meResponse: GetMeResponse = {
 *   user: {
 *     id: "user-123",
 *     email: "john.doe@example.com",
 *     name: "John Doe",
 *     azure_ad_oid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
 *     last_login_at: "2024-01-15T10:30:00Z"
 *   },
 *   roles: ["user", "editor"],
 *   permissions: ["read:content", "write:content", "delete:own-content"]
 * }
 * ```
 */
export type GetMeResponse = Static<typeof GetMeResponseSchema>

/**
 * Query parameters for paginated user listing.
 * 
 * @description Controls pagination when retrieving user lists. Both parameters 
 * are optional with sensible defaults.
 * 
 * @example
 * ```typescript
 * const query: ListUsersQuery = {
 *   page: 2,
 *   pageSize: 50
 * }
 * ```
 */
export type ListUsersQuery = Static<typeof ListUsersQuerySchema>

/**
 * Paginated response for user listing operations.
 * 
 * @description Contains a page of users with metadata for pagination controls.
 * Each user includes their assigned roles for administrative purposes.
 * 
 * @example
 * ```typescript
 * const response: ListUsersResponse = {
 *   users: [
 *     {
 *       id: "user-123",
 *       email: "john.doe@example.com",
 *       name: "John Doe", 
 *       roles: ["user", "editor"],
 *       createdAt: "2024-01-01T12:00:00Z",
 *       last_login_at: "2024-01-15T10:30:00Z"
 *     }
 *   ],
 *   total: 150,
 *   page: 1,
 *   pageSize: 20
 * }
 * ```
 */
export type ListUsersResponse = Static<typeof ListUsersResponseSchema>

/**
 * Request payload for creating a new user.
 * 
 * @description Data required to create a new user account. Roles are optional 
 * and will default to ['user'] if not specified.
 * 
 * @example
 * ```typescript
 * const request: CreateUserRequest = {
 *   email: "jane.smith@example.com",
 *   name: "Jane Smith",
 *   roles: ["user", "content-manager"]
 * }
 * ```
 */
export type CreateUserRequest = Static<typeof CreateUserRequestSchema>

/**
 * Response after successfully creating a new user.
 * 
 * @description Returns the newly created user's basic information including 
 * the assigned roles.
 * 
 * @example
 * ```typescript
 * const response: CreateUserResponse = {
 *   id: "user-456",
 *   email: "jane.smith@example.com",
 *   name: "Jane Smith", 
 *   roles: ["user", "content-manager"]
 * }
 * ```
 */
export type CreateUserResponse = Static<typeof CreateUserResponseSchema>

/**
 * Path parameters for user update operations.
 * 
 * @description Contains the user ID from the URL path for update/delete operations.
 * 
 * @example
 * ```typescript
 * const params: UpdateUserParams = {
 *   id: "user-123"
 * }
 * ```
 */
export type UpdateUserParams = Static<typeof UpdateUserParamsSchema>

/**
 * Request payload for updating user information.
 * 
 * @description Partial user data for updates. All fields are optional, allowing 
 * for selective updates of user properties.
 * 
 * @example
 * ```typescript
 * const request: UpdateUserRequest = {
 *   name: "John D. Smith",
 *   roles: ["user", "editor", "admin"]
 * }
 * ```
 */
export type UpdateUserRequest = Static<typeof UpdateUserRequestSchema>

/**
 * Response after successfully updating a user.
 * 
 * @description Returns the updated user information including current role assignments.
 * 
 * @example
 * ```typescript
 * const response: UpdateUserResponse = {
 *   id: "user-123",
 *   email: "john.doe@example.com",
 *   name: "John D. Smith",
 *   roles: ["user", "editor", "admin"]
 * }
 * ```
 */
export type UpdateUserResponse = Static<typeof UpdateUserResponseSchema>

/**
 * Path parameters for user deletion operations.
 * 
 * @description Contains the user ID from the URL path for delete operations.
 * 
 * @example
 * ```typescript
 * const params: DeleteUserParams = {
 *   id: "user-123"
 * }
 * ```
 */
export type DeleteUserParams = Static<typeof DeleteUserParamsSchema> 