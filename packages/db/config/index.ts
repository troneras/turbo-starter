import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

// Create a factory function that takes the connection string
export function createDb(connectionString: string) {
  const queryClient = postgres(connectionString)
  return drizzle(queryClient)
}

// Create a factory function for migration client
export function createMigrationClient(connectionString: string) {
  return postgres(connectionString, { max: 1 })
}

// Keep the old export for compatibility during migration
const connectionString =
  process.env.DATABASE_URL || "postgresql://dev:dev123@localhost:5432/cms_platform_dev";
export const migrationClient = postgres(connectionString, { max: 1 });
export const db = drizzle(postgres(connectionString));