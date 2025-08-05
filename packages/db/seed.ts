import { db } from './config'
import { users, userRoles, userAuditLogs, releases, roles, permissions, rolePermissions } from './schema'
import { DEFAULT_ROLES } from '../../apps/api/src/plugins/app/permissions/default-roles'

export async function seed() {
    console.log('Seeding database...')

    // Clear existing data in correct order to handle foreign key constraints
    console.log('Clearing existing data...')
    
    // Clear all data - let the API rebuild roles and permissions
    // Use a safe approach that handles foreign key constraints
    const tablesToClear = [
        'role_permissions', 'user_roles', 'user_audit_logs',
        'audit_events', // Clear audit events first due to FK constraints
        'entity_versions', 'relation_versions', 'releases', // Entity and release tables first  
        'users', 'permissions', 'roles'
    ]
    
    for (const tableName of tablesToClear) {
        try {
            await db.execute(`DELETE FROM "${tableName}"`)
            console.log(`Cleared ${tableName}`)
        } catch (error) {
            console.warn(`Could not clear ${tableName} (might not exist):`, (error as any).message)
        }
    }
    
    console.log('Existing data cleared')

    // Create essential users
    console.log('Creating essential users...')
    
    const essentialUsers = [
        // System user for automated operations
        {
            id: '00000000-0000-0000-0000-000000000000',
            email: 'system@internal',
            name: 'System User',
            status: 'active' as const,
            is_test_user: false,
            azure_ad_oid: null,
            azure_ad_tid: null,
            last_login_at: null
        },
        // Test authentication users with known UUIDs for development
        {
            id: '11111111-1111-1111-1111-111111111111',
            email: 'admin@example.com',
            name: 'Admin User',
            status: 'active' as const,
            is_test_user: true,
            azure_ad_oid: null,
            azure_ad_tid: null,
            last_login_at: new Date()
        },
        {
            id: '22222222-2222-2222-2222-222222222222',
            email: 'editor@example.com',
            name: 'Editor User',
            status: 'active' as const,
            is_test_user: true,
            azure_ad_oid: null,
            azure_ad_tid: null,
            last_login_at: new Date()
        },
        {
            id: '33333333-3333-3333-3333-333333333333',
            email: 'user@example.com',
            name: 'Basic User',
            status: 'active' as const,
            is_test_user: true,
            azure_ad_oid: null,
            azure_ad_tid: null,
            last_login_at: new Date()
        }
    ]

    // Create sample test users for UI development
    const sampleUsers = [
        {
            email: 'alice@company.com',
            name: 'Alice Johnson',
            status: 'active' as const,
            is_test_user: true,
            azure_ad_oid: 'alice-azure-oid',
            azure_ad_tid: 'tenant-123',
            last_login_at: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        },
        {
            email: 'bob@company.com',
            name: 'Bob Smith',
            status: 'active' as const,
            is_test_user: true,
            azure_ad_oid: 'bob-azure-oid',
            azure_ad_tid: 'tenant-123',
            last_login_at: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        },
        {
            email: 'carol@company.com',
            name: 'Carol Davis',
            status: 'active' as const,
            is_test_user: true,
            azure_ad_oid: 'carol-azure-oid',
            azure_ad_tid: 'tenant-123',
            last_login_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
        },
        {
            email: 'david@company.com',
            name: 'David Wilson',
            status: 'inactive' as const,
            is_test_user: true,
            azure_ad_oid: 'david-azure-oid',
            azure_ad_tid: 'tenant-123',
            last_login_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 1 week ago
        },
        {
            email: 'eve@company.com',
            name: 'Eve Brown',
            status: 'active' as const,
            is_test_user: true,
            azure_ad_oid: 'eve-azure-oid',
            azure_ad_tid: 'tenant-123',
            last_login_at: new Date(Date.now() - 2 * 7 * 24 * 60 * 60 * 1000) // 2 weeks ago
        },
        {
            email: 'frank@company.com',
            name: 'Frank Miller',
            status: 'active' as const,
            is_test_user: true,
            azure_ad_oid: null, // Local user without Azure AD
            azure_ad_tid: null,
            last_login_at: null // Never logged in
        }
    ]

    // Insert all users
    const allUsers = [...essentialUsers, ...sampleUsers]
    const createdUsers = await db.insert(users).values(allUsers).returning()
    console.log(`Created ${createdUsers.length} users`)

    // Create roles (without permissions - those are managed by the API)
    console.log('Creating roles...')
    const roleData = DEFAULT_ROLES.map(role => ({
        name: role.name,
        description: role.description,
        created_by: '00000000-0000-0000-0000-000000000000' // System user
    }))
    
    const createdRoles = await db.insert(roles).values(roleData).returning()
    console.log(`Created ${createdRoles.length} roles`)

    // Assign roles to specific test users
    console.log('Assigning roles to users...')
    const roleAssignments = [
        // Admin user gets admin role
        { 
            userId: '11111111-1111-1111-1111-111111111111', 
            roleId: createdRoles.find(r => r.name === 'admin')!.id 
        },
        // Editor user gets editor role
        { 
            userId: '22222222-2222-2222-2222-222222222222', 
            roleId: createdRoles.find(r => r.name === 'editor')!.id 
        },
        // Basic user gets user role
        { 
            userId: '33333333-3333-3333-3333-333333333333', 
            roleId: createdRoles.find(r => r.name === 'user')!.id 
        },
        // System user gets service role
        { 
            userId: '00000000-0000-0000-0000-000000000000', 
            roleId: createdRoles.find(r => r.name === 'service')!.id 
        }
    ]

    await db.insert(userRoles).values(roleAssignments)
    console.log(`Assigned roles to ${roleAssignments.length} users`)

    console.log('\n✅ Database seeded successfully!')
    console.log('Created:')
    console.log(`  - 1 system user for automated operations`)
    console.log(`  - 3 test authentication users (admin, editor, user)`)
    console.log(`  - ${sampleUsers.length} sample users for UI development`)
    console.log(`  - ${createdRoles.length} system roles`)
    console.log(`  - Role assignments for test users`)
    console.log(`  - Permissions will be managed automatically by the API`)
    console.log(`  - Ready for development and testing!`)
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