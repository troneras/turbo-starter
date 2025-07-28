# Users API

The Users API provides endpoints for managing users, their roles, and permissions within the CMS platform.

## Authentication

All users endpoints require authentication and most require admin role.

## Endpoints

### List Users

Get a paginated list of users with filtering and sorting capabilities.

```http
GET /api/users
```

**Required Role**: `admin`

#### Query Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `page` | number | Page number | 1 |
| `pageSize` | number | Items per page | 20 |
| `search` | string | Search by name or email | - |
| `role` | string | Filter by role name | - |
| `status` | string | Filter by status (`active`, `inactive`) | - |
| `sortBy` | string | Sort field (`name`, `email`, `lastLoginAt`, `createdAt`) | `createdAt` |
| `sortDirection` | string | Sort direction (`asc`, `desc`) | `desc` |

#### Search Functionality

The `search` parameter supports:
- Full-text search on name and email fields using PostgreSQL's text search
- Partial matching with case-insensitive ILIKE queries
- Searches both name and email fields simultaneously

#### Example Request

```http
GET /api/users?page=1&pageSize=25&search=john&sortBy=name&sortDirection=asc
Authorization: Bearer your-jwt-token
```

#### Example Response

```json
{
  "users": [
    {
      "id": "user-123",
      "email": "john.doe@example.com",
      "name": "John Doe",
      "roles": ["editor", "user"],
      "status": "active",
      "createdAt": "2024-01-15T10:00:00Z",
      "last_login_at": "2024-01-20T15:30:00Z"
    }
  ],
  "total": 45,
  "page": 1,
  "pageSize": 25
}
```

### Get Current User

Get information about the currently authenticated user.

```http
GET /api/users/me
```

#### Example Response

```json
{
  "user": {
    "id": "user-123",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "azure_ad_oid": "azure-oid",
    "azure_ad_tid": "azure-tid",
    "last_login_at": "2024-01-20T15:30:00Z"
  },
  "roles": ["editor", "user"],
  "permissions": ["translations:read", "translations:write"]
}
```

### Create User

Create a new user in the system.

```http
POST /api/users
```

**Required Role**: `admin`

#### Request Body

```json
{
  "email": "new.user@example.com",
  "name": "New User",
  "roles": ["user"]
}
```

### Update User

Update user information including roles.

```http
PATCH /api/users/:id
```

**Required Role**: `admin`

#### Request Body

```json
{
  "name": "Updated Name",
  "email": "updated.email@example.com",
  "roles": ["editor", "user"]
}
```

### Update User Status

Activate or deactivate a user.

```http
PATCH /api/users/:id/status
```

**Required Role**: `admin`

#### Request Body

```json
{
  "status": "inactive"
}
```

### Bulk Operations

#### Bulk Assign Role

Assign a role to multiple users at once.

```http
POST /api/users/bulk-assign-role
```

**Required Role**: `admin`

#### Request Body

```json
{
  "userIds": ["user-1", "user-2", "user-3"],
  "roleName": "editor",
  "reason": "Promoted to content editors"
}
```

#### Bulk Deactivate

Deactivate multiple users at once.

```http
POST /api/users/bulk-deactivate
```

**Required Role**: `admin`

#### Request Body

```json
{
  "userIds": ["user-1", "user-2"],
  "reason": "Inactive for 90 days"
}
```

## Filtering Best Practices

1. **Search** - Use for finding users by name or email. The search is performed using PostgreSQL's full-text search for better performance with large datasets.

2. **Role Filtering** - When filtering by role, the API performs an inner join with the roles table to ensure accurate results.

3. **Sorting** - All sortable fields are indexed for optimal performance:
   - `name` - Sort alphabetically by user name
   - `email` - Sort alphabetically by email address
   - `lastLoginAt` - Sort by last login time (null values last)
   - `createdAt` - Sort by account creation date (default)

4. **Pagination** - Always use pagination for large datasets. The maximum `pageSize` is 100.

## Error Responses

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Invalid parameters or request body |
| 401 | Unauthorized - Missing or invalid authentication |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - User not found |
| 409 | Conflict - Email already exists |

## Audit Trail

All user modifications are logged in the audit trail, including:
- Status changes
- Role assignments
- Bulk operations

The audit log includes the performing user, timestamp, old/new values, and optional reason.