import { type Static } from "@sinclair/typebox"
import {
    RoleSchema,
    RolesListResponseSchema,
    ListRolesQuerySchema,
    ListRolesResponseSchema,
    CreateRoleRequestSchema,
    CreateRoleResponseSchema,
    RoleParamsSchema,
    UpdateRoleRequestSchema,
    UpdateRoleResponseSchema,
    GetRoleResponseSchema,
    UpdateRolePermissionsRequestSchema,
    GetRolePermissionsResponseSchema,
    UpdateRolePermissionsResponseSchema
} from "../schemas/roles.js"

// Permission type is imported from permissions.ts to avoid duplication

/**
 * Role entity with hierarchy support and audit fields.
 * 
 * @description Represents a user role with associated permissions and optional 
 * parent role for hierarchical structure. Roles are assigned to users to grant 
 * them specific capabilities within the system.
 * 
 * @example
 * ```typescript
 * const role: Role = {
 *   id: 2,
 *   name: "editor",
 *   description: "Content editor role",
 *   parent_role_id: 1,
 *   created_by: "user-123",
 *   updated_by: "user-456",
 *   created_at: "2024-01-01T00:00:00Z",
 *   updated_at: "2024-01-02T00:00:00Z",
 *   permissions: [
 *     {
 *       id: 1,
 *       name: "read:content",
 *       description: "View content",
 *       resource: "content", 
 *       action: "read",
 *       created_at: "2024-01-01T00:00:00Z"
 *     },
 *     {
 *       id: 2,
 *       name: "write:content",
 *       description: "Create and edit content",
 *       resource: "content",
 *       action: "write",
 *       created_at: "2024-01-01T00:00:00Z"
 *     }
 *   ]
 * }
 * ```
 */
export type Role = Static<typeof RoleSchema>

/**
 * Query parameters for listing roles with filtering and pagination.
 * 
 * @description Supports search, pagination, sorting, and permission inclusion options.
 * 
 * @example
 * ```typescript
 * const query: ListRolesQuery = {
 *   page: 1,
 *   pageSize: 20,
 *   search: "admin",
 *   includePermissions: true,
 *   sortBy: "name",
 *   sortDirection: "asc"
 * }
 * ```
 */
export type ListRolesQuery = Static<typeof ListRolesQuerySchema>

/**
 * Response for paginated roles list with metadata.
 * 
 * @description Contains roles array with pagination information.
 * 
 * @example
 * ```typescript
 * const response: ListRolesResponse = {
 *   roles: [...],
 *   pagination: {
 *     page: 1,
 *     pageSize: 20,
 *     total: 45,
 *     totalPages: 3
 *   }
 * }
 * ```
 */
export type ListRolesResponse = Static<typeof ListRolesResponseSchema>

/**
 * Request body for creating a new role.
 * 
 * @description Includes role name, optional description, parent role, and permissions.
 * 
 * @example
 * ```typescript
 * const request: CreateRoleRequest = {
 *   name: "content-editor",
 *   description: "Role for content editors",
 *   parent_role_id: 1,
 *   permissions: [1, 2, 3]
 * }
 * ```
 */
export type CreateRoleRequest = Static<typeof CreateRoleRequestSchema>

/**
 * Response after creating a role.
 * 
 * @description Returns the complete created role with all fields populated.
 */
export type CreateRoleResponse = Static<typeof CreateRoleResponseSchema>

/**
 * URL parameters for role-specific operations.
 * 
 * @description Contains the role ID from the URL path.
 * 
 * @example
 * ```typescript
 * const params: RoleParams = { id: 123 }
 * ```
 */
export type RoleParams = Static<typeof RoleParamsSchema>

/**
 * Request body for updating an existing role.
 * 
 * @description All fields are optional for partial updates.
 * 
 * @example
 * ```typescript
 * const request: UpdateRoleRequest = {
 *   name: "senior-editor",
 *   description: "Senior content editor role"
 * }
 * ```
 */
export type UpdateRoleRequest = Static<typeof UpdateRoleRequestSchema>

/**
 * Response after updating a role.
 * 
 * @description Returns the complete updated role with all fields.
 */
export type UpdateRoleResponse = Static<typeof UpdateRoleResponseSchema>

/**
 * Response for getting a single role.
 * 
 * @description Returns the complete role with permissions and hierarchy info.
 */
export type GetRoleResponse = Static<typeof GetRoleResponseSchema>

/**
 * Request body for updating role permissions.
 * 
 * @description Contains array of permission IDs to assign to the role.
 * Replaces all existing permissions.
 * 
 * @example
 * ```typescript
 * const request: UpdateRolePermissionsRequest = {
 *   permissions: [1, 2, 5, 8]
 * }
 * ```
 */
export type UpdateRolePermissionsRequest = Static<typeof UpdateRolePermissionsRequestSchema>

/**
 * Response for getting role permissions.
 * 
 * @description Contains role ID and array of assigned permissions.
 * 
 * @example
 * ```typescript
 * const response: GetRolePermissionsResponse = {
 *   role_id: 123,
 *   permissions: [...]
 * }
 * ```
 */
export type GetRolePermissionsResponse = Static<typeof GetRolePermissionsResponseSchema>

/**
 * Response after updating role permissions.
 * 
 * @description Returns the role ID and updated permissions array.
 */
export type UpdateRolePermissionsResponse = Static<typeof UpdateRolePermissionsResponseSchema>

/**
 * Legacy response containing all roles and their permissions.
 * 
 * @description Complete list of system roles with their associated permissions.
 * Used for role management interfaces and permission checking.
 * Maintained for backward compatibility.
 * 
 * @example
 * ```typescript
 * const response: RolesListResponse = {
 *   roles: [
 *     {
 *       id: 1,
 *       name: "user",
 *       description: "Basic user role",
 *       parent_role_id: null,
 *       created_by: "system",
 *       updated_by: "system",
 *       created_at: "2024-01-01T00:00:00Z",
 *       updated_at: "2024-01-01T00:00:00Z",
 *       permissions: [
 *         {
 *           id: 1,
 *           name: "read:content",
 *           description: "View published content",
 *           resource: "content",
 *           action: "read",
 *           created_at: "2024-01-01T00:00:00Z"
 *         }
 *       ]
 *     },
 *     {
 *       id: 2, 
 *       name: "admin",
 *       description: "Administrator role",
 *       parent_role_id: null,
 *       created_by: "system",
 *       updated_by: "system",
 *       created_at: "2024-01-01T00:00:00Z",
 *       updated_at: "2024-01-01T00:00:00Z",
 *       permissions: [
 *         {
 *           id: 1,
 *           name: "read:content",
 *           description: "View all content",
 *           resource: "content",
 *           action: "read",
 *           created_at: "2024-01-01T00:00:00Z"
 *         },
 *         {
 *           id: 10,
 *           name: "manage:users",
 *           description: "Create, update, and delete users",
 *           resource: "users",
 *           action: "manage",
 *           created_at: "2024-01-01T00:00:00Z"
 *         }
 *       ]
 *     }
 *   ]
 * }
 * ```
 */
export type RolesListResponse = Static<typeof RolesListResponseSchema> 