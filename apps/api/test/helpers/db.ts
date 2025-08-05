import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@cms/db/schema'
import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

let testDb: PostgresJsDatabase<typeof schema> | null = null
let testClient: postgres.Sql | null = null

export function getTestDb(): PostgresJsDatabase<typeof schema> {
    if (!testDb) {
        // Use the main DATABASE_URL for tests
        const databaseUrl = process.env.DATABASE_URL || "postgresql://dev:dev123@localhost:5432/cms_platform_dev"

        testClient = postgres(databaseUrl)
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

// Helper for tests that need a clean database before each test
export async function setupTestDatabase(): Promise<void> {
    await resetDatabase()
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