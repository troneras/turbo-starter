import { it, describe, expect, beforeEach, afterEach } from 'bun:test'
import { build } from '../../../helpers/build-app'
import type { FastifyInstance } from 'fastify'

describe('Translations API', () => {
  let app: FastifyInstance
  let authHeaders: { authorization: string }
  let testUserId: string

  beforeEach(async () => {
    app = await build()
    await app.ready()

    // Create auth token for testing
    const azureToken = Buffer.from(JSON.stringify({
      email: 'test@example.com',
      name: 'Test User',
      oid: 'test-azure-oid',
      tid: 'test-tenant-id'
    })).toString('base64')

    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { azure_token: azureToken }
    })

    const { jwt, user } = JSON.parse(loginRes.payload)
    authHeaders = { authorization: `Bearer ${jwt}` }
    testUserId = user.id
  })

  afterEach(async () => {
    if (app) await app.close()
  })

  describe('Translation Keys', () => {
    it('should create a new translation key', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/translations/keys',
        headers: authHeaders,
        payload: {
          entityKey: 'app.welcome.message',
          description: 'Welcome message shown on homepage'
        }
      })

      if (res.statusCode !== 201) {
        console.error('Error response:', res.payload)
      }
      expect(res.statusCode).toBe(201)
      const key = JSON.parse(res.payload)
      expect(key.entityKey).toBe('app.welcome.message')
      expect(key.description).toBe('Welcome message shown on homepage')
      expect(key.createdBy).toBe(testUserId)
    })

    it('should prevent duplicate translation keys', async () => {
      // Create first key
      await app.inject({
        method: 'POST',
        url: '/api/translations/keys',
        headers: authHeaders,
        payload: {
          entityKey: 'app.duplicate.key',
          description: 'First instance'
        }
      })

      // Try to create duplicate
      const res = await app.inject({
        method: 'POST',
        url: '/api/translations/keys',
        headers: authHeaders,
        payload: {
          entityKey: 'app.duplicate.key',
          description: 'Duplicate instance'
        }
      })

      expect(res.statusCode).toBe(409)
      expect(JSON.parse(res.payload).message).toContain('Duplicate entity')
    })

    it('should list all translation keys', async () => {
      // Create multiple keys
      const keys = [
        { entityKey: 'test.key.1', description: 'First key' },
        { entityKey: 'test.key.2', description: 'Second key' },
        { entityKey: 'test.key.3', description: 'Third key' }
      ]

      for (const key of keys) {
        await app.inject({
          method: 'POST',
          url: '/api/translations/keys',
          headers: authHeaders,
          payload: key
        })
      }

      const res = await app.inject({
        method: 'GET',
        url: '/api/translations/keys',
        headers: authHeaders
      })

      expect(res.statusCode).toBe(200)
      const list = JSON.parse(res.payload)
      expect(list.length).toBeGreaterThanOrEqual(3)
      
      const testKeys = list.filter((k: any) => k.entityKey.startsWith('test.key.'))
      expect(testKeys).toHaveLength(3)
    })

    it('should update a translation key description', async () => {
      // Create key
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/translations/keys',
        headers: authHeaders,
        payload: {
          entityKey: 'app.update.test',
          description: 'Original description'
        }
      })

      const key = JSON.parse(createRes.payload)

      // Update description
      const updateRes = await app.inject({
        method: 'PATCH',
        url: `/api/translations/keys/${key.id}`,
        headers: authHeaders,
        payload: {
          description: 'Updated description'
        }
      })

      expect(updateRes.statusCode).toBe(200)
      const updated = JSON.parse(updateRes.payload)
      expect(updated.description).toBe('Updated description')
      expect(updated.entityKey).toBe('app.update.test') // Should not change
    })

    it('should delete a translation key', async () => {
      // Create key
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/translations/keys',
        headers: authHeaders,
        payload: {
          entityKey: 'app.delete.test',
          description: 'To be deleted'
        }
      })

      const key = JSON.parse(createRes.payload)

      // Delete key
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/translations/keys/${key.id}`,
        headers: authHeaders
      })

      expect(deleteRes.statusCode).toBe(204)

      // Verify it's gone (soft deleted, so won't appear in list)
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/translations/keys',
        headers: authHeaders
      })

      const list = JSON.parse(listRes.payload)
      const deleted = list.find((k: any) => k.entityKey === 'app.delete.test')
      expect(deleted).toBeUndefined()
    })
  })

  describe('Translation Variants', () => {
    let testKeyId: number

    beforeEach(async () => {
      // Create a test key for variants
      const keyRes = await app.inject({
        method: 'POST',
        url: '/api/translations/keys',
        headers: authHeaders,
        payload: {
          entityKey: 'test.variants.key',
          description: 'Key for variant tests'
        }
      })
      testKeyId = JSON.parse(keyRes.payload).id
    })

    it('should create a translation variant', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/translations/variants',
        headers: authHeaders,
        payload: {
          keyId: testKeyId,
          entityKey: 'test.variants.key',
          locale: 'en-US',
          value: 'Hello, World!',
          status: 'DRAFT'
        }
      })

      expect(res.statusCode).toBe(201)
      const variant = JSON.parse(res.payload)
      expect(variant.keyId).toBe(testKeyId)
      expect(variant.locale).toBe('en-US')
      expect(variant.value).toBe('Hello, World!')
      expect(variant.status).toBe('DRAFT')
      expect(variant.brandId).toBeNull()
    })

    it('should create brand-specific variants', async () => {
      // Create generic variant
      await app.inject({
        method: 'POST',
        url: '/api/translations/variants',
        headers: authHeaders,
        payload: {
          keyId: testKeyId,
          entityKey: 'test.variants.key',
          locale: 'en-US',
          value: 'Generic greeting',
          status: 'APPROVED'
        }
      })

      // Create brand-specific variant
      const res = await app.inject({
        method: 'POST',
        url: '/api/translations/variants',
        headers: authHeaders,
        payload: {
          keyId: testKeyId,
          entityKey: 'test.variants.key',
          locale: 'en-US',
          value: 'Brand specific greeting',
          brandId: 1,
          status: 'APPROVED'
        }
      })

      expect(res.statusCode).toBe(201)
      const variant = JSON.parse(res.payload)
      expect(variant.brandId).toBe(1)
      expect(variant.value).toBe('Brand specific greeting')
    })

    it('should list variants with filters', async () => {
      // Create multiple variants
      const variants = [
        { locale: 'en-US', value: 'Hello' },
        { locale: 'es-ES', value: 'Hola' },
        { locale: 'fr-FR', value: 'Bonjour' },
        { locale: 'en-US', value: 'Hi there', brandId: 1 }
      ]

      for (const v of variants) {
        await app.inject({
          method: 'POST',
          url: '/api/translations/variants',
          headers: authHeaders,
          payload: {
            keyId: testKeyId,
            entityKey: 'test.variants.key',
            ...v,
            status: 'DRAFT'
          }
        })
      }

      // Filter by locale
      const enRes = await app.inject({
        method: 'GET',
        url: '/api/translations/variants?locale=en-US',
        headers: authHeaders
      })

      const enVariants = JSON.parse(enRes.payload)
      expect(enVariants.length).toBeGreaterThanOrEqual(2)
      expect(enVariants.every((v: any) => v.locale === 'en-US')).toBe(true)

      // Filter by entityKey
      const keyRes = await app.inject({
        method: 'GET',
        url: `/api/translations/variants?entityKey=test.variants.key`,
        headers: authHeaders
      })

      const keyVariants = JSON.parse(keyRes.payload)
      expect(keyVariants.length).toBeGreaterThanOrEqual(4)
    })

    it('should update variant value and status', async () => {
      // Create variant
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/translations/variants',
        headers: authHeaders,
        payload: {
          keyId: testKeyId,
          entityKey: 'test.variants.key',
          locale: 'en-US',
          value: 'Original value',
          status: 'DRAFT'
        }
      })

      const variant = JSON.parse(createRes.payload)

      // Update value
      const updateRes = await app.inject({
        method: 'PATCH',
        url: `/api/translations/variants/${variant.id}`,
        headers: authHeaders,
        payload: {
          value: 'Updated value'
        }
      })

      expect(updateRes.statusCode).toBe(200)
      const updated = JSON.parse(updateRes.payload)
      expect(updated.value).toBe('Updated value')

      // Update status
      const statusRes = await app.inject({
        method: 'PATCH',
        url: `/api/translations/variants/${variant.id}/status`,
        headers: authHeaders,
        payload: {
          status: 'APPROVED'
        }
      })

      expect(statusRes.statusCode).toBe(200)
      const approved = JSON.parse(statusRes.payload)
      expect(approved.status).toBe('APPROVED')
      expect(approved.approvedBy).toBe(testUserId)
      expect(approved.approvedAt).toBeTruthy()
    })

    it('should handle translation workflow (DRAFT → PENDING → APPROVED)', async () => {
      // Create draft
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/translations/variants',
        headers: authHeaders,
        payload: {
          keyId: testKeyId,
          entityKey: 'test.variants.key',
          locale: 'en-US',
          value: 'Workflow test',
          status: 'DRAFT'
        }
      })

      const variant = JSON.parse(createRes.payload)
      expect(variant.status).toBe('DRAFT')

      // Move to pending
      await app.inject({
        method: 'PATCH',
        url: `/api/translations/variants/${variant.id}/status`,
        headers: authHeaders,
        payload: { status: 'PENDING' }
      })

      // Move to approved
      const approveRes = await app.inject({
        method: 'PATCH',
        url: `/api/translations/variants/${variant.id}/status`,
        headers: authHeaders,
        payload: { status: 'APPROVED' }
      })

      const approved = JSON.parse(approveRes.payload)
      expect(approved.status).toBe('APPROVED')
      expect(approved.approvedBy).toBe(testUserId)
    })
  })

  describe('Release Context', () => {
    it('should respect release context header', async () => {
      // Create key in default release
      const key1Res = await app.inject({
        method: 'POST',
        url: '/api/translations/keys',
        headers: authHeaders,
        payload: {
          entityKey: 'release.test.key',
          description: 'In default release'
        }
      })

      const key1 = JSON.parse(key1Res.payload)

      // Create new release
      const releaseRes = await app.inject({
        method: 'POST',
        url: '/api/releases',
        headers: authHeaders,
        payload: {
          name: 'Test Release',
          description: 'For testing translations'
        }
      })

      const release = JSON.parse(releaseRes.payload)

      // Update key in new release
      await app.inject({
        method: 'PATCH',
        url: `/api/translations/keys/${key1.id}`,
        headers: {
          ...authHeaders,
          'x-cms-release': release.id.toString()
        },
        payload: {
          description: 'Updated in test release'
        }
      })

      // Check key in default release - should show original
      const defaultRes = await app.inject({
        method: 'GET',
        url: '/api/translations/keys',
        headers: authHeaders
      })

      const defaultKeys = JSON.parse(defaultRes.payload)
      const defaultKey = defaultKeys.find((k: any) => k.entityKey === 'release.test.key')
      expect(defaultKey.description).toBe('In default release')

      // Check key in test release - should show updated
      const releaseRes2 = await app.inject({
        method: 'GET',
        url: '/api/translations/keys',
        headers: {
          ...authHeaders,
          'x-cms-release': release.id.toString()
        }
      })

      const releaseKeys = JSON.parse(releaseRes2.payload)
      const releaseKey = releaseKeys.find((k: any) => k.entityKey === 'release.test.key')
      expect(releaseKey.description).toBe('Updated in test release')
    })
  })

  describe('Error Handling', () => {
    it('should require authentication', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/translations/keys'
      })

      expect(res.statusCode).toBe(401)
    })

    it('should validate required fields', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/translations/keys',
        headers: authHeaders,
        payload: {
          // Missing entityKey
          description: 'Missing key'
        }
      })

      expect(res.statusCode).toBe(400)
    })

    it('should handle non-existent entities', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/translations/keys/999999',
        headers: authHeaders,
        payload: {
          description: 'Update non-existent'
        }
      })

      expect(res.statusCode).toBe(404)
    })
  })
})