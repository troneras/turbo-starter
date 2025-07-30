import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@cms/db/schema'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

let testDb: PostgresJsDatabase<typeof schema> | null = null
let testClient: postgres.Sql | null = null

export function getTestDb(): PostgresJsDatabase<typeof schema> {
    if (!testDb) {
        // Use the same logic as build-app.ts to ensure consistency
        const testDatabaseUrl = process.env.TEST_DATABASE_URL ||
            "postgresql://dev:dev123@localhost:5433/cms_platform_test"

        testClient = postgres(testDatabaseUrl)
        testDb = drizzle(testClient, { schema })
    }
    return testDb
}

export async function closeTestDb(): Promise<void> {
    if (testClient) {
        await testClient.end()
        testClient = null
        testDb = null
    }
}

export async function cleanDatabase(): Promise<void> {
    const db = getTestDb()

    // Get all table names from the schema
    const tableNames = Object.keys(schema).filter(key =>
        schema[key as keyof typeof schema] &&
        typeof schema[key as keyof typeof schema] === 'object' &&
        'tableName' in (schema[key as keyof typeof schema] as any)
    )

    // Delete all data from tables in the correct order (to handle foreign keys)
    // Start with dependent tables first
    const orderedTables = [
        'user_audit_logs',    // References users
        'releases',
        'role_permissions',   // Junction table
        'user_roles',        // Junction table 
        'service_tokens',    // References users
        'roles',             // References users (created_by, updated_by) and self (parent_role_id)
        'users',             // Base user table
        'permissions',       // Base permissions table
        'brands'             // Base table
    ]

    for (const tableName of orderedTables) {
        try {
            await db.execute(`DELETE FROM ${tableName}`)
        } catch (error) {
            // Table might not exist yet, ignore error
            console.warn(`Could not clean table ${tableName}:`, error)
        }
    }
}

export async function resetDatabase(): Promise<void> {
    await cleanDatabase()
    // Add any default data seeding here if needed
    // For example, default roles or permissions
}

export async function seedTestData(): Promise<void> {
    const db = getTestDb()

    // Seed essential permissions and roles for tests
    try {
        // Create essential permissions used in tests
        const testPermissions = [
            { name: 'users:read', description: 'Read users', resource: 'users', action: 'read', category: 'users' },
            { name: 'users:create', description: 'Create users', resource: 'users', action: 'create', category: 'users' },
            { name: 'users:update', description: 'Update users', resource: 'users', action: 'update', category: 'users' },
            { name: 'users:delete', description: 'Delete users', resource: 'users', action: 'delete', category: 'users' },
            { name: 'translations:read', description: 'Read translations', resource: 'translations', action: 'read', category: 'content' },
            { name: 'translations:write', description: 'Write translations', resource: 'translations', action: 'write', category: 'content' },
            { name: 'translations:create', description: 'Create translations', resource: 'translations', action: 'create', category: 'content' },
            { name: 'translations:update', description: 'Update translations', resource: 'translations', action: 'update', category: 'content' },
            { name: 'translations:delete', description: 'Delete translations', resource: 'translations', action: 'delete', category: 'content' },
            { name: 'translations:publish', description: 'Publish translations', resource: 'translations', action: 'publish', category: 'content' },
            { name: 'releases:create', description: 'Create releases', resource: 'releases', action: 'create', category: 'releases' },
            { name: 'releases:read', description: 'Read releases', resource: 'releases', action: 'read', category: 'releases' },
            { name: 'releases:update', description: 'Update releases', resource: 'releases', action: 'update', category: 'releases' },
            { name: 'releases:close', description: 'Close releases', resource: 'releases', action: 'close', category: 'releases' },
            { name: 'releases:deploy', description: 'Deploy releases', resource: 'releases', action: 'deploy', category: 'releases' },
            { name: 'releases:rollback', description: 'Rollback releases', resource: 'releases', action: 'rollback', category: 'releases' },
            { name: 'releases:delete', description: 'Delete releases', resource: 'releases', action: 'delete', category: 'releases' },
            { name: 'releases:preview', description: 'Preview releases', resource: 'releases', action: 'preview', category: 'releases' },
            { name: 'releases:diff', description: 'Diff releases', resource: 'releases', action: 'diff', category: 'releases' },
            { name: 'brands:read', description: 'Read brands', resource: 'brands', action: 'read', category: 'brands' },
            { name: 'brands:create', description: 'Create brands', resource: 'brands', action: 'create', category: 'brands' },
            { name: 'brands:update', description: 'Update brands', resource: 'brands', action: 'update', category: 'brands' },
            { name: 'brands:delete', description: 'Delete brands', resource: 'brands', action: 'delete', category: 'brands' }
        ]

        await db.insert(schema.permissions).values(testPermissions).onConflictDoNothing()

        // Create essential roles for tests
        const testRoles = [
            { name: 'admin', description: 'Administrator role' },
            { name: 'editor', description: 'Editor role' },
            { name: 'user', description: 'Basic user role' },
            { name: 'service', description: 'Service role' }
        ]

        await db.insert(schema.roles).values(testRoles).onConflictDoNothing()

    } catch (error) {
        // Ignore seeding errors in tests - some tests may run with empty DB
        console.warn('Test data seeding error (ignored):', error)
    }
}

// Helper for tests that need a clean database before each test
export async function setupTestDatabase(): Promise<void> {
    await resetDatabase()
    await seedTestData()
}

// Helper for tests that need to check database state
export async function getDbStats(): Promise<any> {
    const db = getTestDb()

    const stats: any = {}
    const tables = ['users', 'roles', 'permissions', 'brands', 'service_tokens', 'user_audit_logs', 'user_roles', 'role_permissions']

    for (const table of tables) {
        try {
            const result = await db.execute(`SELECT COUNT(*) as count FROM ${table}`)
            stats[table] = parseInt((result as any)[0]?.count || '0')
        } catch (error) {
            stats[table] = 0
        }
    }

    return stats
} 