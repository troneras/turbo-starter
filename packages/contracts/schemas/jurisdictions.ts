import { Type } from "@sinclair/typebox"
import {
    ErrorResponseSchema,
    UnauthorizedErrorSchema,
    ForbiddenErrorSchema,
    NotFoundErrorSchema,
    ConflictErrorSchema,
    BadRequestErrorSchema
} from "./common.js"

// Base jurisdiction schema (corresponds to jurisdictions table)
export const JurisdictionSchema = Type.Object({
    id: Type.Number({ description: "Unique jurisdiction identifier" }),
    code: Type.String({ description: "Jurisdiction code (e.g., UKGC, MGA, DGOJ)" }),
    name: Type.String({ description: "Human-readable jurisdiction name" }),
    description: Type.Union([Type.String(), Type.Null()], { description: "Detailed description of the jurisdiction" }),
    status: Type.String({ 
        enum: ["active", "inactive"],
        description: "Jurisdiction status - active or inactive" 
    }),
    region: Type.Union([Type.String(), Type.Null()], { description: "Geographic region (e.g., Europe, North America)" }),
    createdAt: Type.String({ 
        format: "date-time",
        description: "ISO 8601 timestamp when jurisdiction was created" 
    }),
    updatedAt: Type.String({ 
        format: "date-time",
        description: "ISO 8601 timestamp when jurisdiction was last updated" 
    })
}, {
    description: "Jurisdiction entity representing a regulatory jurisdiction"
})

// Request schemas
export const CreateJurisdictionRequestSchema = Type.Object({
    code: Type.String({ 
        minLength: 1,
        maxLength: 20,
        pattern: "^[A-Z0-9_-]+$",
        description: "Jurisdiction code (e.g., UKGC, MGA, DGOJ) - must be unique, uppercase alphanumeric with underscores and hyphens allowed" 
    }),
    name: Type.String({ 
        minLength: 1,
        description: "Human-readable jurisdiction name (e.g., UK Gambling Commission, Malta Gaming Authority)" 
    }),
    description: Type.Optional(Type.String({ 
        description: "Detailed description of the jurisdiction and its regulatory scope" 
    })),
    status: Type.Optional(Type.String({ 
        enum: ["active", "inactive"],
        default: "active",
        description: "Jurisdiction status - defaults to active" 
    })),
    region: Type.Optional(Type.String({ 
        description: "Geographic region (e.g., Europe, North America, Asia-Pacific)" 
    }))
}, {
    additionalProperties: false,
    description: "Request body for creating a new jurisdiction - provide jurisdiction code and display name"
})

export const UpdateJurisdictionRequestSchema = Type.Object({
    code: Type.Optional(Type.String({ 
        minLength: 1,
        maxLength: 20,
        pattern: "^[A-Z0-9_-]+$",
        description: "Jurisdiction code (e.g., UKGC, MGA, DGOJ)" 
    })),
    name: Type.Optional(Type.String({ 
        minLength: 1,
        description: "Human-readable jurisdiction name" 
    })),
    description: Type.Optional(Type.Union([Type.String(), Type.Null()], { 
        description: "Detailed description of the jurisdiction" 
    })),
    status: Type.Optional(Type.String({ 
        enum: ["active", "inactive"],
        description: "Jurisdiction status" 
    })),
    region: Type.Optional(Type.Union([Type.String(), Type.Null()], { 
        description: "Geographic region" 
    }))
}, {
    additionalProperties: false,
    description: "Request body for updating an existing jurisdiction - all fields are optional"
})

export const JurisdictionParamsSchema = Type.Object({
    id: Type.Number({ description: "Jurisdiction ID" })
}, {
    description: "Path parameters for jurisdiction operations"
})

export const JurisdictionQuerySchema = Type.Object({
    page: Type.Optional(Type.Number({ 
        minimum: 1, 
        default: 1, 
        description: "Page number for pagination (starts at 1)" 
    })),
    pageSize: Type.Optional(Type.Number({ 
        minimum: 1, 
        maximum: 100, 
        default: 20, 
        description: "Number of items per page (max 100)" 
    })),
    search: Type.Optional(Type.String({ 
        description: "Search term to filter jurisdictions by code, name, or region" 
    })),
    status: Type.Optional(Type.String({ 
        enum: ["active", "inactive"],
        description: "Filter by jurisdiction status" 
    })),
    region: Type.Optional(Type.String({ 
        description: "Filter by geographic region" 
    }))
}, {
    description: "Query parameters for listing jurisdictions with pagination, search, and filtering"
})

// Response schemas
export const JurisdictionListResponseSchema = Type.Array(JurisdictionSchema, {
    description: "Array of all jurisdictions with pagination and filtering"
})

export const JurisdictionDetailResponseSchema = JurisdictionSchema

export const CreateJurisdictionResponseSchema = JurisdictionSchema

export const UpdateJurisdictionResponseSchema = JurisdictionSchema

// Re-export common error schemas
export {
    ErrorResponseSchema,
    UnauthorizedErrorSchema,
    ForbiddenErrorSchema,
    NotFoundErrorSchema,
    ConflictErrorSchema,
    BadRequestErrorSchema
}