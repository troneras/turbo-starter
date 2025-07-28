import { type Static } from "@sinclair/typebox"
import {
    LanguageSchema,
    CreateLanguageRequestSchema,
    UpdateLanguageRequestSchema,
    LanguageParamsSchema,
    LanguageQuerySchema,
    LanguageListResponseSchema,
    LanguageDetailResponseSchema,
    CreateLanguageResponseSchema,
    UpdateLanguageResponseSchema
} from "../schemas/languages.js"

/**
 * Language entity representing a locale in the system.
 *
 * @description Languages define locale codes and display names used throughout
 * the CMS platform for multi-language content management.
 *
 * @example
 * ```typescript
 * const language: Language = {
 *   id: 1,
 *   code: "en-US",
 *   name: "English (United States)"
 * }
 * ```
 */
export type Language = Static<typeof LanguageSchema>

/**
 * Request payload for creating a new language.
 *
 * @description Data required to create a language. The language code must follow
 * the standard locale format (xx-XX) and be unique across the system.
 *
 * @example
 * ```typescript
 * const request: CreateLanguageRequest = {
 *   code: "es-ES",
 *   name: "Spanish (Spain)"
 * }
 * ```
 */
export type CreateLanguageRequest = Static<typeof CreateLanguageRequestSchema>

/**
 * Request payload for updating an existing language.
 *
 * @description Data for updating a language. All fields are optional to support
 * partial updates. Language code changes should be done carefully as they may
 * affect existing translations.
 *
 * @example
 * ```typescript
 * const request: UpdateLanguageRequest = {
 *   name: "Spanish (Spain) - Updated"
 * }
 * ```
 */
export type UpdateLanguageRequest = Static<typeof UpdateLanguageRequestSchema>

/**
 * Path parameters for language identification.
 *
 * @description Used in routes that target specific languages by ID.
 *
 * @example
 * ```typescript
 * const params: LanguageParams = {
 *   id: 42
 * }
 * ```
 */
export type LanguageParams = Static<typeof LanguageParamsSchema>

/**
 * Query parameters for language listing and search.
 *
 * @description Supports pagination and text-based search across language
 * codes and names for efficient language discovery.
 *
 * @example
 * ```typescript
 * const query: LanguageQuery = {
 *   page: 2,
 *   pageSize: 10,
 *   search: "english"
 * }
 * ```
 */
export type LanguageQuery = Static<typeof LanguageQuerySchema>

/**
 * Response containing list of languages.
 *
 * @description Array of language entities returned from list operations,
 * potentially filtered and paginated based on query parameters.
 */
export type LanguageListResponse = Static<typeof LanguageListResponseSchema>

/**
 * Response containing single language details.
 *
 * @description Full language information returned from detail operations.
 */
export type LanguageDetailResponse = Static<typeof LanguageDetailResponseSchema>

/**
 * Response after successfully creating a language.
 *
 * @description Returns the newly created language with generated ID and
 * confirmed field values.
 */
export type CreateLanguageResponse = Static<typeof CreateLanguageResponseSchema>

/**
 * Response after successfully updating a language.
 *
 * @description Returns the updated language with all current field values.
 */
export type UpdateLanguageResponse = Static<typeof UpdateLanguageResponseSchema>