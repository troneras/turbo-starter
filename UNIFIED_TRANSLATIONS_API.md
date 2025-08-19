# Unified Translation API

This document describes the new unified translation endpoints that simplify translation management by hiding the complexity of separate key and variant operations from clients.

## Overview

The new unified translation system provides:

1. **Unified Translation Creation** - Create translation keys and variants in a single operation
2. **Batch Operations** - Bulk create/update translations for efficient data imports
3. **CSV Import** - Import translations directly from CSV files with configurable column mapping

## Endpoints

### 1. Unified Translation Creation

**POST** `/api/translations/unified`

Creates a translation key and its default variant (plus optional additional variants) in a single transaction.

#### Request Body

```typescript
{
  entityKey: string              // Required: Dotted path key (e.g., "checkout.button.confirm")
  description?: string           // Optional: Description for editors
  defaultValue: string           // Required: Default translation value
  defaultLocaleId?: number       // Optional: Locale ID for default (defaults to en-US)
  brandId?: number              // Optional: Brand ID for brand-specific translation
  jurisdictionId?: number       // Optional: Jurisdiction ID for jurisdiction-specific translation
  status?: "DRAFT" | "PENDING" | "APPROVED"  // Optional: Status (defaults to DRAFT)
  metadata?: {                  // Optional: Additional metadata
    maxLength?: number
    pluralForms?: Record<string, string>
    comments?: string
  }
  additionalVariants?: Array<{  // Optional: Additional variants to create
    localeId: number
    value: string
    brandId?: number
    jurisdictionId?: number
    status?: "DRAFT" | "PENDING" | "APPROVED"
  }>
}
```

#### Response

```typescript
{
  key: TranslationKey           // Created translation key
  defaultVariant: TranslationVariant    // Default variant created
  additionalVariants?: TranslationVariant[]  // Additional variants created
}
```

#### Example

```bash
curl -X POST /api/translations/unified \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "entityKey": "checkout.button.confirm",
    "description": "Confirm button in checkout flow",
    "defaultValue": "Confirm Purchase",
    "defaultLocaleId": 1,
    "brandId": 2,
    "additionalVariants": [
      {
        "localeId": 3,
        "value": "Confirmar Compra"
      },
      {
        "localeId": 4,
        "value": "Confirmer l'\''achat"
      }
    ]
  }'
```

### 2. Batch Translation Operations

**POST** `/api/translations/batch`

Creates or updates multiple translations in a single operation. Useful for bulk imports and data migrations.

#### Request Body

```typescript
{
  translations: Array<{         // Required: Array of translations (max 1000)
    entityKey: string
    description?: string
    localeId: number
    value: string
    status?: "DRAFT" | "PENDING" | "APPROVED"
    metadata?: {
      maxLength?: number
      pluralForms?: Record<string, string>
      comments?: string
    }
  }>
  defaultBrandId?: number       // Optional: Default brand ID for all translations
  defaultJurisdictionId?: number // Optional: Default jurisdiction ID for all translations
  overwriteExisting?: boolean   // Optional: Whether to overwrite existing variants (default: false)
  createMissingKeys?: boolean   // Optional: Whether to create missing keys (default: true)
}
```

#### Response

```typescript
{
  success: boolean              // Overall operation success
  processed: number             // Number of translations processed
  created: number               // Number of new translations created
  updated: number               // Number of existing translations updated
  errors: Array<{               // Errors encountered
    entityKey: string
    localeId: number
    error: string
  }>
  createdKeys: TranslationKey[] // New translation keys created
  createdVariants: TranslationVariant[]    // New translation variants created
  updatedVariants: TranslationVariant[]    // Updated translation variants
}
```

#### Example

```bash
curl -X POST /api/translations/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "translations": [
      {
        "entityKey": "app.welcome.title",
        "description": "Welcome page title",
        "localeId": 1,
        "value": "Welcome to our app"
      },
      {
        "entityKey": "app.welcome.title",
        "localeId": 3,
        "value": "Bienvenido a nuestra aplicación"
      },
      {
        "entityKey": "app.welcome.subtitle",
        "description": "Welcome page subtitle",
        "localeId": 1,
        "value": "Get started with our amazing features"
      }
    ],
    "defaultBrandId": 2,
    "createMissingKeys": true,
    "overwriteExisting": false
  }'
```

### 3. CSV Import

**POST** `/api/translations/batch/csv-import`

Imports translations from CSV content with configurable column mapping and import options.

#### Request Body

