# Jurisdictions API

The Jurisdictions API provides endpoints for managing regulatory jurisdictions in the CMS platform. Jurisdictions represent regulatory bodies and regions that govern content and operations across different geographical locations and legal frameworks.

## Overview

Jurisdictions are critical for multi-jurisdiction content management, allowing content to be customized and compliant with specific regulatory requirements. Examples include:
- **UKGC** - UK Gambling Commission
- **MGA** - Malta Gaming Authority  
- **DGOJ** - Dirección General de Ordenación del Juego (Spain)
- **AGCO** - Alcohol and Gaming Commission of Ontario

## Base URL

```
/api/jurisdictions
```

## Authentication

All jurisdiction endpoints require authentication via JWT tokens. Admin role is required for create, update, and delete operations.

## Data Model

### Jurisdiction Object

```typescript
interface Jurisdiction {
  id: number                    // Unique identifier
  code: string                  // Jurisdiction code (e.g., "UKGC", "MGA")
  name: string                  // Human-readable name
  description?: string | null   // Detailed description
  status: 'active' | 'inactive' // Jurisdiction status
  region?: string | null        // Geographic region
  createdAt: string            // ISO 8601 creation timestamp
  updatedAt: string            // ISO 8601 update timestamp
}
```

### Field Constraints

- **code**: Required, unique, 1-20 characters, uppercase alphanumeric with underscores and hyphens (pattern: `^[A-Z0-9_-]+$`)
- **name**: Required, minimum 1 character
- **description**: Optional, can be null
- **status**: Enum values: `active`, `inactive` (defaults to `active`)
- **region**: Optional, can be null, maximum 100 characters

## Endpoints

### List Jurisdictions

Get all jurisdictions with optional search, pagination, and filtering.

```http
GET /api/jurisdictions
```

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (starts at 1) |
| `pageSize` | number | Items per page (1-100, default: 20) |
| `search` | string | Search term for code, name, or region |
| `status` | string | Filter by status: `active`, `inactive` |
| `region` | string | Filter by geographic region |

#### Request Example

```http
GET /api/jurisdictions?search=gambling&status=active&page=1&pageSize=20
Authorization: Bearer your-jwt-token
```

#### Response

**200 OK**
```json
[
  {
    "id": 1,
    "code": "UKGC",
    "name": "UK Gambling Commission",
    "description": "The statutory body responsible for regulating commercial gambling in Great Britain",
    "status": "active",
    "region": "Europe",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  {
    "id": 2,
    "code": "MGA",
    "name": "Malta Gaming Authority",
    "description": "The single regulator for all gaming activities in Malta",
    "status": "active",
    "region": "Europe",
    "createdAt": "2024-01-16T09:15:00Z",
    "updatedAt": "2024-01-16T09:15:00Z"
  }
]
```

**401 Unauthorized**
```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Missing or invalid authorization header"
}
```

### Get Jurisdiction

Get a specific jurisdiction by ID.

```http
GET /api/jurisdictions/:id
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Jurisdiction ID |

#### Request Example

```http
GET /api/jurisdictions/1
Authorization: Bearer your-jwt-token
```

#### Response

**200 OK**
```json
{
  "id": 1,
  "code": "UKGC",
  "name": "UK Gambling Commission",
  "description": "The statutory body responsible for regulating commercial gambling in Great Britain",
  "status": "active",
  "region": "Europe",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**404 Not Found**
```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Jurisdiction with ID 1 not found"
}
```

### Create Jurisdiction

Create a new jurisdiction. Requires admin role.

```http
POST /api/jurisdictions
```

#### Request Body

```json
{
  "code": "DGOJ",
  "name": "Dirección General de Ordenación del Juego",
  "description": "Spanish gambling regulator",
  "status": "active",
  "region": "Europe"
}
```

#### Field Requirements

- **code**: Required, must be unique
- **name**: Required
- **description**: Optional
- **status**: Optional (defaults to "active")
- **region**: Optional

#### Request Example

```http
POST /api/jurisdictions
Authorization: Bearer admin-jwt-token
Content-Type: application/json

{
  "code": "DGOJ",
  "name": "Dirección General de Ordenación del Juego",
  "description": "Spanish gambling regulator",
  "region": "Europe"
}
```

#### Response

**201 Created**
```json
{
  "id": 3,
  "code": "DGOJ",
  "name": "Dirección General de Ordenación del Juego",
  "description": "Spanish gambling regulator",
  "status": "active",
  "region": "Europe",
  "createdAt": "2024-01-17T14:22:00Z",
  "updatedAt": "2024-01-17T14:22:00Z"
}
```

**400 Bad Request** (Validation Error)
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "[validation error details]"
}
```

**403 Forbidden** (Non-admin user)
```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

**409 Conflict** (Duplicate code)
```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Jurisdiction with code \"DGOJ\" already exists"
}
```

### Update Jurisdiction

Update an existing jurisdiction. Requires admin role.

```http
PUT /api/jurisdictions/:id
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Jurisdiction ID |

#### Request Body

All fields are optional for partial updates:

```json
{
  "code": "DGOJ_ES",
  "name": "Dirección General de Ordenación del Juego - España",
  "description": "Updated description",
  "status": "inactive",
  "region": "Southern Europe"
}
```

#### Request Example

```http
PUT /api/jurisdictions/3
Authorization: Bearer admin-jwt-token
Content-Type: application/json

