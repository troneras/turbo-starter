import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { sql } from 'drizzle-orm'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const connectionString = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://dev:dev123@localhost:5432/cms_platform_dev'

// Create a table to track custom migrations
const createMigrationsTable = sql`
  CREATE TABLE IF NOT EXISTS custom_migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`

interface Migration {
  filename: string
  content: string
}

export async function runCustomMigrations() {
  const client = postgres(connectionString)
  const db = drizzle(client)

  try {
    // Create migrations tracking table
    await db.execute(createMigrationsTable)
    console.log('✓ Migrations table ready')

    // Get list of applied migrations
    const appliedMigrations = await db.execute<{ filename: string }>(
      sql`SELECT filename FROM custom_migrations`
    )
    const appliedSet = new Set(appliedMigrations.map(m => m.filename))

    // Read all SQL files from the migrations directory
    const migrationsDir = join(__dirname, 'migrations')
    const files = await readdir(migrationsDir)
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort()

    // Load migrations that haven't been applied
    const pendingMigrations: Migration[] = []
    for (const filename of sqlFiles) {
      if (!appliedSet.has(filename)) {
        const content = await readFile(join(migrationsDir, filename), 'utf-8')
        pendingMigrations.push({ filename, content })
      }
    }

    if (pendingMigrations.length === 0) {
      console.log('No pending custom migrations')
      return
    }

    console.log(`Found ${pendingMigrations.length} pending migrations`)

    // Apply each migration in order
    for (const migration of pendingMigrations) {
      console.log(`Applying ${migration.filename}...`)

      try {
        // Execute the migration
        await db.execute(sql.raw(migration.content))

        // Record that it was applied
        await db.execute(
          sql`INSERT INTO custom_migrations (filename) VALUES (${migration.filename})`
        )

        console.log(`✓ Applied ${migration.filename}`)
      } catch (error) {
        console.error(`✗ Failed to apply ${migration.filename}:`, error)
        throw error
      }
    }

    console.log('\nAll custom migrations applied successfully!')

  } finally {
    await client.end()
  }
}

// Run if called directly
if (import.meta.main) {
  runCustomMigrations().catch(console.error)
}