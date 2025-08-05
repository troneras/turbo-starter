# Automatic Permission Management System

## Overview

The API now includes an automatic permission management system that eliminates the need to manually manage permissions in the database. The system automatically:

1. **Discovers permissions** from route definitions
2. **Registers permissions** to the database on startup
3. **Syncs default roles** with their appropriate permissions
4. **Ensures admin role** always has all permissions

## How It Works

### 1. Permission Discovery

Permissions are discovered in three ways:

#### a) From `requirePermission()` calls
```typescript
fastify.get('/users', {
    onRequest: [
        fastify.authenticate,
        fastify.requirePermission('users:read') // Auto-registered
    ]
}, handler)
```

#### b) From route schema tags (auto-generated)
```typescript
fastify.post('/brands', {
    schema: {
        tags: ['brands'] // Generates 'brands:create' permission
    }
}, handler)
```

#### c) From predefined permissions
The system includes a comprehensive list of standard permissions for all resources.

### 2. Permission Format

Permissions follow the format: `resource:action`

Common actions:
- `read` - View resources
- `create` - Create new resources
- `update` - Modify existing resources
- `delete` - Remove resources
- `approve` - Approve changes
- `publish` - Publish content
- `deploy` - Deploy to production
- `rollback` - Rollback changes

### 3. Default Roles

The system automatically creates and maintains four default roles:

#### Admin Role
- Automatically receives ALL permissions
- Updated whenever new permissions are added
- Cannot have permissions removed

#### Editor Role
- Content management permissions
- Can create, read, and update content
- Cannot delete or deploy

#### User Role
- Read-only access to all resources
- Basic system access

#### Service Role
- For API integrations
- Permissions assigned via service tokens

## Usage

### Adding New Permissions

Simply use them in your routes:

```typescript
// The permission will be auto-registered on startup
fastify.requirePermission('custom:action')
```

### Custom Route Permissions

Add permissions to route options:

```typescript
fastify.post('/special', {
    permissions: 'special:create', // Custom extension
    onRequest: [
        fastify.authenticate,
        fastify.requirePermission('special:create')
    ]
}, handler)
```

### Multiple Permissions

For routes requiring multiple permissions:

```typescript
fastify.put('/complex', {
    permissions: ['resource:read', 'resource:update'],
    onRequest: [
        fastify.authenticate,
        async (request: any) => {
            const required = ['resource:read', 'resource:update']
            const hasAll = required.every(p => 
                request.user.permissions.includes(p)
            )
            if (!hasAll) {
                throw fastify.httpErrors.forbidden()
            }
        }
    ]
}, handler)
```

## Benefits

1. **No Manual Database Updates** - Permissions are synced automatically
2. **No Missing Permissions** - Admin always has all permissions
3. **Consistent Permissions** - Predefined permissions ensure consistency
4. **Easy Development** - Just use permissions, no setup required
5. **Auto-discovery** - Permissions extracted from route definitions

## System Behavior

### On Startup

1. Registers all predefined permissions
2. Discovers permissions from route definitions
3. Syncs permissions to database
4. Creates/updates default roles
5. Ensures admin has all permissions

### On Code Changes

When you add new routes or permissions:
1. Restart the API server
2. New permissions are automatically registered
3. Admin role automatically receives new permissions
4. Other roles maintain their defined permissions

### Permission Sync Process

```
App Start
    ↓
Load Predefined Permissions
    ↓
Register Route Hooks
    ↓
Routes Load → Extract Permissions
    ↓
Sync to Database
    ↓
Sync Default Roles
    ↓
Update Admin Permissions
    ↓
Ready
```

## Troubleshooting

### Permissions Not Appearing

1. Ensure the route is properly registered
2. Check that `requirePermission()` is called
3. Verify the permission format is correct
4. Check logs for sync errors

### Role Not Getting Permissions

1. Only admin gets all permissions automatically
2. Other roles have predefined permissions
3. Check `default-roles.ts` for role definitions

### Custom Permissions

To add custom permissions outside of routes:

1. Add to `predefined-permissions.ts`
2. Restart the server
3. Permission will be registered and assigned to admin

## Technical Details

### Files

- `permission-registry.ts` - Core registry system
- `predefined-permissions.ts` - Standard system permissions
- `default-roles.ts` - Default role configurations
- `permissions-repository.ts` - Database operations

### Database Tables

- `permissions` - All registered permissions
- `roles` - System roles
- `role_permissions` - Role-permission mappings

### Logging

The system logs all operations:
- Permission registration
- Role creation/updates
- Permission assignments
- Sync completion

Check logs with tag `permission-registry` for details.