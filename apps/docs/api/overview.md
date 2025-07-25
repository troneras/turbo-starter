# API Overview

The CMS Platform API is built with Fastify, providing a fast and type-safe REST API for all platform operations.

## Base URL

```
http://localhost:3000/api
```

## Authentication

All API endpoints (except `/health` and `/api/auth/login`) require authentication via JWT tokens.

### Obtaining a Token

```http
POST /api/auth/login
Content-Type: application/json

{
  "azureToken": "your-azure-ad-token"
}
```

Response:
```json
{
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "roles": ["editor"]
  }
}
```

### Using the Token

Include the JWT token in the Authorization header:

```http
GET /api/users
Authorization: Bearer your-jwt-token
```

## Request/Response Format

All requests and responses use JSON format with proper Content-Type headers.

### Standard Response Format

Successful responses:
```json
{
  "data": {
    // Response data
  }
}
```

Error responses:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      // Additional error context
    }
  }
}
```

## Pagination

List endpoints support pagination via query parameters:

```http
GET /api/translations?page=1&limit=20
```

Response includes pagination metadata:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## Filtering and Sorting

Most list endpoints support filtering and sorting:

```http
GET /api/translations?brandId=123&sort=-createdAt
```

- Use query parameters for filtering
- Prefix field name with `-` for descending sort

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- **Authenticated users**: 1000 requests per 15 minutes
- **Service tokens**: 5000 requests per 15 minutes

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1699564800
```

## Error Codes

Common error codes:

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Missing or invalid authentication |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Invalid request data |
| `RATE_LIMITED` | Too many requests |

## OpenAPI Documentation

The API provides OpenAPI (Swagger) documentation at:

```
http://localhost:3000/documentation
```

This interactive documentation allows you to:
- Explore all available endpoints
- View request/response schemas
- Test endpoints directly