# Languages API

The Languages API provides endpoints for managing language configurations within the CMS platform. Languages define locale codes that are available for content translation and localization.

## Authentication

All languages endpoints require authentication and write operations require admin role.

## Endpoints

### List Languages

Get a paginated list of languages with optional search functionality.

```http
GET /api/languages
```

**Required Role**: `user` (read), `admin` (write)

#### Query Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `page` | number | Page number | 1 |
| `limit` | number | Items per page (max 100) | 20 |
| `search` | string | Search by language code or name | - |

#### Search Functionality

The `search` parameter supports:
- Full-text search on language code and name fields
- Case-insensitive partial matching
- Searches both language code (e.g., "en-US") and name (e.g., "English (United States)") simultaneously

#### Example Request

```http
GET /api/languages?page=1&limit=25&search=en
Authorization: Bearer your-jwt-token
```

#### Example Response

```json
{
  "data": [
    {
      "id": "lang-123",
      "languageCode": "en-US",
      "name": "English (United States)",
      "isActive": true,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    },
    {
      "id": "lang-124",
      "languageCode": "en-GB",
      "name": "English (United Kingdom)",
      "isActive": true,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 45,
    "totalPages": 2
  }
}
```

### Get Language by ID

Retrieve a specific language by its ID.

```http
GET /api/languages/:id
```

**Required Role**: `user`

#### Example Response

```json
{
  "data": {
    "id": "lang-123",
    "languageCode": "en-US",
    "name": "English (United States)",
    "isActive": true,
    "createdAt": "2024-01-15T10:00:00Z",
    "updatedAt": "2024-01-15T10:00:00Z"
  }
}
```

### Create Language

Create a new language configuration.

```http
POST /api/languages
```

**Required Role**: `admin`

#### Request Body

```json
{
  "languageCode": "fr-FR",
  "name": "French (France)",
  "isActive": true
}
```

#### Validation Rules

- `languageCode`: Must follow the format `xx-XX` (e.g., `en-US`, `fr-FR`, `de-DE`)
- `name`: Required string with minimum length of 1 character
- `isActive`: Optional boolean, defaults to `true`

#### Example Response

```json
{
  "data": {
    "id": "lang-125",
    "languageCode": "fr-FR",
    "name": "French (France)",
    "isActive": true,
    "createdAt": "2024-01-28T14:00:00Z",
    "updatedAt": "2024-01-28T14:00:00Z"
  }
}
```

### Update Language

Update an existing language configuration.

```http
PUT /api/languages/:id
```

**Required Role**: `admin`

#### Request Body

```json
{
  "languageCode": "fr-CA",
  "name": "French (Canada)",
  "isActive": false
}
```

#### Validation Rules

Same validation rules as create endpoint apply.

#### Example Response

```json
{
  "data": {
    "id": "lang-125",
    "languageCode": "fr-CA",
    "name": "French (Canada)",
    "isActive": false,
    "createdAt": "2024-01-28T14:00:00Z",
    "updatedAt": "2024-01-28T15:30:00Z"
  }
}
```

### Delete Language

Delete a language configuration.

```http
DELETE /api/languages/:id
```

**Required Role**: `admin`

#### Example Response

```json
{
  "data": {
    "message": "Language deleted successfully"
  }
}
```

::: warning Cascade Deletion
When deleting a language, consider the impact on existing translations that may reference this language. The API will prevent deletion if there are active content translations using this language.
:::

## Language Code Format

Language codes must follow the ISO 639-1 and ISO 3166-1 standard format:

- **Format**: `xx-XX` (language-COUNTRY)
- **Examples**: 
  - `en-US` (English - United States)
  - `en-GB` (English - United Kingdom) 
  - `fr-FR` (French - France)
  - `fr-CA` (French - Canada)
  - `es-ES` (Spanish - Spain)
  - `es-MX` (Spanish - Mexico)

## Error Responses

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request data or language code format |
| 401 | `UNAUTHORIZED` | Missing or invalid authentication |
| 403 | `FORBIDDEN` | Insufficient permissions (admin required for write operations) |
| 404 | `NOT_FOUND` | Language not found |
| 409 | `CONFLICT` | Language code already exists |

### Example Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Language code must follow the format xx-XX (e.g., en-US)",
    "details": {
      "field": "languageCode",
      "value": "invalid-code",
      "expected": "xx-XX format"
    }
  }
}
```

## Usage in Content Management

Languages are fundamental to the CMS platform's multi-locale content system:

1. **Content Translation**: Each piece of content can be translated into any configured language
2. **Locale Hierarchy**: Languages work with brands and jurisdictions to create the complete locale hierarchy
3. **Feature Flags**: Content visibility can be controlled per language using feature flags
4. **Release Management**: Content releases can target specific languages

## Best Practices

1. **Consistent Naming**: Use descriptive names that include both language and region (e.g., "English (United States)" vs just "English")

2. **Active Status**: Use the `isActive` flag to disable languages without deleting their associated data

3. **Standard Codes**: Always use standard ISO language-country codes for consistency and interoperability

4. **Planning**: Consider your target markets when adding languages - it's easier to add languages upfront than to migrate content later

## Integration Examples

### Frontend Integration

```typescript
import type { Language, GetLanguagesResponse } from '@cms/contracts/types/languages'

// Fetch all active languages for a locale selector
const getActiveLanguages = async (): Promise<Language[]> => {
  const response = await apiClient.get<GetLanguagesResponse>('/api/languages?limit=100')
  return response.data.data.filter(lang => lang.isActive)
}

// Create a new language
const createLanguage = async (languageData: CreateLanguageRequest): Promise<Language> => {
  const response = await apiClient.post<CreateLanguageResponse>('/api/languages', languageData)
  return response.data.data
}
```

### Backend Integration

```typescript
import { CreateLanguageRequestSchema } from '@cms/contracts/schemas/languages'
import type { CreateLanguageRequest } from '@cms/contracts/types/languages'

// Validate and create language in your service
fastify.post('/api/languages', {
  schema: { body: CreateLanguageRequestSchema }
}, async (request) => {
  const languageData = request.body as CreateLanguageRequest
  // Implementation with full type safety
})
```