import { test, expect, describe, beforeAll, afterAll } from 'bun:test'
import { build } from '../helpers/build-app.js'
import type { FastifyInstance } from 'fastify'
import { users } from '@cms/db/schema'
import { eq } from 'drizzle-orm'

describe('Release Routes', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await build()
    
    // Create test users matching the mock JWT tokens
    const testUsers = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'admin@example.com',
        name: 'Admin User',
        azure_ad_oid: 'admin-oid',
        azure_ad_tid: 'admin-tid'
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        email: 'editor@example.com',
        name: 'Editor User',
        azure_ad_oid: 'editor-oid',
        azure_ad_tid: 'editor-tid'
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        email: 'user@example.com',
        name: 'Basic User',
        azure_ad_oid: 'user-oid',
        azure_ad_tid: 'user-tid'
      }
    ]
    
    // Create users if they don't exist
    for (const userData of testUsers) {
      const existing = await app.db.select().from(users)
        .where(eq(users.id, userData.id)).limit(1)
      
      if (existing.length === 0) {
        await app.db.insert(users).values(userData)
      }
    }
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /api/releases', () => {
    test('should allow editor to create release', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/releases',
        headers: {
          authorization: 'Bearer mock-editor-jwt-token'
        },
        payload: {
          name: 'Test Release',
          description: 'Test release created by editor'
        }
      })

      if (response.statusCode !== 201) {
        console.log('Editor create release error:', response.body)
      }
      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.name).toBe('Test Release')
      expect(body.status).toBe('OPEN')
      expect(body.createdBy).toBe('22222222-2222-2222-2222-222222222222')
    })

    test('should allow admin to create release', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/releases',
        headers: {
          authorization: 'Bearer mock-admin-jwt-token'
        },
        payload: {
          name: 'Admin Test Release',
          description: 'Test release created by admin'
        }
      })

      if (response.statusCode !== 201) {
        console.log('Admin create release error:', response.body)
      }
      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.name).toBe('Admin Test Release')
      expect(body.status).toBe('OPEN')
      expect(body.createdBy).toBe('11111111-1111-1111-1111-111111111111')
    })

    test('should deny regular user from creating release', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/releases',
        headers: {
          authorization: 'Bearer mock-user-jwt-token'
        },
        payload: {
          name: 'User Test Release',
          description: 'Should fail'
        }
      })

      expect(response.statusCode).toBe(403)
      const body = JSON.parse(response.body)
      expect(body.error).toBe('Forbidden')
    })

    test('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/releases',
        payload: {
          name: 'Unauthenticated Release',
          description: 'Should fail'
        }
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /api/releases', () => {
    test('should allow authenticated users to list releases', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/releases',
        headers: {
          authorization: 'Bearer mock-user-jwt-token'
        }
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('releases')
      expect(body).toHaveProperty('total')
      expect(body).toHaveProperty('limit')
      expect(body).toHaveProperty('offset')
    })
  })
})