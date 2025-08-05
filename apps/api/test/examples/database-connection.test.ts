import { it, describe, expect, afterEach } from 'bun:test'
import { build } from '../helpers/build-app'
import { getTestDb } from '../helpers/db'

describe('Database Connection Verification', () => {
    let app: any

    afterEach(async () => {
        if (app) {
            await app.close()
        }
    })
    
    it('Fastify app connects to test database', async () => {
        app = await build()
        await app.ready()
        
        // Check that the readiness endpoint can connect to database
        const res = await app.inject({
            url: '/health/readiness'
        })
        
        expect(res.statusCode).toBe(200)
        const health = JSON.parse(res.payload)
        expect(health.status).toBe('ok')
        expect(health.services.database).toBe('up')
        
        console.log('✅ Fastify app successfully connected to test database')
    })
    
    it('Direct database helper connects to test database', async () => {
        app = await build()
        await app.ready()
        
        const db = getTestDb()
        
        // Try a simple query
        const result = await db.execute('SELECT current_database() as db_name')
        const dbName = (result as any)[0]?.db_name
        
        console.log('Connected to database:', dbName)
        
        // Should be connected to the development database (shared with tests)
        expect(dbName).toBe('cms_platform_dev')
        
        console.log('✅ Direct database helper connected to test database')
    })
    
    it('Environment variables are set correctly for tests', async () => {
        app = await build()
        await app.ready()
        
        // Check that environment variables are set correctly
        expect(process.env.DATABASE_URL).toBeDefined()
        expect(process.env.JWT_SECRET).toBeDefined()
        expect(process.env.NODE_ENV).toBe('test')
        
        // DATABASE_URL should use the development database (tests share same DB)
        expect(process.env.DATABASE_URL).toContain('cms_platform_dev')
        
        console.log('✅ Environment variables configured correctly for tests')
        console.log('DATABASE_URL:', process.env.DATABASE_URL)
        console.log('NODE_ENV:', process.env.NODE_ENV)
    })
    
}) 