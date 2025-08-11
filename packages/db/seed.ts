import { db } from './config'
import { users, userRoles, userAuditLogs, releases, roles, permissions, rolePermissions, locales, jurisdictions } from './schema'
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
        'brand_locales', 'brand_jurisdictions', // Clear junction tables first
        'users', 'permissions', 'roles', 'locales', 'jurisdictions', 'brands'
    ]
    
    for (const tableName of tablesToClear) {
        try {
            // Use CASCADE to handle foreign key constraints properly
            await db.execute(`TRUNCATE TABLE "${tableName}" CASCADE`)
            console.log(`Cleared ${tableName}`)
        } catch (error) {
            console.warn(`Could not clear ${tableName} (might not exist):`, (error as any).message)
        }
    }
    
    // Additional safety check - ensure users table is empty
    try {
        await db.execute(`DELETE FROM "users"`)
        console.log('Ensured users table is empty')
    } catch (error) {
        console.warn('Could not clear users table:', (error as any).message)
    }
    
    console.log('Existing data cleared')

    // Create initial locales
    console.log('Creating initial locales...')
    const initialLocales = [
        { code: 'en-US', name: 'English (United States)' },
        { code: 'en-GB', name: 'English (United Kingdom)' },
        { code: 'en-CA', name: 'English (Canada)' },
        { code: 'en-AU', name: 'English (Australia)' },
        { code: 'es-ES', name: 'Spanish (Spain)' },
        { code: 'es-MX', name: 'Spanish (Mexico)' },
        { code: 'es-AR', name: 'Spanish (Argentina)' },
        { code: 'fr-FR', name: 'French (France)' },
        { code: 'fr-CA', name: 'French (Canada)' },
        { code: 'fr-BE', name: 'French (Belgium)' },
        { code: 'de-DE', name: 'German (Germany)' },
        { code: 'de-AT', name: 'German (Austria)' },
        { code: 'de-CH', name: 'German (Switzerland)' },
        { code: 'it-IT', name: 'Italian (Italy)' },
        { code: 'it-CH', name: 'Italian (Switzerland)' },
        { code: 'pt-PT', name: 'Portuguese (Portugal)' },
        { code: 'pt-BR', name: 'Portuguese (Brazil)' },
        { code: 'ru-RU', name: 'Russian (Russia)' },
        { code: 'zh-CN', name: 'Chinese (Simplified, China)' },
        { code: 'zh-TW', name: 'Chinese (Traditional, Taiwan)' },
        { code: 'ja-JP', name: 'Japanese (Japan)' },
        { code: 'ko-KR', name: 'Korean (South Korea)' },
        { code: 'ar-SA', name: 'Arabic (Saudi Arabia)' },
        { code: 'ar-AE', name: 'Arabic (United Arab Emirates)' },
        { code: 'hi-IN', name: 'Hindi (India)' },
        { code: 'nl-NL', name: 'Dutch (Netherlands)' },
        { code: 'nl-BE', name: 'Dutch (Belgium)' },
        { code: 'sv-SE', name: 'Swedish (Sweden)' },
        { code: 'da-DK', name: 'Danish (Denmark)' },
        { code: 'no-NO', name: 'Norwegian (Norway)' },
        { code: 'fi-FI', name: 'Finnish (Finland)' },
        { code: 'pl-PL', name: 'Polish (Poland)' },
        { code: 'tr-TR', name: 'Turkish (Turkey)' },
        { code: 'he-IL', name: 'Hebrew (Israel)' }
    ]
    
    const createdLocales = await db.insert(locales).values(initialLocales).returning()
    console.log(`Created ${createdLocales.length} locales`)

    // Create initial jurisdictions
    console.log('Creating initial jurisdictions...')
    const initialJurisdictions = [
        // Major European gambling jurisdictions
        { code: 'MT', name: 'Malta', description: 'Malta Gaming Authority - Premier European gaming jurisdiction', status: 'active', region: 'Europe' },
        { code: 'IM', name: 'Isle of Man', description: 'Isle of Man Gambling Supervision Commission', status: 'active', region: 'Europe' },
        { code: 'GI', name: 'Gibraltar', description: 'Gibraltar Regulatory Authority', status: 'active', region: 'Europe' },
        { code: 'CY', name: 'Cyprus', description: 'Cyprus Gaming and Casino Supervision Commission', status: 'active', region: 'Europe' },
        { code: 'SE', name: 'Sweden', description: 'Swedish Gambling Authority (Spelinspektionen)', status: 'active', region: 'Europe' },
        { code: 'DK', name: 'Denmark', description: 'Danish Gambling Authority (Spillemyndigheden)', status: 'active', region: 'Europe' },
        { code: 'DE', name: 'Germany', description: 'German Interstate Treaty on Gambling (Glücksspielstaatsvertrag)', status: 'active', region: 'Europe' },
        { code: 'ES', name: 'Spain', description: 'Spanish Directorate General for Gambling Regulation (DGOJ)', status: 'active', region: 'Europe' },
        { code: 'IT', name: 'Italy', description: 'Italian Customs and Monopolies Agency (ADM)', status: 'active', region: 'Europe' },
        
        // Caribbean jurisdictions
        { code: 'CW', name: 'Curacao', description: 'Curacao Gaming Control Board', status: 'active', region: 'Caribbean' },
        { code: 'AI', name: 'Anguilla', description: 'Anguilla Gaming Commission', status: 'active', region: 'Caribbean' },
        
        // Major US states
        { code: 'US-NJ', name: 'New Jersey', description: 'New Jersey Division of Gaming Enforcement', status: 'active', region: 'North America' },
        { code: 'US-NV', name: 'Nevada', description: 'Nevada Gaming Control Board', status: 'active', region: 'North America' },
        { code: 'US-PA', name: 'Pennsylvania', description: 'Pennsylvania Gaming Control Board', status: 'active', region: 'North America' },
        { code: 'US-MI', name: 'Michigan', description: 'Michigan Gaming Control Board', status: 'active', region: 'North America' },
        { code: 'US-CT', name: 'Connecticut', description: 'Connecticut Department of Consumer Protection', status: 'active', region: 'North America' },
        
        // Other major jurisdictions
        { code: 'UK', name: 'United Kingdom', description: 'UK Gambling Commission', status: 'active', region: 'Europe' },
        { code: 'AU', name: 'Australia', description: 'Australian Communications and Media Authority', status: 'active', region: 'Oceania' },
        { code: 'CA-ON', name: 'Ontario', description: 'Alcohol and Gaming Commission of Ontario', status: 'active', region: 'North America' }
    ]
    
    const createdJurisdictions = await db.insert(jurisdictions).values(initialJurisdictions).returning()
    console.log(`Created ${createdJurisdictions.length} jurisdictions`)

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
    console.log(`  - ${createdLocales.length} initial locales with regions (en-US, en-GB, es-ES, fr-FR, de-DE, etc.)`)
    console.log(`  - ${createdJurisdictions.length} initial jurisdictions`)
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