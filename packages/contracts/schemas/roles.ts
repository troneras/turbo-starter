import { Type } from "@sinclair/typebox"
import { PermissionSchema } from "./permissions.js"

// Role schema with hierarchy support
export const RoleSchema = Type.Object({
    id: Type.Number({ description: "Unique identifier for the role" }),
    name: Type.String({ description: "Name of the role" }),
    description: Type.Union([Type.String(), Type.Null()], { 
        description: "Description of the role's purpose" 
    }),
    parent_role_id: Type.Union([Type.Number(), Type.Null()], { 
        description: "Parent role ID for hierarchy" 
    }),
    created_by: Type.Union([Type.String(), Type.Null()], { 
        description: "User ID who created this role" 
    }),
    updated_by: Type.Union([Type.String(), Type.Null()], { 
        description: "User ID who last updated this role" 
    }),
    created_at: Type.String({ format: "date-time", description: "Creation timestamp" }),
    updated_at: Type.String({ format: "date-time", description: "Last update timestamp" }),
    userCount: Type.Number({ description: "Number of users assigned to this role" }),
    permissions: Type.Array(PermissionSchema, { 
        description: "Array of permissions granted to this role" 
    })
}, {
    additionalProperties: false,
    description: "A role with associated permissions and hierarchy support"
})

// Query parameters for listing roles
export const ListRolesQuerySchema = Type.Object({
    page: Type.Optional(Type.Number({ minimum: 1, description: "Page number for pagination" })),
    pageSize: Type.Optional(Type.Number({ minimum: 1, maximum: 100, description: "Number of items per page" })),
    search: Type.Optional(Type.String({ description: "Search term for role names" })),
    includePermissions: Type.Optional(Type.Boolean({ description: "Include permissions in response" })),
    sortBy: Type.Optional(Type.Union([
        Type.Literal('name'),
        Type.Literal('created_at'),
        Type.Literal('updated_at')
    ], { description: "Field to sort by" })),
    sortDirection: Type.Optional(Type.Union([
        Type.Literal('asc'),
        Type.Literal('desc')
    ], { description: "Sort direction" }))
}, {
    additionalProperties: false,
    description: "Query parameters for listing roles"
})

// Response schema for GET /roles
export const ListRolesResponseSchema = Type.Object({
    roles: Type.Array(RoleSchema, { 
        description: "Array of roles in the system" 
    }),
    pagination: Type.Object({
        page: Type.Number({ description: "Current page number" }),
        pageSize: Type.Number({ description: "Number of items per page" }),
        total: Type.Number({ description: "Total number of roles" }),
        totalPages: Type.Number({ description: "Total number of pages" })
    }, { description: "Pagination information" })
}, {
    additionalProperties: false,
    description: "Response containing paginated list of roles"
})

// Request schema for creating a role
export const CreateRoleRequestSchema = Type.Object({
    name: Type.String({ 
        minLength: 1, 
        maxLength: 100, 
        description: "Name of the role (must be unique)" 
    }),
    description: Type.Optional(Type.String({ 
        maxLength: 500, 
        description: "Description of the role's purpose" 
    })),
    parent_role_id: Type.Optional(Type.Number({ 
        description: "Parent role ID for hierarchy" 
    })),
    permissions: Type.Optional(Type.Array(Type.Number(), { 
        description: "Array of permission IDs to assign to this role" 
    }))
}, {
    additionalProperties: false,
    description: "Request body for creating a new role"
})

// Response schema for creating a role
export const CreateRoleResponseSchema = RoleSchema

// Parameters schema for role operations
export const RoleParamsSchema = Type.Object({
    id: Type.Number({ description: "Role ID" })
}, {
    additionalProperties: false,
    description: "URL parameters for role operations"
})

// Request schema for updating a role
export const UpdateRoleRequestSchema = Type.Object({
    name: Type.Optional(Type.String({ 
        minLength: 1, 
        maxLength: 100, 
        description: "Name of the role (must be unique)" 
    })),
    description: Type.Optional(Type.Union([Type.String({ maxLength: 500 }), Type.Null()], { 
        description: "Description of the role's purpose" 
    })),
    parent_role_id: Type.Optional(Type.Union([Type.Number(), Type.Null()], { 
        description: "Parent role ID for hierarchy" 
    }))
}, {
    additionalProperties: false,
    description: "Request body for updating a role"
})

// Response schema for updating a role
export const UpdateRoleResponseSchema = RoleSchema

// Response schema for getting a single role
export const GetRoleResponseSchema = RoleSchema

// Request schema for updating role permissions
export const UpdateRolePermissionsRequestSchema = Type.Object({
    permissions: Type.Array(Type.Number(), { 
        description: "Array of permission IDs to assign to this role" 
    })
}, {
    additionalProperties: false,
    description: "Request body for updating role permissions"
})

// Response schema for getting role permissions
export const GetRolePermissionsResponseSchema = Type.Object({
    role_id: Type.Number({ description: "Role ID" }),
    permissions: Type.Array(PermissionSchema, { 
        description: "Array of permissions assigned to this role" 
    })
}, {
    additionalProperties: false,
    description: "Response containing role permissions"
})

// Response schema for updating role permissions
export const UpdateRolePermissionsResponseSchema = GetRolePermissionsResponseSchema

// Legacy schema for backward compatibility
export const RolesListResponseSchema = Type.Object({
    roles: Type.Array(RoleSchema, { 
        description: "Array of all roles in the system" 
    })
}, {
    additionalProperties: false,
    description: "Response containing list of all roles"
})

