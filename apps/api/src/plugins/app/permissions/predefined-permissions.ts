// Predefined system permissions
export const PREDEFINED_PERMISSIONS = [
    // User management
    {
        name: 'users:read',
        resource: 'users',
        action: 'read',
        category: 'users',
        description: 'View user information'
    },
    {
        name: 'users:create',
        resource: 'users',
        action: 'create',
        category: 'users',
        description: 'Create new users'
    },
    {
        name: 'users:update',
        resource: 'users',
        action: 'update',
        category: 'users',
        description: 'Update user information'
    },
    {
        name: 'users:delete',
        resource: 'users',
        action: 'delete',
        category: 'users',
        description: 'Delete users'
    },
    
    // Brand management
    {
        name: 'brands:read',
        resource: 'brands',
        action: 'read',
        category: 'brands',
        description: 'View brand information'
    },
    {
        name: 'brands:create',
        resource: 'brands',
        action: 'create',
        category: 'brands',
        description: 'Create new brands'
    },
    {
        name: 'brands:update',
        resource: 'brands',
        action: 'update',
        category: 'brands',
        description: 'Update brand information'
    },
    {
        name: 'brands:delete',
        resource: 'brands',
        action: 'delete',
        category: 'brands',
        description: 'Delete brands'
    },
    
    // Translation management
    {
        name: 'translations:read',
        resource: 'translations',
        action: 'read',
        category: 'translations',
        description: 'View translations'
    },
    {
        name: 'translations:create',
        resource: 'translations',
        action: 'create',
        category: 'translations',
        description: 'Create new translations'
    },
    {
        name: 'translations:update',
        resource: 'translations',
        action: 'update',
        category: 'translations',
        description: 'Update translations'
    },
    {
        name: 'translations:delete',
        resource: 'translations',
        action: 'delete',
        category: 'translations',
        description: 'Delete translations'
    },
    {
        name: 'translations:publish',
        resource: 'translations',
        action: 'publish',
        category: 'translations',
        description: 'Publish translations'
    },
    {
        name: 'translations:approve',
        resource: 'translations',
        action: 'approve',
        category: 'translations',
        description: 'Approve translation changes'
    },
    
    // Release management
    {
        name: 'releases:read',
        resource: 'releases',
        action: 'read',
        category: 'releases',
        description: 'View releases'
    },
    {
        name: 'releases:create',
        resource: 'releases',
        action: 'create',
        category: 'releases',
        description: 'Create new releases'
    },
    {
        name: 'releases:update',
        resource: 'releases',
        action: 'update',
        category: 'releases',
        description: 'Update release information'
    },
    {
        name: 'releases:delete',
        resource: 'releases',
        action: 'delete',
        category: 'releases',
        description: 'Delete releases'
    },
    {
        name: 'releases:close',
        resource: 'releases',
        action: 'close',
        category: 'releases',
        description: 'Close releases'
    },
    {
        name: 'releases:deploy',
        resource: 'releases',
        action: 'deploy',
        category: 'releases',
        description: 'Deploy releases to production'
    },
    {
        name: 'releases:rollback',
        resource: 'releases',
        action: 'rollback',
        category: 'releases',
        description: 'Rollback deployed releases'
    },
    {
        name: 'releases:preview',
        resource: 'releases',
        action: 'preview',
        category: 'releases',
        description: 'Preview release changes'
    },
    {
        name: 'releases:diff',
        resource: 'releases',
        action: 'diff',
        category: 'releases',
        description: 'View release differences'
    },
    
    // Role management
    {
        name: 'roles:read',
        resource: 'roles',
        action: 'read',
        category: 'roles',
        description: 'View roles'
    },
    {
        name: 'roles:create',
        resource: 'roles',
        action: 'create',
        category: 'roles',
        description: 'Create new roles'
    },
    {
        name: 'roles:update',
        resource: 'roles',
        action: 'update',
        category: 'roles',
        description: 'Update role information'
    },
    {
        name: 'roles:delete',
        resource: 'roles',
        action: 'delete',
        category: 'roles',
        description: 'Delete roles'
    },
    
    // Permission management
    {
        name: 'permissions:read',
        resource: 'permissions',
        action: 'read',
        category: 'permissions',
        description: 'View permissions'
    },
    {
        name: 'permissions:create',
        resource: 'permissions',
        action: 'create',
        category: 'permissions',
        description: 'Create new permissions'
    },
    {
        name: 'permissions:update',
        resource: 'permissions',
        action: 'update',
        category: 'permissions',
        description: 'Update permission information'
    },
    {
        name: 'permissions:delete',
        resource: 'permissions',
        action: 'delete',
        category: 'permissions',
        description: 'Delete permissions'
    },
    
    // Jurisdiction management
    {
        name: 'jurisdictions:read',
        resource: 'jurisdictions',
        action: 'read',
        category: 'jurisdictions',
        description: 'View jurisdictions'
    },
    {
        name: 'jurisdictions:create',
        resource: 'jurisdictions',
        action: 'create',
        category: 'jurisdictions',
        description: 'Create new jurisdictions'
    },
    {
        name: 'jurisdictions:update',
        resource: 'jurisdictions',
        action: 'update',
        category: 'jurisdictions',
        description: 'Update jurisdiction information'
    },
    {
        name: 'jurisdictions:delete',
        resource: 'jurisdictions',
        action: 'delete',
        category: 'jurisdictions',
        description: 'Delete jurisdictions'
    },
    
    // Language management
    {
        name: 'languages:read',
        resource: 'languages',
        action: 'read',
        category: 'languages',
        description: 'View languages'
    },
    {
        name: 'languages:create',
        resource: 'languages',
        action: 'create',
        category: 'languages',
        description: 'Create new languages'
    },
    {
        name: 'languages:update',
        resource: 'languages',
        action: 'update',
        category: 'languages',
        description: 'Update language information'
    },
    {
        name: 'languages:delete',
        resource: 'languages',
        action: 'delete',
        category: 'languages',
        description: 'Delete languages'
    }
]