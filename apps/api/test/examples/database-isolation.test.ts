import { it, describe, expect, afterEach, beforeEach } from 'bun:test'
import { build, buildWithoutCleanDb } from '../helpers/build-app'
import { cleanDatabase, getDbStats, getTestDb } from '../helpers/db'

describe('Database Isolation Example', () => {
    let app: any

    afterEach(async () => {
        if (app) {
            await app.close()
        }
    })
    
    it('each test gets a clean database by default', async () => {
        app = await build()
        await app.ready()
        
        // Initially database should be clean (or have only seed data)
        const initialStats = await getDbStats()
        console.log('Initial database stats:', initialStats)
        
        // Create some test data
        const testDb = getTestDb()
        // Note: Adjust this based on your actual schema
        // await testDb.insert(schema.users).values({
        //     email: 'test@example.com',
        //     name: 'Test User'
        // })
        
        const afterInsertStats = await getDbStats()
        console.log('After insert stats:', afterInsertStats)
        
        // The next test should start clean automatically
    })
    
    it('this test also gets a clean database', async () => {
        app = await build()
        await app.ready()
        
        // Should be clean again
        const stats = await getDbStats()
        console.log('Second test database stats:', stats)
        
        // Verify we're starting fresh
        expect(stats.users).toBe(0)
    })
    
    it('can manually clean database mid-test', async () => {
        app = await buildWithoutCleanDb() // Don't auto-clean
        await app.ready()
        
        // Create some data
        const testDb = getTestDb()
        // await testDb.insert(schema.users).values({
        //     email: 'test@example.com',
        //     name: 'Test User'
        // })
        
        // Manually clean
        await cleanDatabase()
        
        // Should be clean now
        const stats = await getDbStats()
        expect(stats.users).toBe(0)
    })
    
    it('health check works with test database', async () => {
        app = await build()
        await app.ready()
        
        const res = await app.inject({
            url: '/health/readiness'
        })
        
        expect(res.statusCode).toBe(200)
        const health = JSON.parse(res.payload)
        expect(health.status).toBe('ok')
        expect(health.services.database).toBe('up')
    })
    
}) 