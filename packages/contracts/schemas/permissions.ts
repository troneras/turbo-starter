import { Type } from "@sinclair/typebox"
import {
    ErrorResponseSchema,
    UnauthorizedErrorSchema,
    ForbiddenErrorSchema,
    NotFoundErrorSchema,
    ConflictErrorSchema,
    BadRequestErrorSchema
} from "./common.js"

// Base permission schema
export const PermissionSchema = Type.Object({
    id: Type.Number({ description: "Unique identifier for the permission" }),
    name: Type.String({ description: "Name of the permission (e.g., 'users:create')" }),
    description: Type.Union([Type.String(), Type.Null()], { 
        description: "Human-readable description of what this permission allows" 
    }),
    resource: Type.String({ description: "Resource the permission applies to (e.g., 'users', 'roles')" }),
    action: Type.String({ description: "Action the permission allows (e.g., 'create', 'read', 'update')" }),
    category: Type.String({ description: "Category grouping for UI organization (e.g., 'users', 'content')" }),
    created_at: Type.String({ format: "date-time", description: "Creation timestamp" }),
    updated_at: Type.String({ format: "date-time", description: "Last update timestamp" })
}, {
    additionalProperties: false,
    description: "A permission that defines a specific capability in the system"
})

// Query parameters for listing permissions
export const ListPermissionsQuerySchema = Type.Object({
    page: Type.Optional(Type.Number({ minimum: 1, description: "Page number for pagination" })),
    pageSize: Type.Optional(Type.Number({ minimum: 1, maximum: 100, description: "Number of items per page" })),
    search: Type.Optional(Type.String({ description: "Search term for permission names or descriptions" })),
    category: Type.Optional(Type.String({ description: "Filter by permission category" })),
    sortBy: Type.Optional(Type.Union([
        Type.Literal('name'),
        Type.Literal('category'),
        Type.Literal('created_at'),
        Type.Literal('updated_at')
    ], { description: "Field to sort by" })),
    sortDirection: Type.Optional(Type.Union([
        Type.Literal('asc'),
        Type.Literal('desc')
    ], { description: "Sort direction" }))
}, {
    additionalProperties: false,
    description: "Query parameters for listing permissions"
})

// Response schema for GET /permissions
export const ListPermissionsResponseSchema = Type.Object({
    permissions: Type.Array(PermissionSchema, { 
        description: "Array of permissions in the system" 
    }),
    pagination: Type.Object({
        page: Type.Number({ description: "Current page number" }),
        pageSize: Type.Number({ description: "Number of items per page" }),
        total: Type.Number({ description: "Total number of permissions" }),
        totalPages: Type.Number({ description: "Total number of pages" })
    }, { description: "Pagination information" })
}, {
    additionalProperties: false,
    description: "Response containing paginated list of permissions"
})

// Request schema for creating a permission
export const CreatePermissionRequestSchema = Type.Object({
    name: Type.String({ 
        minLength: 1, 
        maxLength: 255, 
        description: "Name of the permission (must be unique, e.g., 'users:create')" 
    }),
    description: Type.Optional(Type.String({ 
        maxLength: 500, 
        description: "Description of what this permission allows" 
    })),
    resource: Type.String({ 
        minLength: 1, 
        maxLength: 100, 
        description: "Resource the permission applies to (e.g., 'users', 'roles')" 
    }),
    action: Type.String({ 
        minLength: 1, 
        maxLength: 100, 
        description: "Action the permission allows (e.g., 'create', 'read', 'update')" 
    }),
    category: Type.String({ 
        minLength: 1, 
        maxLength: 100, 
        description: "Category grouping for UI organization (e.g., 'users', 'content')" 
    })
}, {
    additionalProperties: false,
    description: "Request body for creating a new permission"
})

// Response schema for creating a permission
export const CreatePermissionResponseSchema = PermissionSchema

// Parameters schema for permission operations
export const PermissionParamsSchema = Type.Object({
    id: Type.Number({ description: "Permission ID" })
}, {
    additionalProperties: false,
    description: "URL parameters for permission operations"
})

// Request schema for updating a permission
export const UpdatePermissionRequestSchema = Type.Object({
    name: Type.Optional(Type.String({ 
        minLength: 1, 
        maxLength: 255, 
        description: "Name of the permission (must be unique)" 
    })),
    description: Type.Optional(Type.Union([Type.String({ maxLength: 500 }), Type.Null()], { 
        description: "Description of what this permission allows" 
    })),
    resource: Type.Optional(Type.String({ 
        minLength: 1, 
        maxLength: 100, 
        description: "Resource the permission applies to" 
    })),
    action: Type.Optional(Type.String({ 
        minLength: 1, 
        maxLength: 100, 
        description: "Action the permission allows" 
    })),
    category: Type.Optional(Type.String({ 
        minLength: 1, 
        maxLength: 100, 
        description: "Category grouping for UI organization" 
    }))
}, {
    additionalProperties: false,
    description: "Request body for updating a permission"
})

// Response schema for updating a permission
export const UpdatePermissionResponseSchema = PermissionSchema

// Response schema for getting a single permission
export const GetPermissionResponseSchema = PermissionSchema

// Re-export common error schemas
export {
    ErrorResponseSchema,
    UnauthorizedErrorSchema,
    ForbiddenErrorSchema,
    NotFoundErrorSchema,
    ConflictErrorSchema,
    BadRequestErrorSchema
}