{
  "description": "Updated Spanish gambling regulator information",
  "status": "inactive"
}
```

#### Response

**200 OK**
```json
{
  "id": 3,
  "code": "DGOJ",
  "name": "Dirección General de Ordenación del Juego",
  "description": "Updated Spanish gambling regulator information",
  "status": "inactive",
  "region": "Europe",
  "createdAt": "2024-01-17T14:22:00Z",
  "updatedAt": "2024-01-17T15:30:00Z"
}
```

**404 Not Found**
```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Jurisdiction with ID 3 not found"
}
```

### Delete Jurisdiction

Delete a jurisdiction by ID. Requires admin role.

```http
DELETE /api/jurisdictions/:id
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Jurisdiction ID |

#### Request Example

```http
DELETE /api/jurisdictions/3
Authorization: Bearer admin-jwt-token
```

#### Response

**204 No Content**
(Empty response body)

**400 Bad Request** (Referenced by other entities)
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Cannot delete jurisdiction that is referenced by other entities (brands, translations, etc.)"
}
```

**403 Forbidden**
```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

**404 Not Found**
```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Jurisdiction with ID 3 not found"
}
```

## Usage Examples

### JavaScript/TypeScript

```typescript
// Using fetch API
const apiClient = {
  baseURL: 'http://localhost:3000/api',
  token: 'your-jwt-token',

  async getJurisdictions(params?: {
    search?: string;
    status?: 'active' | 'inactive';
    region?: string;
    page?: number;
    pageSize?: number;
  }) {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
    const response = await fetch(`${this.baseURL}/jurisdictions${queryString}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  },

  async createJurisdiction(data: {
    code: string;
    name: string;
    description?: string;
    status?: 'active' | 'inactive';
    region?: string;
  }) {
    const response = await fetch(`${this.baseURL}/jurisdictions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return response.json();
  }
};

// Usage examples
const jurisdictions = await apiClient.getJurisdictions({
  search: 'gaming',
  status: 'active',
  page: 1,
  pageSize: 10
});

const newJurisdiction = await apiClient.createJurisdiction({
  code: 'AGCO',
  name: 'Alcohol and Gaming Commission of Ontario',
  description: 'Ontario gambling regulator',
  region: 'North America'
});
```

### cURL Examples

```bash
# List active jurisdictions
curl -X GET "http://localhost:3000/api/jurisdictions?status=active" \
  -H "Authorization: Bearer your-jwt-token"

# Create a new jurisdiction
curl -X POST "http://localhost:3000/api/jurisdictions" \
  -H "Authorization: Bearer admin-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "AGCO",
    "name": "Alcohol and Gaming Commission of Ontario",
    "region": "North America"
  }'

# Update jurisdiction status
curl -X PUT "http://localhost:3000/api/jurisdictions/1" \
  -H "Authorization: Bearer admin-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"status": "inactive"}'

# Delete jurisdiction
curl -X DELETE "http://localhost:3000/api/jurisdictions/1" \
  -H "Authorization: Bearer admin-jwt-token"
```

## Error Handling

The API returns standard HTTP status codes with detailed error messages:

### Common Error Codes

| Code | Description | When it occurs |
|------|-------------|----------------|
| 400 | Bad Request | Invalid request data, validation failures |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | User lacks required permissions (admin) |
| 404 | Not Found | Jurisdiction ID doesn't exist |
| 409 | Conflict | Duplicate jurisdiction code |
| 500 | Internal Server Error | Unexpected server error |

### Error Response Format

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Descriptive error message"
}
```

## Integration with Platform Features

### Brand Relationships

Jurisdictions can be associated with brands through the `brand_jurisdictions` table, enabling brand-specific compliance and content customization.

```typescript
// Brands can be linked to multiple jurisdictions
interface BrandJurisdiction {
  brandId: number;
  jurisdictionId: number;
}
```

### Translation Context

Jurisdictions provide context for translations, allowing content to be tailored for specific regulatory requirements.

```typescript
// Translations can be jurisdiction-specific
interface Translation {
  keyId: number;
  brandId?: number;
  jurisdictionId?: number;  // Jurisdiction context
  localeId: number;
  value: string;
}
```

### Content Hierarchy

The platform supports content inheritance and overrides based on the hierarchy:
1. Global content (no brand/jurisdiction)
2. Brand-specific content
3. Jurisdiction-specific content  
4. Brand + jurisdiction specific content

## Best Practices

### Jurisdiction Code Naming

- Use official regulator abbreviations when available (e.g., "UKGC", "MGA")
- Keep codes short but descriptive
- Use uppercase letters, numbers, underscores, and hyphens only
- Avoid special characters and spaces

### Status Management

- Set status to `inactive` for deprecated or temporary jurisdictions
- Use status filtering in queries to exclude inactive jurisdictions from operational workflows
- Consider the impact on existing content before changing status

### Region Organization

- Use consistent region names (e.g., "Europe", "North America", "Asia-Pacific")
- Group related jurisdictions by broader geographical or regulatory areas
- Consider using standardized region codes for international compliance

### Deletion Considerations

- Jurisdictions referenced by other entities (brands, translations) cannot be deleted
- Use status `inactive` instead of deletion for historical data preservation
- Implement proper cascading deletion policies if removal is necessary