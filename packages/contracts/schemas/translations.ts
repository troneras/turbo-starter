import { Type } from "@sinclair/typebox"
import { PaginationQuerySchema } from "./common.js"

// Translation status enum
export const TranslationStatus = Type.Union([
  Type.Literal("NEEDS_TRANSLATION"),
  Type.Literal("NEEDS_REVIEW"),
  Type.Literal("APPROVED"),
], {
  description: "Translation approval status"
})

// Translation key schema
export const TranslationKeySchema = Type.Object({
  id: Type.Number({ description: "Entity ID of the translation key" }),
  entityKey: Type.String({
    pattern: "^[a-z0-9_.]+$",
    description: "Dotted path key (e.g., checkout.button.confirm)"
  }),
  description: Type.Union([Type.String(), Type.Null()], {
    description: "Description of the translation key for editors"
  }),
  createdBy: Type.String({ format: "uuid", description: "User who created the key" }),
  createdAt: Type.String({ format: "date-time", description: "Creation timestamp" }),
}, {
  description: "Translation key entity"
})

// Translation variant schema
export const TranslationVariantSchema = Type.Object({
  id: Type.Number({ description: "Entity ID of the translation" }),
  entityKey: Type.String({ description: "The translation key this variant belongs to" }),
  localeId: Type.Number({
    description: "Locale ID referencing the locales table"
  }),
  brandId: Type.Union([Type.Number(), Type.Null()], {
    description: "Brand ID for brand-specific override (null = generic)"
  }),
  value: Type.String({
    maxLength: 1024,
    description: "The translated text"
  }),
  status: TranslationStatus,
  metadata: Type.Optional(Type.Object({
    maxLength: Type.Optional(Type.Number()),
    pluralForms: Type.Optional(Type.Record(Type.String(), Type.String())),
    comments: Type.Optional(Type.String()),
  }, { description: "Additional metadata for the translation" })),
  createdBy: Type.String({ format: "uuid", description: "User who created the translation" }),
  createdAt: Type.String({ format: "date-time", description: "Creation timestamp" }),
  approvedBy: Type.Union([Type.String({ format: "uuid" }), Type.Null()], {
    description: "User who approved the translation"
  }),
  approvedAt: Type.Union([Type.String({ format: "date-time" }), Type.Null()], {
    description: "Approval timestamp"
  }),
}, {
  description: "Translation variant for a specific locale and optional brand"
})


// Request schemas
export const CreateTranslationKeyRequestSchema = Type.Object({
  entityKey: Type.String({
    pattern: "^[a-z0-9_.]+$",
    description: "Dotted path key"
  }),
  description: Type.Optional(Type.String({ description: "Key description" })),
}, {
  additionalProperties: false,
  description: "Request to create a new translation key"
})

export const UpdateTranslationKeyRequestSchema = Type.Object({
  description: Type.Optional(Type.String({ description: "Updated description" })),
}, {
  additionalProperties: false,
  description: "Request to update a translation key"
})

export const CreateTranslationVariantRequestSchema = Type.Object({
  entityKey: Type.String({
    pattern: "^[a-z0-9_.]+$",
    description: "Translation key to create variant for"
  }),
  localeId: Type.Number({
    description: "Locale ID referencing the locales table"
  }),
  brandId: Type.Optional(Type.Number({ description: "Brand ID for brand-specific translation" })),
  value: Type.String({
    maxLength: 1024,
    description: "Translation text"
  }),
  status: Type.Optional(TranslationStatus),
}, {
  additionalProperties: false,
  description: "Request to create a new translation variant"
})

export const UpdateTranslationVariantRequestSchema = Type.Object({
  value: Type.Optional(Type.String({
    maxLength: 1024,
    description: "Updated translation text"
  })),
  status: Type.Optional(TranslationStatus),
}, {
  additionalProperties: false,
  description: "Request to update a translation variant"
})

export const CreateTranslationRequestSchema = Type.Object({
  keyId: Type.Number({ description: "ID of the translation key" }),
  localeId: Type.Number({
    description: "Locale ID referencing the locales table"
  }),
  brandId: Type.Optional(Type.Number({ description: "Brand ID for override" })),
  value: Type.String({
    maxLength: 1024,
    description: "Translation text"
  }),
  status: Type.Optional(TranslationStatus),
  metadata: Type.Optional(Type.Object({
    maxLength: Type.Optional(Type.Number()),
    pluralForms: Type.Optional(Type.Record(Type.String(), Type.String())),
    comments: Type.Optional(Type.String()),
  })),
}, {
  additionalProperties: false,
  description: "Request to create a new translation"
})

