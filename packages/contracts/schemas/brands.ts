import { Type } from "@sinclair/typebox"

// Base brand schema
export const BrandSchema = Type.Object({
    id: Type.Number({ description: "Unique brand identifier" }),
    name: Type.String({ description: "Brand name" }),
    description: Type.Union([Type.String(), Type.Null()], { description: "Brand description" })
}, {
    description: "Brand entity"
})

// Locale schema for brand locales
export const LocaleSchema = Type.Object({
    id: Type.Number({ description: "Unique locale identifier" }),
    code: Type.String({ description: "Locale code (e.g., en-US, fr-FR)" }),
    name: Type.String({ description: "Human-readable locale name" })
}, {
    description: "Locale entity"
})

// Brand with locales (for detailed view)
export const BrandWithLocalesSchema = Type.Object({
    id: Type.Number({ description: "Unique brand identifier" }),
    name: Type.String({ description: "Brand name" }),
    description: Type.Union([Type.String(), Type.Null()], { description: "Brand description" }),
    locales: Type.Array(LocaleSchema, { description: "Array of locales associated with this brand" })
}, {
    description: "Brand entity with associated locales"
})

// Request schemas
export const CreateBrandRequestSchema = Type.Object({
    name: Type.String({ description: "Brand name (must be unique)" }),
    description: Type.Optional(Type.String({ description: "Brand description" }))
}, {
    additionalProperties: false,
    description: "Request body for creating a new brand"
})

export const BrandParamsSchema = Type.Object({
    id: Type.Number({ description: "Brand ID" })
}, {
    description: "Path parameters for brand operations"
})

// Response schemas
export const BrandListResponseSchema = Type.Array(BrandSchema, {
    description: "Array of all brands"
})

export const BrandDetailResponseSchema = BrandWithLocalesSchema

export const CreateBrandResponseSchema = BrandSchema

