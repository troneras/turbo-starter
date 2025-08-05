#!/usr/bin/env bun

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { permissions, roles, rolePermissions } from '@cms/db/schema'
import { eq, sql } from 'drizzle-orm'

// Connect to database
const client = postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/cms')
const db = drizzle(client)

async function checkPermissions() {
    console.log('\n=== CHECKING PERMISSION SYSTEM ===\n')

    // Count permissions
    const permissionCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(permissions)
    console.log(`Total permissions: ${permissionCount[0]?.count ?? 0}`)

    // List some permissions
    const samplePermissions = await db
        .select()
        .from(permissions)
        .limit(10)
        .orderBy(permissions.name)
    
    console.log('\nSample permissions:')
    samplePermissions.forEach(p => {
        console.log(`  - ${p.name} (${p.resource}:${p.action})`)
    })

    // Check roles
    const allRoles = await db
        .select()
        .from(roles)
        .orderBy(roles.name)
    
    console.log('\nRoles:')
    for (const role of allRoles) {
        const permCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(rolePermissions)
            .where(eq(rolePermissions.roleId, role.id))
        
        console.log(`  - ${role.name}: ${permCount[0]?.count ?? 0} permissions`)
    }

    // Check admin has all permissions
    const adminRole = allRoles.find(r => r.name === 'admin')
    if (adminRole) {
        const adminPermCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(rolePermissions)
            .where(eq(rolePermissions.roleId, adminRole.id))
        
        console.log(`\nAdmin role has ${adminPermCount[0]?.count ?? 0} of ${permissionCount[0]?.count ?? 0} permissions`)
        
        if ((adminPermCount[0]?.count ?? 0) === (permissionCount[0]?.count ?? 0)) {
            console.log('✅ Admin has ALL permissions!')
        } else {
            console.log('❌ Admin is missing some permissions')
        }
    }

    await client.end()
}

checkPermissions().catch(console.error)