export const UpdateTranslationRequestSchema = Type.Object({
  value: Type.Optional(Type.String({
    maxLength: 1024,
    description: "Updated translation text"
  })),
  status: Type.Optional(TranslationStatus),
  metadata: Type.Optional(Type.Object({
    maxLength: Type.Optional(Type.Number()),
    pluralForms: Type.Optional(Type.Record(Type.String(), Type.String())),
    comments: Type.Optional(Type.String()),
  })),
}, {
  additionalProperties: false,
  description: "Request to update a translation"
})

export const UpdateTranslationStatusRequestSchema = Type.Object({
  status: TranslationStatus,
}, {
  additionalProperties: false,
  description: "Request to update translation status"
})

// Query parameter schemas
export const TranslationKeyQuerySchema = Type.Intersect([
  Type.Object({
    parentPath: Type.Optional(Type.String({ description: "Filter by parent path" })),
    depth: Type.Optional(Type.Number({ minimum: 1, default: 1, description: "Depth of key hierarchy to retrieve" })),
    search: Type.Optional(Type.String({ description: "Search term for keys" }))
  }),
  PaginationQuerySchema
], {
  description: "Query parameters for translation keys list endpoint"
})

export const TranslationQuerySchema = Type.Object({
  keyId: Type.Optional(Type.Number({ description: "Filter by translation key ID" })),
  localeId: Type.Optional(Type.Number({ description: "Filter by locale ID" })),
  brandId: Type.Optional(Type.Number({ description: "Filter by brand (0 for generic)" })),
  status: Type.Optional(TranslationStatus),
  search: Type.Optional(Type.String({ description: "Search in translation values" })),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 50 })),
  offset: Type.Optional(Type.Number({ minimum: 0, default: 0 })),
}, {
  additionalProperties: false,
  description: "Query parameters for listing translations"
})

// Tree node schema for hierarchical key display
export const TranslationKeyTreeNodeSchema = Type.Object({
  segment: Type.String({ description: "Key segment at this level" }),
  fullPath: Type.String({ description: "Full path to this node" }),
  isFolder: Type.Boolean({ description: "Whether this node has children" }),
  childCount: Type.Number({ description: "Number of child keys" })
}, {
  description: "Tree node for hierarchical key navigation"
})

// Response schemas
export const TranslationKeyListResponseSchema = Type.Object({
  keys: Type.Array(TranslationKeySchema),
  tree: Type.Optional(Type.Array(TranslationKeyTreeNodeSchema)),
  total: Type.Number(),
  limit: Type.Number(),
  offset: Type.Number(),
}, {
  description: "Paginated list of translation keys"
})

export const TranslationListResponseSchema = Type.Object({
  translations: Type.Array(TranslationVariantSchema),
  total: Type.Number(),
  limit: Type.Number(),
  offset: Type.Number(),
}, {
  description: "Paginated list of translations"
})

export const TranslationStatsResponseSchema = Type.Object({
  totalKeys: Type.Number({ description: "Total number of translation keys" }),
  localeStats: Type.Array(Type.Object({
    localeId: Type.Number({ description: "Locale ID" }),
    localeCode: Type.String({ description: "Locale code (e.g., 'en', 'de')" }),
    localeName: Type.String({ description: "Locale display name" }),
    isSource: Type.Boolean({ description: "Whether this is the source locale" }),
    approvedCount: Type.Number({ description: "Number of approved translations" }),
    needsTranslationCount: Type.Number({ description: "Number of keys needing translation" }),
    needsReviewCount: Type.Number({ description: "Number of translations needing review" }),
    totalVariants: Type.Number({ description: "Total number of translation variants for this locale" }),
    completionPercentage: Type.Number({ description: "Percentage of keys that have translations (approved + needs review)" }),
    approvalPercentage: Type.Number({ description: "Percentage of translated keys that are approved" })
  }), { description: "Statistics per locale" })
}, {
  description: "Translation statistics with per-locale breakdown"
})

// Import/Export schemas
export const TranslationImportRequestSchema = Type.Object({
  format: Type.Union([Type.Literal("json"), Type.Literal("csv")]),
  data: Type.String({ description: "Base64 encoded file content" }),
  brandId: Type.Optional(Type.Number({ description: "Import for specific brand" })),
  overwrite: Type.Optional(Type.Boolean({ default: false, description: "Overwrite existing translations" })),
}, {
  additionalProperties: false,
  description: "Request to import translations"
})

export const TranslationExportQuerySchema = Type.Object({
  format: Type.Union([Type.Literal("json"), Type.Literal("csv")]),
  brandId: Type.Optional(Type.Number({ description: "Export specific brand (0 for generic)" })),
  localeId: Type.Optional(Type.Number({ description: "Export specific locale by ID" })),
  status: Type.Optional(TranslationStatus),
  keysOnly: Type.Optional(Type.Boolean({ default: false, description: "Export only keys without translations" })),
}, {
  additionalProperties: false,
  description: "Query parameters for exporting translations"
})

