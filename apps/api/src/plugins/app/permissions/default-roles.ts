// Default system roles and their permissions
export const DEFAULT_ROLES = [
    {
        name: 'admin',
        description: 'Administrator role with full system access',
        permissions: 'all' // Special case - gets all permissions
    },
    {
        name: 'editor',
        description: 'Editor role with content management permissions',
        permissions: [
            'users:read',
            'brands:read',
            'translations:read',
            'translations:create',
            'translations:update',
            'translations:approve',
            'releases:read',
            'releases:create',
            'releases:update',
            'releases:close',
            'releases:preview',
            'releases:diff',
            'jurisdictions:read',
            'languages:read'
        ]
    },
    {
        name: 'user',
        description: 'Basic user role with read-only permissions',
        permissions: [
            'users:read',
            'brands:read',
            'translations:read',
            'releases:read',
            'jurisdictions:read',
            'languages:read'
        ]
    },
    {
        name: 'service',
        description: 'Service account role for system operations and API integrations',
        permissions: 'all' // System operations need full permissions like admin
    }
]