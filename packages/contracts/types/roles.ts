import { type Static } from "@sinclair/typebox"
import {
    PermissionSchema,
    RoleSchema,
    RolesListResponseSchema
} from "../schemas/roles.js"

/**
 * Individual permission defining a specific action on a resource.
 * 
 * @description Represents a granular permission that can be assigned to roles.
 * Follows a resource-action pattern for fine-grained access control.
 * 
 * @example
 * ```typescript
 * const permission: Permission = {
 *   id: 1,
 *   name: "write:content",
 *   description: "Allows creating and editing content",
 *   resource: "content",
 *   action: "write"
 * }
 * ```
 */
export type Permission = Static<typeof PermissionSchema>

/**
 * Role entity containing a collection of permissions.
 * 
 * @description Represents a user role with associated permissions. Roles are 
 * assigned to users to grant them specific capabilities within the system.
 * 
 * @example
 * ```typescript
 * const role: Role = {
 *   id: 2,
 *   name: "editor",
 *   permissions: [
 *     {
 *       id: 1,
 *       name: "read:content",
 *       description: "View content",
 *       resource: "content", 
 *       action: "read"
 *     },
 *     {
 *       id: 2,
 *       name: "write:content",
 *       description: "Create and edit content",
 *       resource: "content",
 *       action: "write"
 *     }
 *   ]
 * }
 * ```
 */
export type Role = Static<typeof RoleSchema>

/**
 * Response containing all roles and their permissions.
 * 
 * @description Complete list of system roles with their associated permissions.
 * Used for role management interfaces and permission checking.
 * 
 * @example
 * ```typescript
 * const response: RolesListResponse = {
 *   roles: [
 *     {
 *       id: 1,
 *       name: "user",
 *       permissions: [
 *         {
 *           id: 1,
 *           name: "read:content",
 *           description: "View published content",
 *           resource: "content",
 *           action: "read"
 *         }
 *       ]
 *     },
 *     {
 *       id: 2, 
 *       name: "admin",
 *       permissions: [
 *         {
 *           id: 1,
 *           name: "read:content",
 *           description: "View all content",
 *           resource: "content",
 *           action: "read"
 *         },
 *         {
 *           id: 10,
 *           name: "manage:users",
 *           description: "Create, update, and delete users",
 *           resource: "users",
 *           action: "manage"
 *         }
 *       ]
 *     }
 *   ]
 * }
 * ```
 */
export type RolesListResponse = Static<typeof RolesListResponseSchema> 