// Runtime lookup schema
export const TranslationLookupRequestSchema = Type.Object({
  key: Type.String({ description: "Translation key" }),
  localeId: Type.Number({ description: "Locale ID" }),
  brandId: Type.Optional(Type.Number({ description: "Brand ID for override" })),
}, {
  additionalProperties: false,
  description: "Request to lookup a single translation"
})

export const TranslationLookupResponseSchema = Type.Object({
  key: Type.String(),
  localeId: Type.Number(),
  value: Type.Union([Type.String(), Type.Null()]),
  brandSpecific: Type.Boolean(),
}, {
  description: "Translation lookup result"
})

// Additional query schemas for variants
export const TranslationVariantQuerySchema = Type.Intersect([
  Type.Object({
    entityKey: Type.Optional(Type.String({ description: "Filter by entity key" })),
    localeId: Type.Optional(Type.Number({ description: "Filter by locale ID" })),
    brandId: Type.Optional(Type.Number({ description: "Filter by brand ID" })),
    status: Type.Optional(TranslationStatus)
  }),
  PaginationQuerySchema
], {
  description: "Query parameters for translation variants list endpoint"
})

// ── Unified Translation Operations ──────────────────────────────────

export const CreateUnifiedTranslationRequestSchema = Type.Object({
  entityKey: Type.String({
    pattern: "^[a-z0-9_.]+$",
    description: "Dotted path key (e.g., checkout.button.confirm)"
  }),
  description: Type.Optional(Type.String({ description: "Description of the translation key for editors" })),
  defaultValue: Type.String({
    maxLength: 1024,
    description: "Default translation value (will be used for default locale)"
  }),
  defaultLocaleId: Type.Optional(Type.Number({
    description: "Locale ID for default translation (defaults to en-US if not specified)"
  })),
  brandId: Type.Optional(Type.Number({ description: "Brand ID for brand-specific translation" })),
  jurisdictionId: Type.Optional(Type.Number({ description: "Jurisdiction ID for jurisdiction-specific translation" })),
  status: Type.Optional(TranslationStatus),
  metadata: Type.Optional(Type.Object({
    maxLength: Type.Optional(Type.Number()),
    pluralForms: Type.Optional(Type.Record(Type.String(), Type.String())),
    comments: Type.Optional(Type.String()),
    autoTranslateWithAI: Type.Optional(Type.Boolean({ description: "Whether to trigger AI auto-translation for empty variants" })),
    hasCharacterLimit: Type.Optional(Type.Boolean({ description: "Whether a character limit is enforced" })),
  })),
  additionalVariants: Type.Optional(Type.Array(Type.Object({
    localeId: Type.Number({ description: "Locale ID for this variant" }),
    value: Type.String({ maxLength: 1024, description: "Translation value for this locale" }),
    brandId: Type.Optional(Type.Number({ description: "Brand ID override for this variant" })),
    jurisdictionId: Type.Optional(Type.Number({ description: "Jurisdiction ID override for this variant" })),
    status: Type.Optional(TranslationStatus),
  }), { description: "Additional translation variants to create" }))
}, {
  additionalProperties: false,
  description: "Request to create a translation key with default and optional additional variants in a single operation"
})

export const UnifiedTranslationResponseSchema = Type.Object({
  key: TranslationKeySchema,
  defaultVariant: TranslationVariantSchema,
  additionalVariants: Type.Optional(Type.Array(TranslationVariantSchema)),
}, {
  description: "Response for unified translation creation"
})

// ── Batch Translation Operations ──────────────────────────────────

export const BatchTranslationItemSchema = Type.Object({
  entityKey: Type.String({
    pattern: "^[a-z0-9_.]+$",
    description: "Dotted path key"
  }),
  description: Type.Optional(Type.String({ description: "Key description" })),
  localeId: Type.Number({ description: "Locale ID for this translation" }),
  value: Type.String({ maxLength: 1024, description: "Translation value" }),
  status: Type.Optional(TranslationStatus),
  metadata: Type.Optional(Type.Object({
    maxLength: Type.Optional(Type.Number()),
    pluralForms: Type.Optional(Type.Record(Type.String(), Type.String())),
    comments: Type.Optional(Type.String()),
  })),
}, {
  description: "Individual translation item for batch operations"
})

