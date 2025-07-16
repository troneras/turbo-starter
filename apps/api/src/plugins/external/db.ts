import fp from 'fastify-plugin'
import fastifyPostgres from '@fastify/postgres'
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '@cms/db/schema'

declare module 'fastify' {
    interface FastifyInstance {
        db: PostgresJsDatabase<typeof schema>
    }
}

export default fp(async function (fastify) {
    const connectionString = fastify.config.DATABASE_URL

    // Create postgres client
    const client = postgres(connectionString)

    // Create drizzle instance
    const db = drizzle(client, { schema })

    // Decorate fastify with db
    fastify.decorate('db', db)

    // Close connection on app shutdown
    fastify.addHook('onClose', async () => {
        await client.end()
    })
}, {
    name: 'db',
    dependencies: ['env']
}) 