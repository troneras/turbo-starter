import { type Static } from "@sinclair/typebox"
import {
    PermissionSchema,
    ListPermissionsQuerySchema,
    ListPermissionsResponseSchema,
    CreatePermissionRequestSchema,
    CreatePermissionResponseSchema,
    PermissionParamsSchema,
    UpdatePermissionRequestSchema,
    UpdatePermissionResponseSchema,
    GetPermissionResponseSchema
} from "../schemas/permissions.js"

/**
 * Individual permission defining a specific capability in the system.
 * 
 * @description Represents a granular permission that can be assigned to roles.
 * Uses a descriptive naming pattern for clear access control.
 * 
 * @example
 * ```typescript
 * const permission: Permission = {
 *   id: 1,
 *   name: "users:create",
 *   description: "Allows creating new users",
 *   resource: "users",
 *   action: "create",
 *   category: "users",
 *   created_at: "2024-01-01T00:00:00Z",
 *   updated_at: "2024-01-01T00:00:00Z"
 * }
 * ```
 */
export type Permission = Static<typeof PermissionSchema>

/**
 * Query parameters for listing permissions with filtering and pagination.
 * 
 * @description Supports search, category filtering, pagination, and sorting options.
 * 
 * @example
 * ```typescript
 * const query: ListPermissionsQuery = {
 *   page: 1,
 *   pageSize: 20,
 *   search: "user",
 *   category: "users",
 *   sortBy: "name",
 *   sortDirection: "asc"
 * }
 * ```
 */
export type ListPermissionsQuery = Static<typeof ListPermissionsQuerySchema>

/**
 * Response for paginated permissions list with metadata.
 * 
 * @description Contains permissions array with pagination information.
 * 
 * @example
 * ```typescript
 * const response: ListPermissionsResponse = {
 *   permissions: [...],
 *   pagination: {
 *     page: 1,
 *     pageSize: 20,
 *     total: 45,
 *     totalPages: 3
 *   }
 * }
 * ```
 */
export type ListPermissionsResponse = Static<typeof ListPermissionsResponseSchema>

/**
 * Request body for creating a new permission.
 * 
 * @description Includes permission name, optional description, and category.
 * 
 * @example
 * ```typescript
 * const request: CreatePermissionRequest = {
 *   name: "translations:publish",
 *   description: "Permission to publish translations",
 *   resource: "translations",
 *   action: "publish",
 *   category: "content"
 * }
 * ```
 */
export type CreatePermissionRequest = Static<typeof CreatePermissionRequestSchema>

/**
 * Response after creating a permission.
 * 
 * @description Returns the complete created permission with all fields populated.
 */
export type CreatePermissionResponse = Static<typeof CreatePermissionResponseSchema>

/**
 * URL parameters for permission-specific operations.
 * 
 * @description Contains the permission ID from the URL path.
 * 
 * @example
 * ```typescript
 * const params: PermissionParams = { id: 123 }
 * ```
 */
export type PermissionParams = Static<typeof PermissionParamsSchema>

/**
 * Request body for updating an existing permission.
 * 
 * @description All fields are optional for partial updates.
 * 
 * @example
 * ```typescript
 * const request: UpdatePermissionRequest = {
 *   name: "translations:manage",
 *   description: "Permission to manage translations",
 *   resource: "translations",
 *   action: "manage"
 * }
 * ```
 */
export type UpdatePermissionRequest = Static<typeof UpdatePermissionRequestSchema>

/**
 * Response after updating a permission.
 * 
 * @description Returns the complete updated permission with all fields.
 */
export type UpdatePermissionResponse = Static<typeof UpdatePermissionResponseSchema>

/**
 * Response for getting a single permission.
 * 
 * @description Returns the complete permission with all details.
 */
export type GetPermissionResponse = Static<typeof GetPermissionResponseSchema>