export const BatchTranslationRequestSchema = Type.Object({
  translations: Type.Array(BatchTranslationItemSchema, {
    minItems: 1,
    maxItems: 1000,
    description: "Array of translations to create/update"
  }),
  defaultBrandId: Type.Optional(Type.Number({ description: "Default brand ID to apply to all translations" })),
  defaultJurisdictionId: Type.Optional(Type.Number({ description: "Default jurisdiction ID to apply to all translations" })),
  overwriteExisting: Type.Optional(Type.Boolean({
    default: false,
    description: "Whether to overwrite existing translation variants"
  })),
  createMissingKeys: Type.Optional(Type.Boolean({
    default: true,
    description: "Whether to create translation keys that don't exist"
  })),
}, {
  additionalProperties: false,
  description: "Request to batch create/update translations"
})

export const BatchTranslationResultSchema = Type.Object({
  success: Type.Boolean(),
  processed: Type.Number({ description: "Number of translations processed" }),
  created: Type.Number({ description: "Number of new translations created" }),
  updated: Type.Number({ description: "Number of existing translations updated" }),
  errors: Type.Array(Type.Object({
    entityKey: Type.String(),
    localeId: Type.Number(),
    error: Type.String(),
  }), { description: "Errors encountered during processing" }),
  createdKeys: Type.Array(TranslationKeySchema, { description: "New translation keys created" }),
  createdVariants: Type.Array(TranslationVariantSchema, { description: "New translation variants created" }),
  updatedVariants: Type.Array(TranslationVariantSchema, { description: "Updated translation variants" }),
}, {
  description: "Result of batch translation operation"
})

// ── CSV Import Specific Schema ──────────────────────────────────

export const TranslationCsvImportRequestSchema = Type.Object({
  csvContent: Type.String({ description: "CSV content as string" }),
  defaultBrandId: Type.Optional(Type.Number({ description: "Default brand ID for all imported translations" })),
  defaultJurisdictionId: Type.Optional(Type.Number({ description: "Default jurisdiction ID for all imported translations" })),
  overwriteExisting: Type.Optional(Type.Boolean({
    default: false,
    description: "Whether to overwrite existing translation variants"
  })),
  createMissingKeys: Type.Optional(Type.Boolean({
    default: true,
    description: "Whether to create translation keys that don't exist"
  })),
  csvOptions: Type.Optional(Type.Object({
    delimiter: Type.Optional(Type.String({ default: ",", description: "CSV delimiter character" })),
    hasHeader: Type.Optional(Type.Boolean({ default: true, description: "Whether CSV has header row" })),
    keyColumn: Type.Optional(Type.String({ default: "key", description: "Column name for translation keys" })),
    valueColumn: Type.Optional(Type.String({ default: "value", description: "Column name for translation values" })),
    localeColumn: Type.Optional(Type.String({ default: "locale", description: "Column name for locale codes" })),
    descriptionColumn: Type.Optional(Type.String({ description: "Column name for key descriptions" })),
  })),
}, {
  additionalProperties: false,
  description: "Request to import translations from CSV"
})

// ── Source Language Operations ──────────────────────────────────

export const SourceLanguageTranslationSchema = Type.Object({
  id: Type.Number({ description: "Translation key entity ID" }),
  entityKey: Type.String({ description: "The translation key identifier" }),
  value: Type.String({ description: "The source language text value" }),
  description: Type.Union([Type.String(), Type.Null()], {
    description: "Description of the translation key for editors"
  }),
  status: TranslationStatus,
  metadata: Type.Optional(Type.Object({
    maxLength: Type.Optional(Type.Number()),
    pluralForms: Type.Optional(Type.Record(Type.String(), Type.String())),
    comments: Type.Optional(Type.String()),
  })),
  usageCount: Type.Optional(Type.Number({ description: "Number of places this key is used" })),
  createdBy: Type.String({ format: "uuid", description: "User who created the key" }),
  createdAt: Type.String({ format: "date-time", description: "Creation timestamp" }),
  updatedBy: Type.Union([Type.String({ format: "uuid" }), Type.Null()], {
    description: "User who last updated the translation"
  }),
  updatedAt: Type.Union([Type.String({ format: "date-time" }), Type.Null()], {
    description: "Last update timestamp"
  }),
}, {
  description: "Source language translation with key and variant data combined"
})

export const SourceLanguageQuerySchema = Type.Intersect([
  Type.Object({
    search: Type.Optional(Type.String({ description: "Search in keys, values, or descriptions" })),
    status: Type.Optional(TranslationStatus),
    hasDescription: Type.Optional(Type.Boolean({ description: "Filter by presence of description" })),
    sortBy: Type.Optional(Type.Union([
      Type.Literal("key"),
      Type.Literal("value"),
      Type.Literal("updated"),
      Type.Literal("created"),
      Type.Literal("usage")
    ], { default: "key", description: "Sort field" })),
    sortOrder: Type.Optional(Type.Union([
      Type.Literal("asc"),
      Type.Literal("desc")
    ], { default: "asc", description: "Sort order" }))
  }),
  PaginationQuerySchema
], {
  description: "Query parameters for source language translations endpoint"
})