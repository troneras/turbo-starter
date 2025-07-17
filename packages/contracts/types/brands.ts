import { type Static } from "@sinclair/typebox"
import {
    BrandSchema,
    LocaleSchema,
    BrandWithLocalesSchema,
    CreateBrandRequestSchema,
    BrandParamsSchema,
    BrandListResponseSchema,
    BrandDetailResponseSchema,
    CreateBrandResponseSchema
} from "../schemas/brands.js"

/**
 * Basic brand entity representing a content brand.
 * 
 * @description Core brand information used throughout the CMS. A brand represents 
 * a distinct content domain or organization within the platform.
 * 
 * @example
 * ```typescript
 * const brand: Brand = {
 *   id: 1,
 *   name: "Acme Corporation",
 *   description: "Leading provider of innovative solutions"
 * }
 * ```
 */
export type Brand = Static<typeof BrandSchema>

/**
 * Locale configuration for internationalization.
 * 
 * @description Represents a language/region combination supported by the CMS.
 * Used to manage multilingual content and localization.
 * 
 * @example
 * ```typescript
 * const locale: Locale = {
 *   id: 1,
 *   code: "en-US",
 *   name: "English (United States)"
 * }
 * ```
 */
export type Locale = Static<typeof LocaleSchema>

/**
 * Brand entity enriched with associated locale information.
 * 
 * @description Extended brand object that includes all supported locales for 
 * content management. Used in detailed brand views and content creation workflows.
 * 
 * @example
 * ```typescript
 * const brandWithLocales: BrandWithLocales = {
 *   id: 1,
 *   name: "Global News",
 *   description: "International news and media platform",
 *   locales: [
 *     { id: 1, code: "en-US", name: "English (United States)" },
 *     { id: 2, code: "es-ES", name: "Spanish (Spain)" },
 *     { id: 3, code: "fr-FR", name: "French (France)" }
 *   ]
 * }
 * ```
 */
export type BrandWithLocales = Static<typeof BrandWithLocalesSchema>

/**
 * Request payload for creating a new brand.
 * 
 * @description Data required to create a new brand. Name must be unique across 
 * the platform. Description is optional but recommended for clarity.
 * 
 * @example
 * ```typescript
 * const request: CreateBrandRequest = {
 *   name: "TechStartup Inc",
 *   description: "Innovative technology solutions for modern businesses"
 * }
 * ```
 */
export type CreateBrandRequest = Static<typeof CreateBrandRequestSchema>

/**
 * Path parameters for brand-specific operations.
 * 
 * @description Contains the brand ID from the URL path for operations targeting 
 * a specific brand.
 * 
 * @example
 * ```typescript
 * const params: BrandParams = {
 *   id: 42
 * }
 * ```
 */
export type BrandParams = Static<typeof BrandParamsSchema>

/**
 * Response containing a list of all brands.
 * 
 * @description Array of all brands in the system. Used for brand selection 
 * interfaces and administrative overviews.
 * 
 * @example
 * ```typescript
 * const response: BrandListResponse = [
 *   {
 *     id: 1,
 *     name: "Brand A", 
 *     description: "First brand"
 *   },
 *   {
 *     id: 2,
 *     name: "Brand B",
 *     description: null
 *   }
 * ]
 * ```
 */
export type BrandListResponse = Static<typeof BrandListResponseSchema>

/**
 * Detailed brand information including associated locales.
 * 
 * @description Complete brand details with locale associations. Used when 
 * displaying comprehensive brand information or setting up content workflows.
 * 
 * @example
 * ```typescript
 * const response: BrandDetailResponse = {
 *   id: 1,
 *   name: "International Corp",
 *   description: "Global business solutions",
 *   locales: [
 *     { id: 1, code: "en-US", name: "English (United States)" },
 *     { id: 5, code: "de-DE", name: "German (Germany)" }
 *   ]
 * }
 * ```
 */
export type BrandDetailResponse = Static<typeof BrandDetailResponseSchema>

/**
 * Response after successfully creating a new brand.
 * 
 * @description Returns the newly created brand's information including the 
 * assigned ID.
 * 
 * @example
 * ```typescript
 * const response: CreateBrandResponse = {
 *   id: 15,
 *   name: "New Brand",
 *   description: "Newly created brand for content management"
 * }
 * ```
 */
export type CreateBrandResponse = Static<typeof CreateBrandResponseSchema> 