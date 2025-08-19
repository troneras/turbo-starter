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
    UpdateTranslationRequestSchema,
    CreateUnifiedTranslationRequestSchema,
    UnifiedTranslationResponseSchema,
    BatchTranslationItemSchema,
    BatchTranslationRequestSchema,
    BatchTranslationResultSchema,
    TranslationCsvImportRequestSchema
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
 *   entityKey: "checkout.button.confirm",
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
 *   entityKey: "checkout.button.confirm",
 *   localeId: 1, // Reference to locales table
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
 *   }
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

// ── Unified Translation Operations ──────────────────────────────────

/**
 * Request to create a translation with key and default variant in a single operation.
 * 
 * @description This unified endpoint simplifies translation creation by allowing
 * clients to create both the translation key and its default variant (plus optional
 * additional variants) in a single transaction.
 * 
 * @example
 * ```typescript
 * const request: CreateUnifiedTranslationRequest = {
 *   entityKey: "checkout.button.confirm",
 *   description: "Confirm button in checkout flow",
 *   defaultValue: "Confirm Purchase",
 *   defaultLocaleId: 1, // en-US
 *   brandId: 2,
 *   additionalVariants: [
 *     {
 *       localeId: 3, // es-ES
 *       value: "Confirmar Compra"
 *     }
 *   ]
 * }
 * ```
 */
export type CreateUnifiedTranslationRequest = Static<typeof CreateUnifiedTranslationRequestSchema>

/**
 * Response for unified translation creation.
 * 
 * @description Contains the created translation key and all created variants.
 */
export type UnifiedTranslationResponse = Static<typeof UnifiedTranslationResponseSchema>

// ── Batch Translation Operations ──────────────────────────────────

/**
 * Individual translation item for batch operations.
 */
export type BatchTranslationItem = Static<typeof BatchTranslationItemSchema>

/**
 * Request to batch create/update translations.
 * 
 * @description Allows bulk operations for importing translations,
 * particularly useful for CSV imports and large dataset operations.
 * 
 * @example
 * ```typescript
 * const request: BatchTranslationRequest = {
 *   translations: [
 *     {
 *       entityKey: "app.welcome.title",
 *       description: "Welcome page title",
 *       localeId: 1,
 *       value: "Welcome to our app"
 *     },
 *     {
 *       entityKey: "app.welcome.title",
 *       localeId: 3,
 *       value: "Bienvenido a nuestra aplicación"
 *     }
 *   ],
 *   defaultBrandId: 2,
 *   createMissingKeys: true
 * }
 * ```
 */
export type BatchTranslationRequest = Static<typeof BatchTranslationRequestSchema>

/**
 * Result of batch translation operation.
 * 
 * @description Provides detailed information about the batch operation
 * including success/failure counts and any errors encountered.
 */
export type BatchTranslationResult = Static<typeof BatchTranslationResultSchema>

/**
 * Request to import translations from CSV.
 * 
 * @description Specialized endpoint for CSV imports with configurable
 * column mapping and import options.
 * 
 * @example
 * ```typescript
 * const request: TranslationCsvImportRequest = {
 *   csvContent: "key,locale,value\napp.title,en-US,My App\napp.title,es-ES,Mi Aplicación",
 *   defaultBrandId: 2,
 *   csvOptions: {
 *     delimiter: ",",
 *     hasHeader: true,
 *     keyColumn: "key",
 *     localeColumn: "locale",
 *     valueColumn: "value"
 *   }
 * }
 * ```
 */
export type TranslationCsvImportRequest = Static<typeof TranslationCsvImportRequestSchema>