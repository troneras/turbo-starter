import { db } from './config'
import { users } from './schema'

export async function seed() {
    console.log('Seeding database...')

    // Clear existing data in reverse dependency order
    console.log('Clearing existing data...')
    await db.delete(users)
    console.log('Existing data cleared')

    // Create sample users
    const sampleUsers = await db.insert(users).values([
        {
            email: 'john.doe@example.com',
            name: 'John Doe',
        },
        {
            email: 'jane.smith@example.com',
            name: 'Jane Smith',
        },
    ]).returning()

    if (!sampleUsers || sampleUsers.length === 0 || !sampleUsers[0] || !sampleUsers[1]) {
        throw new Error('Failed to create sample users')
    }

    console.log(`Created ${sampleUsers.length} users`)


    console.log('Database seeded successfully!')
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