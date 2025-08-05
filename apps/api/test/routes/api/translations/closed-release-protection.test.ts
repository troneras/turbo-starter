import { it, describe, expect, beforeEach, afterEach } from 'bun:test'
import { build } from '../../../helpers/build-app'
import type { FastifyInstance } from 'fastify'

describe('Closed Release Protection', () => {
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

  it('should allow modifications to OPEN releases', async () => {
    // Create new release (should be OPEN by default)
    const releaseRes = await app.inject({
      method: 'POST',
      url: '/api/releases',
      headers: authHeaders,
      payload: {
        name: 'Open Test Release',
        description: 'Should allow modifications'
      }
    })

    const release = JSON.parse(releaseRes.payload)
    expect(release.status).toBe('OPEN')

    // Should be able to create translation key in OPEN release
    const keyRes = await app.inject({
      method: 'POST',
      url: '/api/translations/keys',
      headers: {
        ...authHeaders,
        'x-cms-release': release.id.toString()
      },
      payload: {
        entityKey: 'test.open.release.key',
        description: 'Key in open release'
      }
    })

    expect(keyRes.statusCode).toBe(201)
    const key = JSON.parse(keyRes.payload)
    expect(key.entityKey).toBe('test.open.release.key')
  })

  it('should prevent modifications to CLOSED releases', async () => {
    // Create release
    const releaseRes = await app.inject({
      method: 'POST',
      url: '/api/releases',
      headers: authHeaders,
      payload: {
        name: 'Closed Test Release',
        description: 'Will be closed'
      }
    })

    const release = JSON.parse(releaseRes.payload)

    // Close the release
    await app.inject({
      method: 'PATCH',
      url: `/api/releases/${release.id}`,
      headers: authHeaders,
      payload: {
        status: 'CLOSED'
      }
    })

    // Attempt to create translation key in CLOSED release should fail
    const keyRes = await app.inject({
      method: 'POST',
      url: '/api/translations/keys',
      headers: {
        ...authHeaders,
        'x-cms-release': release.id.toString()
      },
      payload: {
        entityKey: 'test.closed.release.key',
        description: 'Should fail'
      }
    })

    expect(keyRes.statusCode).toBe(500) // Database constraint violation
    const error = JSON.parse(keyRes.payload)
    expect(error.message).toContain('Cannot modify entities in CLOSED release')
  })

  it('should prevent modifications to DEPLOYED releases', async () => {
    // Create and close release
    const releaseRes = await app.inject({
      method: 'POST',
      url: '/api/releases',
      headers: authHeaders,
      payload: {
        name: 'Deployed Test Release',
        description: 'Will be deployed'
      }
    })

    const release = JSON.parse(releaseRes.payload)

    // Close and deploy the release
    await app.inject({
      method: 'PATCH',
      url: `/api/releases/${release.id}`,
      headers: authHeaders,
      payload: {
        status: 'CLOSED'
      }
    })

    await app.inject({
      method: 'POST',
      url: `/api/releases/${release.id}/deploy`,
      headers: authHeaders
    })

    // Attempt to create translation key in DEPLOYED release should fail
    const keyRes = await app.inject({
      method: 'POST',
      url: '/api/translations/keys',
      headers: {
        ...authHeaders,
        'x-cms-release': release.id.toString()
      },
      payload: {
        entityKey: 'test.deployed.release.key',
        description: 'Should fail'
      }
    })

    expect(keyRes.statusCode).toBe(500) // Database constraint violation
    const error = JSON.parse(keyRes.payload)
    expect(error.message).toContain('Cannot modify entities in DEPLOYED release')
  })

  it('should prevent modifications even for existing entities in closed releases', async () => {
    // Create release and add a key
    const releaseRes = await app.inject({
      method: 'POST',
      url: '/api/releases',
      headers: authHeaders,
      payload: {
        name: 'Modification Test Release',
        description: 'Test entity modifications'
      }
    })

    const release = JSON.parse(releaseRes.payload)

    // Create key while release is OPEN
    const keyRes = await app.inject({
      method: 'POST',
      url: '/api/translations/keys',
      headers: {
        ...authHeaders,
        'x-cms-release': release.id.toString()
      },
      payload: {
        entityKey: 'test.modification.key',
        description: 'Original description'
      }
    })

    const key = JSON.parse(keyRes.payload)

    // Close the release
    await app.inject({
      method: 'PATCH',
      url: `/api/releases/${release.id}`,
      headers: authHeaders,
      payload: {
        status: 'CLOSED'
      }
    })

    // Attempt to modify existing key in CLOSED release should fail
    const updateRes = await app.inject({
      method: 'PATCH',
      url: `/api/translations/keys/${key.id}`,
      headers: {
        ...authHeaders,
        'x-cms-release': release.id.toString()
      },
      payload: {
        description: 'This should fail'
      }
    })

    expect(updateRes.statusCode).toBe(500) // Database constraint violation
    const error = JSON.parse(updateRes.payload)
    expect(error.message).toContain('Cannot modify entities in CLOSED release')
  })

  it('should provide helpful error message with release ID', async () => {
    // Create and close release
    const releaseRes = await app.inject({
      method: 'POST',
      url: '/api/releases',
      headers: authHeaders,
      payload: {
        name: 'Error Message Test',
        description: 'Test error messages'
      }
    })

    const release = JSON.parse(releaseRes.payload)

    await app.inject({
      method: 'PATCH',
      url: `/api/releases/${release.id}`,
      headers: authHeaders,
      payload: {
        status: 'CLOSED'
      }
    })

    // Try to create entity in closed release
    const keyRes = await app.inject({
      method: 'POST',
      url: '/api/translations/keys',
      headers: {
        ...authHeaders,
        'x-cms-release': release.id.toString()
      },
      payload: {
        entityKey: 'error.test.key',
        description: 'Error test'
      }
    })

    expect(keyRes.statusCode).toBe(500)
    const error = JSON.parse(keyRes.payload)
    expect(error.message).toContain(`Cannot modify entities in CLOSED release (ID: ${release.id})`)
    expect(error.message).toContain('Only OPEN releases can be modified')
  })

  it('should work correctly with release context switching', async () => {
    // Create two releases
    const openReleaseRes = await app.inject({
      method: 'POST',
      url: '/api/releases',
      headers: authHeaders,
      payload: {
        name: 'Open Release',
        description: 'Should work'
      }
    })

    const closedReleaseRes = await app.inject({
      method: 'POST',
      url: '/api/releases',
      headers: authHeaders,
      payload: {
        name: 'Closed Release',
        description: 'Should be locked'
      }
    })

    const openRelease = JSON.parse(openReleaseRes.payload)
    const closedRelease = JSON.parse(closedReleaseRes.payload)

    // Close one release
    await app.inject({
      method: 'PATCH',
      url: `/api/releases/${closedRelease.id}`,
      headers: authHeaders,
      payload: {
        status: 'CLOSED'
      }
    })

    // Should work in open release
    const openKeyRes = await app.inject({
      method: 'POST',
      url: '/api/translations/keys',
      headers: {
        ...authHeaders,
        'x-cms-release': openRelease.id.toString()
      },
      payload: {
        entityKey: 'context.open.key',
        description: 'In open release'
      }
    })

    expect(openKeyRes.statusCode).toBe(201)

    // Should fail in closed release
    const closedKeyRes = await app.inject({
      method: 'POST',
      url: '/api/translations/keys',
      headers: {
        ...authHeaders,
        'x-cms-release': closedRelease.id.toString()
      },
      payload: {
        entityKey: 'context.closed.key',
        description: 'In closed release'
      }
    })

    expect(closedKeyRes.statusCode).toBe(500)
    expect(JSON.parse(closedKeyRes.payload).message).toContain('Cannot modify entities in CLOSED release')
  })
})