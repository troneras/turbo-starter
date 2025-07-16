import { Type, type Static } from "@sinclair/typebox"

// Permission schema
export const PermissionSchema = Type.Object({
    id: Type.Number({ description: "Unique identifier for the permission" }),
    name: Type.String({ description: "Name of the permission" }),
    description: Type.Union([Type.String(), Type.Null()], { 
        description: "Description of what this permission allows" 
    }),
    resource: Type.String({ description: "Resource the permission applies to" }),
    action: Type.String({ description: "Action the permission allows" })
}, {
    additionalProperties: false,
    description: "A permission that can be granted to a role"
})

// Role schema
export const RoleSchema = Type.Object({
    id: Type.Number({ description: "Unique identifier for the role" }),
    name: Type.String({ description: "Name of the role" }),
    permissions: Type.Array(PermissionSchema, { 
        description: "Array of permissions granted to this role" 
    })
}, {
    additionalProperties: false,
    description: "A role with associated permissions"
})

// Response schema for GET /roles
export const RolesListResponseSchema = Type.Object({
    roles: Type.Array(RoleSchema, { 
        description: "Array of all roles in the system" 
    })
}, {
    additionalProperties: false,
    description: "Response containing list of all roles"
})

// TypeScript types
export type Permission = Static<typeof PermissionSchema>
export type Role = Static<typeof RoleSchema>
export type RolesListResponse = Static<typeof RolesListResponseSchema>