```typescript
{
  csvContent: string            // Required: CSV content as string
  defaultBrandId?: number       // Optional: Default brand ID for all imported translations
  defaultJurisdictionId?: number // Optional: Default jurisdiction ID for all imported translations
  overwriteExisting?: boolean   // Optional: Whether to overwrite existing variants (default: false)
  createMissingKeys?: boolean   // Optional: Whether to create missing keys (default: true)
  csvOptions?: {                // Optional: CSV parsing options
    delimiter?: string          // CSV delimiter (default: ",")
    hasHeader?: boolean         // Whether CSV has header row (default: true)
    keyColumn?: string          // Column name for keys (default: "key")
    valueColumn?: string        // Column name for values (default: "value")
    localeColumn?: string       // Column name for locale codes (default: "locale")
    descriptionColumn?: string  // Column name for descriptions (optional)
  }
}
```

#### Response

Same as batch operations response.

#### CSV Format

The CSV should have the following columns (customizable via `csvOptions`):

```csv
key,locale,value,description
app.welcome.title,en-US,Welcome to our app,Welcome page title
app.welcome.title,es-ES,Bienvenido a nuestra aplicación,Título de la página de bienvenida
app.welcome.subtitle,en-US,Get started with our amazing features,Welcome page subtitle
app.welcome.subtitle,es-ES,Comienza con nuestras increíbles características,Subtítulo de la página de bienvenida
```

#### Example

```bash
curl -X POST /api/translations/batch/csv-import \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "csvContent": "key,locale,value,description\napp.title,en-US,My App,Application title\napp.title,es-ES,Mi Aplicación,Título de la aplicación",
    "defaultBrandId": 2,
    "csvOptions": {
      "delimiter": ",",
      "hasHeader": true,
      "keyColumn": "key",
      "localeColumn": "locale",
      "valueColumn": "value",
      "descriptionColumn": "description"
    }
  }'
```

## Locale Codes

The system supports the following locale codes (corresponding to seeded data):

- `en-US` (ID: 1) - English (United States) - **Default**
- `en-GB` (ID: 2) - English (United Kingdom)
- `es-ES` (ID: 3) - Spanish (Spain)
- `fr-FR` (ID: 4) - French (France)
- `de-DE` (ID: 5) - German (Germany)

And many more as defined in the database seed file.

## Error Handling

All endpoints return appropriate HTTP status codes:

- **200** - Success (for batch operations)
- **201** - Created (for unified creation)
- **400** - Bad Request (validation errors, CSV parsing errors)
- **401** - Unauthorized (missing or invalid token)
- **403** - Forbidden (insufficient permissions)
- **409** - Conflict (duplicate keys/variants when not allowed)

Error responses include detailed error messages and, for batch operations, specific error details for each failed item.

## Permissions Required

All endpoints require:

- Authentication (valid bearer token)
- `translations:create` permission
- Active release context

## Use Cases

### 1. Simple Translation Creation

Use the unified endpoint when you want to create a translation with a default locale and optionally a few additional locales:

```typescript
// Create a simple translation with just English
POST /api/translations/unified
{
  "entityKey": "button.save",
  "defaultValue": "Save",
  "description": "Save button text"
}
```

### 2. Multi-locale Translation Setup

Use the unified endpoint to create a translation with multiple locales at once:

```typescript
// Create translation with multiple locales
POST /api/translations/unified
{
  "entityKey": "error.network",
  "defaultValue": "Network error occurred",
  "description": "Network error message",
  "additionalVariants": [
    { "localeId": 3, "value": "Se produjo un error de red" },
    { "localeId": 4, "value": "Une erreur réseau s'est produite" },
    { "localeId": 5, "value": "Ein Netzwerkfehler ist aufgetreten" }
  ]
}
```

### 3. Bulk Import from External System

Use batch operations for large-scale imports:

```typescript
// Import many translations at once
POST /api/translations/batch
{
  "translations": [
    // ... array of up to 1000 translations
  ],
  "defaultBrandId": 2,
  "createMissingKeys": true,
  "overwriteExisting": false
}
```

### 4. CSV Import from Localization Service

Use CSV import for translations exported from localization tools:

```typescript
// Import from CSV exported from localization platform
POST /api/translations/batch/csv-import
{
  "csvContent": "...", // CSV content
  "defaultBrandId": 2,
  "csvOptions": {
    "keyColumn": "translation_key",
    "localeColumn": "language_code",
    "valueColumn": "translated_text"
  }
}
```

## Benefits

1. **Simplified Client Code** - No need to manage separate key and variant creation
2. **Atomic Operations** - All operations are transactional
3. **Better Performance** - Reduced API calls for common operations
4. **Bulk Operations** - Efficient handling of large datasets
5. **Flexible CSV Import** - Support for various CSV formats from different tools
6. **Error Reporting** - Detailed error information for debugging
7. **Brand/Jurisdiction Support** - Built-in support for multi-tenant scenarios
