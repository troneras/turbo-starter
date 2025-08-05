import { test, expect, describe, beforeAll, afterAll } from 'bun:test'
import { build } from '../helpers/build-app.js'
import type { FastifyInstance } from 'fastify'

describe('Release Routes', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await build()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /api/releases', () => {
    test('should create release successfully', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/releases',
        headers: {
          authorization: 'Bearer mock-admin-jwt-token'
        },
        payload: {
          name: 'Test Release',
          description: 'Test release created by admin'
        }
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.name).toBe('Test Release')
      expect(body.status).toBe('OPEN')
      expect(body.createdBy).toBeDefined() // Just check it exists, don't check exact UUID
    })
  })

  describe('GET /api/releases', () => {
    test('should list releases successfully', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/releases',
        headers: {
          authorization: 'Bearer mock-admin-jwt-token'
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