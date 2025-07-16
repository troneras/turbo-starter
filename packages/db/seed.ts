import { db } from './config'
import { users, roles, permissions, rolePermissions } from './schema'
import { eq, and } from 'drizzle-orm'

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

    // Create initial roles and permissions if they don't exist
    const seedRolesAndPermissions = async () => {
        // Create basic roles
        const basicRoles = ['user', 'admin', 'service']

        for (const roleName of basicRoles) {
            const existingRole = await db
                .select()
                .from(roles)
                .where(eq(roles.name, roleName))
                .limit(1)

            if (!existingRole) {
                await db
                    .insert(roles)
                    .values({ name: roleName })
            }
        }

        // Create basic permissions
        const basicPermissions = [
            { name: 'users.read', description: 'Read user data', resource: 'users', action: 'read' },
            { name: 'users.write', description: 'Write user data', resource: 'users', action: 'write' },
            { name: 'users.delete', description: 'Delete user data', resource: 'users', action: 'delete' },
            { name: 'translations.read', description: 'Read translations', resource: 'translations', action: 'read' },
            { name: 'translations.write', description: 'Write translations', resource: 'translations', action: 'write' },
            { name: 'brands.read', description: 'Read brands', resource: 'brands', action: 'read' },
            { name: 'brands.write', description: 'Write brands', resource: 'brands', action: 'write' },
            { name: 'roles.read', description: 'Read roles', resource: 'roles', action: 'read' }
        ]

        for (const permission of basicPermissions) {
            const existingPermission = await db
                .select()
                .from(permissions)
                .where(eq(permissions.name, permission.name))
                .limit(1)

            if (existingPermission.length === 0) {
                await db
                    .insert(permissions)
                    .values(permission)
            }
        }

        // Assign permissions to admin role
        const adminRole = (await db
            .select()
            .from(roles)
            .where(eq(roles.name, 'admin'))
            .limit(1)
        )[0] || null
        if (adminRole) {
            const allPermissions = await db
                .select()
                .from(permissions)

            for (const permission of allPermissions) {
                const existingAssignment = await db
                    .select()
                    .from(rolePermissions)
                    .where(and(
                        eq(rolePermissions.roleId, adminRole.id),
                        eq(rolePermissions.permissionId, permission.id)))
                    .limit(1)

                if (existingAssignment.length === 0) {
                    await db
                        .insert(rolePermissions)
                        .values({
                            roleId: adminRole.id,
                            permissionId: permission.id
                        })
                }
            }
        }

        // Assign basic permissions to user role
        const userRole = (await db
            .select()
            .from(roles)
            .where(eq(roles.name, 'user'))
            .limit(1)
        )[0] || null

        if (userRole) {
            const userPermissions = await db
                .select()
                .from(permissions)
                .where(eq(permissions.action, 'read'))

            for (const permission of userPermissions) {
                const existingAssignment = await db
                    .select()
                    .from(rolePermissions)
                    .where(and(
                        eq(rolePermissions.roleId, userRole.id),
                        eq(rolePermissions.permissionId, permission.id)
                    ))
                    .limit(1)

                if (existingAssignment.length === 0) {
                    await db
                        .insert(rolePermissions)
                        .values({
                            roleId: userRole.id,
                            permissionId: permission.id
                        })
                }
            }
        }
    }


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