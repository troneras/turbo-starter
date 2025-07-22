import { db } from './config'
import { users, roles, permissions, rolePermissions, userRoles } from './schema'
import { eq, and } from 'drizzle-orm'

export async function seed() {
    console.log('Seeding database...')

    // Clear existing data in reverse dependency order
    console.log('Clearing existing data...')
    await db.delete(rolePermissions)
    await db.delete(userRoles)
    await db.delete(users)
    await db.delete(permissions)
    await db.delete(roles)
    console.log('Existing data cleared')

    // Create initial roles and permissions
    const seedRolesAndPermissions = async () => {
        console.log('Creating roles...')
        
        // Create comprehensive roles matching the UI mockups
        const roleData = [
            { name: 'admin', description: 'Full system access' },
            { name: 'editor', description: 'Can edit translations and manage releases' },
            { name: 'translator', description: 'Can translate content' },
            { name: 'viewer', description: 'Read-only access' },
            { name: 'user', description: 'Default user role' },
            { name: 'service', description: 'Service account role' }
        ]

        const createdRoles = await db.insert(roles).values(roleData).returning()
        console.log(`Created ${createdRoles.length} roles`)

        // Create comprehensive permissions
        console.log('Creating permissions...')
        const permissionData = [
            // User management permissions
            { name: 'users:read', description: 'View users', resource: 'users', action: 'read' },
            { name: 'users:create', description: 'Create users', resource: 'users', action: 'create' },
            { name: 'users:update', description: 'Update users', resource: 'users', action: 'update' },
            { name: 'users:delete', description: 'Delete users', resource: 'users', action: 'delete' },
            { name: 'users:manage', description: 'Manage user roles and permissions', resource: 'users', action: 'manage' },
            
            // Role management permissions  
            { name: 'roles:read', description: 'View roles', resource: 'roles', action: 'read' },
            { name: 'roles:assign', description: 'Assign roles to users', resource: 'roles', action: 'assign' },
            
            // Translation permissions
            { name: 'translations:read', description: 'Read translations', resource: 'translations', action: 'read' },
            { name: 'translations:write', description: 'Write translations', resource: 'translations', action: 'write' },
            { name: 'translations:publish', description: 'Publish translations', resource: 'translations', action: 'publish' },
            { name: 'translations:review', description: 'Review translations', resource: 'translations', action: 'review' },
            
            // Brand management permissions
            { name: 'brands:read', description: 'View brands', resource: 'brands', action: 'read' },
            { name: 'brands:write', description: 'Manage brands', resource: 'brands', action: 'write' },
            
            // Content permissions
            { name: 'content:read', description: 'View content', resource: 'content', action: 'read' },
            { name: 'content:write', description: 'Edit content', resource: 'content', action: 'write' },
            { name: 'content:delete', description: 'Delete content', resource: 'content', action: 'delete' }
        ]

        const createdPermissions = await db.insert(permissions).values(permissionData).returning()
        console.log(`Created ${createdPermissions.length} permissions`)

        // Assign permissions to roles
        console.log('Assigning permissions to roles...')
        
        // Admin gets all permissions
        const adminRole = createdRoles.find(r => r.name === 'admin')!
        const adminPermissions = createdPermissions.map(p => ({
            roleId: adminRole.id,
            permissionId: p.id
        }))
        
        // Editor permissions
        const editorRole = createdRoles.find(r => r.name === 'editor')!
        const editorPermissionNames = ['users:read', 'roles:read', 'translations:read', 'translations:write', 'translations:publish', 'translations:review', 'brands:read', 'content:read', 'content:write']
        const editorPermissions = createdPermissions
            .filter(p => editorPermissionNames.includes(p.name))
            .map(p => ({ roleId: editorRole.id, permissionId: p.id }))
        
        // Translator permissions
        const translatorRole = createdRoles.find(r => r.name === 'translator')!
        const translatorPermissionNames = ['translations:read', 'translations:write', 'content:read']
        const translatorPermissions = createdPermissions
            .filter(p => translatorPermissionNames.includes(p.name))
            .map(p => ({ roleId: translatorRole.id, permissionId: p.id }))
        
        // Viewer permissions
        const viewerRole = createdRoles.find(r => r.name === 'viewer')!
        const viewerPermissionNames = ['translations:read', 'brands:read', 'content:read']
        const viewerPermissions = createdPermissions
            .filter(p => viewerPermissionNames.includes(p.name))
            .map(p => ({ roleId: viewerRole.id, permissionId: p.id }))
        
        // User permissions (basic read access)
        const userRole = createdRoles.find(r => r.name === 'user')!
        const userPermissionNames = ['content:read']
        const userPermissions = createdPermissions
            .filter(p => userPermissionNames.includes(p.name))
            .map(p => ({ roleId: userRole.id, permissionId: p.id }))

        // Insert all role-permission assignments
        const allRolePermissions = [
            ...adminPermissions,
            ...editorPermissions, 
            ...translatorPermissions,
            ...viewerPermissions,
            ...userPermissions
        ]
        
        await db.insert(rolePermissions).values(allRolePermissions)
        console.log(`Created ${allRolePermissions.length} role-permission assignments`)

        return createdRoles
    }

    const createdRoles = await seedRolesAndPermissions()

    // Create diverse test users for the UI
    console.log('Creating test users...')
    const testUsers = [
        {
            email: 'alice@company.com',
            name: 'Alice Johnson',
            status: 'active' as const,
            azure_ad_oid: 'alice-azure-oid',
            azure_ad_tid: 'tenant-123',
            last_login_at: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        },
        {
            email: 'bob@company.com', 
            name: 'Bob Smith',
            status: 'active' as const,
            azure_ad_oid: 'bob-azure-oid',
            azure_ad_tid: 'tenant-123',
            last_login_at: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        },
        {
            email: 'carol@company.com',
            name: 'Carol Davis',
            status: 'active' as const,
            azure_ad_oid: 'carol-azure-oid', 
            azure_ad_tid: 'tenant-123',
            last_login_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
        },
        {
            email: 'david@company.com',
            name: 'David Wilson',
            status: 'inactive' as const,
            azure_ad_oid: 'david-azure-oid',
            azure_ad_tid: 'tenant-123',
            last_login_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 1 week ago
        },
        {
            email: 'eve@company.com',
            name: 'Eve Brown',
            status: 'active' as const,
            azure_ad_oid: 'eve-azure-oid',
            azure_ad_tid: 'tenant-123', 
            last_login_at: new Date(Date.now() - 2 * 7 * 24 * 60 * 60 * 1000) // 2 weeks ago
        },
        {
            email: 'frank@company.com',
            name: 'Frank Miller',
            status: 'active' as const,
            azure_ad_oid: null, // Local user without Azure AD
            azure_ad_tid: null,
            last_login_at: null // Never logged in
        },
        {
            email: 'grace@company.com',
            name: 'Grace Lee',
            status: 'active' as const,
            azure_ad_oid: 'grace-azure-oid',
            azure_ad_tid: 'tenant-123',
            last_login_at: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
        },
        {
            email: 'henry@company.com',
            name: 'Henry Taylor',
            status: 'active' as const,
            azure_ad_oid: 'henry-azure-oid',
            azure_ad_tid: 'tenant-123',
            last_login_at: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
        }
    ]

    const sampleUsers = await db.insert(users).values(testUsers).returning()
    console.log(`Created ${sampleUsers.length} test users`)

    // Assign roles to users to demonstrate different role combinations
    console.log('Assigning roles to test users...')
    const userRoleAssignments = [
        // Alice - Admin + Editor (multiple roles)
        { userId: sampleUsers[0].id, roleId: createdRoles.find(r => r.name === 'admin')?.id },
        { userId: sampleUsers[0].id, roleId: createdRoles.find(r => r.name === 'editor')?.id },
        
        // Bob - Editor + Translator
        { userId: sampleUsers[1].id, roleId: createdRoles.find(r => r.name === 'editor')?.id },
        { userId: sampleUsers[1].id, roleId: createdRoles.find(r => r.name === 'translator')?.id },
        
        // Carol - Translator only
        { userId: sampleUsers[2].id, roleId: createdRoles.find(r => r.name === 'translator')!.id },
        
        // David - Viewer only (inactive user)
        { userId: sampleUsers[3].id, roleId: createdRoles.find(r => r.name === 'viewer')!.id },
        
        // Eve - Editor only
        { userId: sampleUsers[4].id, roleId: createdRoles.find(r => r.name === 'editor')!.id },
        
        // Frank - User only (basic role)  
        { userId: sampleUsers[5].id, roleId: createdRoles.find(r => r.name === 'user')!.id },
        
        // Grace - Editor + Viewer
        { userId: sampleUsers[6].id, roleId: createdRoles.find(r => r.name === 'editor')!.id },
        { userId: sampleUsers[6].id, roleId: createdRoles.find(r => r.name === 'viewer')!.id },
        
        // Henry - Translator only
        { userId: sampleUsers[7].id, roleId: createdRoles.find(r => r.name === 'translator')!.id }
    ]

    await db.insert(userRoles).values(userRoleAssignments)
    console.log(`Created ${userRoleAssignments.length} user-role assignments`)

    console.log('\n✅ Database seeded successfully!')
    console.log('Created test data:')
    console.log(`  - ${createdRoles.length} roles (admin, editor, translator, viewer, user, service)`)
    console.log(`  - 16 permissions with proper RBAC assignments`)
    console.log(`  - ${sampleUsers.length} test users with various role combinations`)
    console.log(`  - Users include different statuses (active/inactive) and login times`)
    console.log(`  - Ready for testing the user management UI!`)
}


async function main() {
    await seed()
    process.exit(0)
}

main().catch((err) => {
    console.error('Seeding failed!')
    console.error(err)
    process.exit(1)
})
    .finally(() => {
        process.exit(0);
    });