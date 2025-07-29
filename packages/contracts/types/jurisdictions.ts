import { type Static } from "@sinclair/typebox"
import {
    JurisdictionSchema,
    CreateJurisdictionRequestSchema,
    UpdateJurisdictionRequestSchema,
    JurisdictionParamsSchema,
    JurisdictionQuerySchema,
    JurisdictionListResponseSchema,
    JurisdictionDetailResponseSchema,
    CreateJurisdictionResponseSchema,
    UpdateJurisdictionResponseSchema
} from "../schemas/jurisdictions.js"

/**
 * Jurisdiction entity representing a regulatory jurisdiction in the system.
 *
 * @description Jurisdictions define regulatory bodies and regions that govern
 * content and operations across different geographical locations and legal frameworks.
 * Examples include UKGC (UK), MGA (Malta), DGOJ (Spain), etc.
 *
 * @example
 * ```typescript
 * const jurisdiction: Jurisdiction = {
 *   id: 1,
 *   code: "UKGC",
 *   name: "UK Gambling Commission",
 *   description: "The statutory body responsible for regulating commercial gambling in Great Britain",
 *   status: "active",
 *   region: "Europe",
 *   createdAt: "2024-01-15T10:30:00Z",
 *   updatedAt: "2024-01-15T10:30:00Z"
 * }
 * ```
 */
export type Jurisdiction = Static<typeof JurisdictionSchema>

/**
 * Request payload for creating a new jurisdiction.
 *
 * @description Data required to create a jurisdiction. The jurisdiction code must be
 * unique across the system and follow the standard format (uppercase alphanumeric).
 *
 * @example
 * ```typescript
 * const request: CreateJurisdictionRequest = {
 *   code: "MGA",
 *   name: "Malta Gaming Authority",
 *   description: "The single regulator for all gaming activities in Malta",
 *   status: "active",
 *   region: "Europe"
 * }
 * ```
 */
export type CreateJurisdictionRequest = Static<typeof CreateJurisdictionRequestSchema>

/**
 * Request payload for updating an existing jurisdiction.
 *
 * @description Data for updating a jurisdiction. All fields are optional to support
 * partial updates. Code changes should be done carefully as they may affect existing
 * brand relationships and translations.
 *
 * @example
 * ```typescript
 * const request: UpdateJurisdictionRequest = {
 *   description: "Updated regulatory information for Malta Gaming Authority",
 *   status: "active"
 * }
 * ```
 */
export type UpdateJurisdictionRequest = Static<typeof UpdateJurisdictionRequestSchema>

/**
 * Path parameters for jurisdiction identification.
 *
 * @description Used in routes that target specific jurisdictions by ID.
 *
 * @example
 * ```typescript
 * const params: JurisdictionParams = {
 *   id: 42
 * }
 * ```
 */
export type JurisdictionParams = Static<typeof JurisdictionParamsSchema>

/**
 * Query parameters for jurisdiction listing, search, and filtering.
 *
 * @description Supports pagination, text-based search across jurisdiction
 * codes, names, and regions, plus filtering by status and region for
 * efficient jurisdiction discovery and management.
 *
 * @example
 * ```typescript
 * const query: JurisdictionQuery = {
 *   page: 1,
 *   pageSize: 20,
 *   search: "gambling",
 *   status: "active",
 *   region: "Europe"
 * }
 * ```
 */
export type JurisdictionQuery = Static<typeof JurisdictionQuerySchema>

/**
 * Response containing list of jurisdictions.
 *
 * @description Array of jurisdiction entities returned from list operations,
 * potentially filtered and paginated based on query parameters.
 */
export type JurisdictionListResponse = Static<typeof JurisdictionListResponseSchema>

/**
 * Response containing single jurisdiction details.
 *
 * @description Full jurisdiction information returned from detail operations.
 */
export type JurisdictionDetailResponse = Static<typeof JurisdictionDetailResponseSchema>

/**
 * Response after successfully creating a jurisdiction.
 *
 * @description Returns the newly created jurisdiction with generated ID and
 * confirmed field values including timestamps.
 */
export type CreateJurisdictionResponse = Static<typeof CreateJurisdictionResponseSchema>

/**
 * Response after successfully updating a jurisdiction.
 *
 * @description Returns the updated jurisdiction with all current field values
 * including updated timestamp.
 */
export type UpdateJurisdictionResponse = Static<typeof UpdateJurisdictionResponseSchema>