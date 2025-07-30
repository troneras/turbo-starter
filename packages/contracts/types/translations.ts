import { type Static } from "@sinclair/typebox"
import {
    TranslationStatus,
    TranslationKeySchema,
    TranslationVariantSchema,
    TranslationKeyTreeNodeSchema,
    CreateTranslationKeyRequestSchema,
    UpdateTranslationKeyRequestSchema,
    CreateTranslationVariantRequestSchema,
    UpdateTranslationVariantRequestSchema,
    UpdateTranslationStatusRequestSchema,
    TranslationKeyQuerySchema,
    TranslationQuerySchema,
    TranslationKeyListResponseSchema,
    TranslationListResponseSchema,
    TranslationStatsResponseSchema,
    TranslationImportRequestSchema,
    TranslationExportQuerySchema,
    TranslationLookupRequestSchema,
    TranslationLookupResponseSchema,
    CreateTranslationRequestSchema,
    UpdateTranslationRequestSchema
} from "../schemas/translations.js"

/**
 * Translation status enumeration.
 * 
 * @description Represents the approval workflow state of a translation.
 * 
 * - DRAFT: Initial state, being edited
 * - PENDING: Submitted for review
 * - APPROVED: Approved and ready for use
 */
export type TranslationStatus = Static<typeof TranslationStatus>

/**
 * Translation key entity.
 * 
 * @description Represents a unique translation key in the system using
 * dotted path notation (e.g., "checkout.button.confirm").
 * 
 * @example
 * ```typescript
 * const key: TranslationKey = {
 *   id: 123,
 *   fullKey: "checkout.button.confirm",
 *   description: "Confirm button in checkout flow",
 *   createdBy: "550e8400-e29b-41d4-a716-446655440000",
 *   createdAt: "2025-07-30T10:00:00Z"
 * }
 * ```
 */
export type TranslationKey = Static<typeof TranslationKeySchema>

/**
 * Translation variant entity.
 * 
 * @description Represents a translated value for a specific key, locale,
 * and optional brand. Supports brand-specific overrides with fallback.
 * 
 * @example
 * ```typescript
 * const translation: TranslationVariant = {
 *   id: 456,
 *   keyId: 123,
 *   fullKey: "checkout.button.confirm",
 *   locale: "en-US",
 *   brandId: null, // Generic translation
 *   value: "Confirm Order",
 *   status: "APPROVED",
 *   metadata: {
 *     maxLength: 20,
 *     comments: "Keep it short for mobile"
 *   },
 *   createdBy: "550e8400-e29b-41d4-a716-446655440000",
 *   createdAt: "2025-07-30T10:00:00Z",
 *   approvedBy: "660e8400-e29b-41d4-a716-446655440001",
 *   approvedAt: "2025-07-30T11:00:00Z"
 * }
 * ```
 */
export type TranslationVariant = Static<typeof TranslationVariantSchema>

/**
 * Translation key tree node.
 * 
 * @description Used for hierarchical navigation in the UI.
 */
export type TranslationKeyTreeNode = Static<typeof TranslationKeyTreeNodeSchema>

/**
 * Request to create a new translation key.
 */
export type CreateTranslationKeyRequest = Static<typeof CreateTranslationKeyRequestSchema>

/**
 * Request to update a translation key.
 */
export type UpdateTranslationKeyRequest = Static<typeof UpdateTranslationKeyRequestSchema>

/**
 * Request to create a new translation variant.
 */
export type CreateTranslationVariantRequest = Static<typeof CreateTranslationVariantRequestSchema>

/**
 * Request to update a translation variant.
 */
export type UpdateTranslationVariantRequest = Static<typeof UpdateTranslationVariantRequestSchema>

/**
 * Request to update translation status.
 */
export type UpdateTranslationStatusRequest = Static<typeof UpdateTranslationStatusRequestSchema>

/**
 * Query parameters for listing translation keys.
 */
export type TranslationKeyQuery = Static<typeof TranslationKeyQuerySchema>

/**
 * Query parameters for listing translations.
 */
export type TranslationQuery = Static<typeof TranslationQuerySchema>

/**
 * Response for translation key list with optional tree structure.
 */
export type TranslationKeyListResponse = Static<typeof TranslationKeyListResponseSchema>

/**
 * Response for translation list.
 */
export type TranslationListResponse = Static<typeof TranslationListResponseSchema>

/**
 * Translation statistics response.
 */
export type TranslationStatsResponse = Static<typeof TranslationStatsResponseSchema>

/**
 * Translation statistics.
 */
export type TranslationStats = TranslationStatsResponse

/**
 * Request to import translations.
 */
export type TranslationImportRequest = Static<typeof TranslationImportRequestSchema>

/**
 * Query parameters for exporting translations.
 */
export type TranslationExportQuery = Static<typeof TranslationExportQuerySchema>

/**
 * Request to lookup a single translation.
 */
export type TranslationLookupRequest = Static<typeof TranslationLookupRequestSchema>

/**
 * Translation lookup result.
 */
export type TranslationLookupResponse = Static<typeof TranslationLookupResponseSchema>

/**
 * Request to create a new translation.
 */
export type CreateTranslationRequest = Static<typeof CreateTranslationRequestSchema>

/**
 * Request to update a translation.
 */
export type UpdateTranslationRequest = Static<typeof UpdateTranslationRequestSchema>