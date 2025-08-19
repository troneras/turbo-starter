import { Type } from "@sinclair/typebox"
import {
    ErrorResponseSchema,
    UnauthorizedErrorSchema,
    ForbiddenErrorSchema,
    NotFoundErrorSchema,
    ConflictErrorSchema,
    BadRequestErrorSchema
} from "./common.js"

// Base language schema (corresponds to locales table)
export const LanguageSchema = Type.Object({
    id: Type.Number({ description: "Unique language identifier" }),
    code: Type.String({ description: "Language code (e.g., en-US, fr-FR, es-ES)" }),
    name: Type.String({ description: "Human-readable language name" }),
    source: Type.Boolean({ description: "Whether this is the source language (only one can be source)" })
}, {
    description: "Language entity representing a locale"
})

// Request schemas
export const CreateLanguageRequestSchema = Type.Object({
    code: Type.String({
        pattern: "^[a-z]{2}-[A-Z]{2}$",
        description: "Language code in format xx-XX (e.g., en-US, fr-FR) - must be unique"
    }),
    name: Type.String({
        minLength: 1,
        description: "Human-readable language name (e.g., English (United States), French (France))"
    }),
    source: Type.Optional(Type.Boolean({
        description: "Set as source language (optional, only one source language allowed)"
    }))
}, {
    additionalProperties: false,
    description: "Request body for creating a new language - provide language code and display name. Source can only be set if no source language exists."
})

export const UpdateLanguageRequestSchema = Type.Object({
    code: Type.Optional(Type.String({
        pattern: "^[a-z]{2}-[A-Z]{2}$",
        description: "Language code in format xx-XX (e.g., en-US, fr-FR)"
    })),
    name: Type.Optional(Type.String({
        minLength: 1,
        description: "Human-readable language name"
    }))
    // Note: source field is intentionally excluded - source language cannot be changed once set
}, {
    additionalProperties: false,
    description: "Request body for updating an existing language - all fields are optional. Source language status cannot be changed."
})

export const LanguageParamsSchema = Type.Object({
    id: Type.Number({ description: "Language ID" })
}, {
    description: "Path parameters for language operations"
})

export const LanguageQuerySchema = Type.Object({
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
        description: "Search term to filter languages by code or name"
    }))
}, {
    description: "Query parameters for listing languages with pagination and search"
})

// Response schemas
export const LanguageListResponseSchema = Type.Array(LanguageSchema, {
    description: "Array of all languages with pagination"
})

export const LanguageDetailResponseSchema = LanguageSchema

export const CreateLanguageResponseSchema = LanguageSchema

export const UpdateLanguageResponseSchema = LanguageSchema

// Re-export common error schemas
export {
    ErrorResponseSchema,
    UnauthorizedErrorSchema,
    ForbiddenErrorSchema,
    NotFoundErrorSchema,
    ConflictErrorSchema,
    BadRequestErrorSchema
}