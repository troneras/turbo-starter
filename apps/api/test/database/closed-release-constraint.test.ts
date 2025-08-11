import { it, describe, expect, beforeEach, afterEach } from 'bun:test'
import { build } from '../helpers/build-app'
import type { FastifyInstance } from 'fastify'
import { sql } from 'drizzle-orm'

describe('Database Constraint: Closed Release Protection', () => {
  let app: FastifyInstance
  let testLocaleId: number

  beforeEach(async () => {
    app = await build()
    await app.ready()
    
    // Create test data that the tests depend on
    // Create a test locale
    const [locale] = await app.db.execute(sql`
      INSERT INTO locales (code, name)
      VALUES ('en-US', 'English (US)')
      ON CONFLICT (code) DO UPDATE SET code = locales.code
      RETURNING id
    `)
    testLocaleId = (locale as any).id
  })

  afterEach(async () => {
    if (app) await app.close()
  })

  it('should allow entity insertions in OPEN releases', async () => {
    // Create an OPEN release directly in database
    const [release] = await app.db.execute(sql`
      INSERT INTO releases (name, description, status, created_by)
      VALUES ('Test Open Release', 'Test release', 'OPEN', '00000000-0000-0000-0000-000000000000')
      RETURNING id, status
    `)

    expect((release as any).status).toBe('OPEN')
    const releaseId = (release as any).id

    // Create an entity first
    const [entity] = await app.db.execute(sql`
      INSERT INTO entities (entity_type)
      VALUES ('translation')
      RETURNING id
    `)

    const entityId = (entity as any).id

    // Should be able to insert entity_version in OPEN release
    const insertResult = await app.db.execute(sql`
      INSERT INTO entity_versions (
        entity_id, release_id, entity_type, entity_key, 
        locale_id, change_type, created_by
      )
      VALUES (
        ${entityId},
        ${releaseId},
        'translation',
        'test.open.key',
        ${testLocaleId},
        'CREATE',
        '00000000-0000-0000-0000-000000000000'
      )
    `)

    // Should not throw an error
    expect(insertResult).toBeDefined()
  })

  it('should prevent entity insertions in CLOSED releases', async () => {
    // Create a CLOSED release directly in database
    const [release] = await app.db.execute(sql`
      INSERT INTO releases (name, description, status, created_by)
      VALUES ('Test Closed Release', 'Test closed release', 'CLOSED', '00000000-0000-0000-0000-000000000000')
      RETURNING id, status
    `)

    expect((release as any).status).toBe('CLOSED')
    const releaseId = (release as any).id

    // Create an entity first
    const [entity] = await app.db.execute(sql`
      INSERT INTO entities (entity_type)
      VALUES ('translation')
      RETURNING id
    `)

    const entityId = (entity as any).id

    // Should NOT be able to insert entity_version in CLOSED release
    const insertAttempt = app.db.execute(sql`
      INSERT INTO entity_versions (
        entity_id, release_id, entity_type, entity_key,
        locale_id, change_type, created_by
      )
      VALUES (
        ${entityId},
        ${releaseId},
        'translation',
        'test.closed.key',
        ${testLocaleId},
        'CREATE',
        '00000000-0000-0000-0000-000000000000'
      )
    `)

    // Should throw an error with our custom message
    try {
      await insertAttempt
      expect(true).toBe(false) // Should not reach here
    } catch (error: any) {
      const errorMessage = error.cause?.message || error.message
      expect(errorMessage).toContain('Cannot modify entities in CLOSED release')
    }
  })

  it('should prevent entity insertions in DEPLOYED releases', async () => {
    // Create a DEPLOYED release directly in database
    const [release] = await app.db.execute(sql`
      INSERT INTO releases (name, description, status, deploy_seq, deployed_at, deployed_by, created_by)
      VALUES (
        'Test Deployed Release', 
        'Test deployed release', 
        'DEPLOYED', 
        nextval('deploy_seq'),
        NOW(),
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000000'
      )
      RETURNING id, status
    `)

    expect((release as any).status).toBe('DEPLOYED')
    const releaseId = (release as any).id

    // Create an entity first
    const [entity] = await app.db.execute(sql`
      INSERT INTO entities (entity_type)
      VALUES ('translation')
      RETURNING id
    `)

    const entityId = (entity as any).id

    // Should NOT be able to insert entity_version in DEPLOYED release
    const insertAttempt = app.db.execute(sql`
      INSERT INTO entity_versions (
        entity_id, release_id, entity_type, entity_key,
        locale_id, change_type, created_by
      )
      VALUES (
        ${entityId},
        ${releaseId},
        'translation',
        'test.deployed.key',
        ${testLocaleId},
        'CREATE',
        '00000000-0000-0000-0000-000000000000'
      )
    `)

    // Should throw an error with our custom message
    try {
      await insertAttempt
      expect(true).toBe(false) // Should not reach here
    } catch (error: any) {
      const errorMessage = error.cause?.message || error.message
      expect(errorMessage).toContain('Cannot modify entities in DEPLOYED release')
    }
  })

  it('should prevent entity insertions in ROLLED_BACK releases', async () => {
    // Create a ROLLED_BACK release directly in database
    const [release] = await app.db.execute(sql`
      INSERT INTO releases (name, description, status, created_by)
      VALUES ('Test Rolled Back Release', 'Test rolled back release', 'ROLLED_BACK', '00000000-0000-0000-0000-000000000000')
      RETURNING id, status
    `)

    expect((release as any).status).toBe('ROLLED_BACK')
    const releaseId = (release as any).id

    // Create an entity first
    const [entity] = await app.db.execute(sql`
      INSERT INTO entities (entity_type)
      VALUES ('translation')
      RETURNING id
    `)

    const entityId = (entity as any).id

    // Should NOT be able to insert entity_version in ROLLED_BACK release
    const insertAttempt = app.db.execute(sql`
      INSERT INTO entity_versions (
        entity_id, release_id, entity_type, entity_key,
        locale_id, change_type, created_by
      )
      VALUES (
        ${entityId},
        ${releaseId},
        'translation',
        'test.rolledback.key',
        ${testLocaleId},
        'CREATE',
        '00000000-0000-0000-0000-000000000000'
      )
    `)

    // Should throw an error with our custom message
    try {
      await insertAttempt
      expect(true).toBe(false) // Should not reach here
    } catch (error: any) {
      const errorMessage = error.cause?.message || error.message
      expect(errorMessage).toContain('Cannot modify entities in ROLLED_BACK release')
    }
  })

  it('should provide detailed error message with release ID', async () => {
    // Create a CLOSED release
    const [release] = await app.db.execute(sql`
      INSERT INTO releases (name, description, status, created_by)
      VALUES ('Error Message Test', 'Test error messages', 'CLOSED', '00000000-0000-0000-0000-000000000000')
      RETURNING id, status
    `)

    const releaseId = (release as any).id

    // Create an entity first
    const [entity] = await app.db.execute(sql`
      INSERT INTO entities (entity_type)
      VALUES ('translation')
      RETURNING id
    `)

    const entityId = (entity as any).id

    // Try to insert and capture the error
    try {
      await app.db.execute(sql`
        INSERT INTO entity_versions (
          entity_id, release_id, entity_type, entity_key,
          locale_id, change_type, created_by
        )
        VALUES (
          ${entityId},
          ${releaseId},
          'translation',
          'test.error.key',
          ${testLocaleId},
          'CREATE',
          '00000000-0000-0000-0000-000000000000'
        )
      `)
      // Should not reach here
      expect(true).toBe(false)
    } catch (error: any) {
      const errorMessage = error.cause?.message || error.message
      expect(errorMessage).toContain(`Cannot modify entities in CLOSED release (ID: ${releaseId})`)
      expect(errorMessage).toContain('Only OPEN releases can be modified')
    }
  })

  it('should work correctly when release does not exist (allows creation)', async () => {
    // Use a non-existent release ID (999999)
    const nonExistentReleaseId = 999999

    // Create an entity first
    const [entity] = await app.db.execute(sql`
      INSERT INTO entities (entity_type)
      VALUES ('translation')
      RETURNING id
    `)

    const entityId = (entity as any).id

    // Should NOT be able to insert with non-existent release ID due to FK constraint
    try {
      await app.db.execute(sql`
        INSERT INTO entity_versions (
          entity_id, release_id, entity_type, entity_key,
          locale_id, change_type, created_by
        )
        VALUES (
          ${entityId},
          ${nonExistentReleaseId},
          'translation',
          'test.nonexistent.key',
          ${testLocaleId},
          'CREATE',
          '00000000-0000-0000-0000-000000000000'
        )
      `)
      // Should not reach here
      expect(true).toBe(false)
    } catch (error: any) {
      // Should throw FK constraint error, not our custom error
      expect(error).toBeDefined()
      // Verify it's not our custom error
      const errorMessage = error.cause?.message || error.message
      expect(errorMessage).not.toContain('Cannot modify entities')
    }
  })
})