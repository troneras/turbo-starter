import { it, describe, expect, beforeEach, afterEach } from 'bun:test'
import { build } from '../helpers/build-app'
import type { FastifyInstance } from 'fastify'
import { sql } from 'drizzle-orm'

describe('Release Constraint Verification', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await build()
    await app.ready()
  })

  afterEach(async () => {
    if (app) await app.close()
  })

  it('should check if migration and trigger exist in database', async () => {
    // Check custom migrations table
    const migrations = await app.db.execute(sql`
      SELECT filename, applied_at FROM custom_migrations 
      WHERE filename LIKE '%prevent_closed_release%'
    `)
    
    console.log('Found migrations:', migrations)
    
    // Check triggers
    const triggers = await app.db.execute(sql`
      SELECT trigger_name, event_manipulation, action_statement 
      FROM information_schema.triggers 
      WHERE trigger_name = 'trg_prevent_closed_release_modifications'
    `)
    
    console.log('Found triggers:', triggers)
    expect(migrations.length).toBeGreaterThan(0)
    expect(triggers.length).toBeGreaterThan(0)
  })

  it('should prevent entity insertions in CLOSED releases', async () => {
    // Get a locale first to satisfy the constraint
    const [locale] = await app.db.execute(sql`
      SELECT id FROM locales LIMIT 1
    `)
    
    const localeId = (locale as any)?.id || 1

    // Create a CLOSED release directly in database
    const [release] = await app.db.execute(sql`
      INSERT INTO releases (name, description, status, created_by)
      VALUES ('Test Closed Release', 'Test closed release', 'CLOSED', '00000000-0000-0000-0000-000000000000')
      RETURNING id, status
    `)

    expect((release as any).status).toBe('CLOSED')
    const releaseId = (release as any).id

    // Create an entity first using a valid entity type
    const [entity] = await app.db.execute(sql`
      INSERT INTO entities (entity_type)
      VALUES ('translation')
      RETURNING id
    `)

    const entityId = (entity as any).id

    // Should NOT be able to insert entity_version in CLOSED release
    const insertAttempt = async () => {
      return await app.db.execute(sql`
        INSERT INTO entity_versions (
          entity_id, release_id, entity_type, entity_key,
          locale_id, change_type, created_by
        )
        VALUES (
          ${entityId},
          ${releaseId},
          'translation',
          'test.closed.key',
          ${localeId},
          'CREATE',
          '00000000-0000-0000-0000-000000000000'
        )
      `)
    }

    // Should throw an error with our custom message
    await expect(insertAttempt()).rejects.toThrow('Cannot modify entities in CLOSED release')
  })

  it('should allow entity insertions in OPEN releases', async () => {
    // Get a locale first to satisfy the constraint
    const [locale] = await app.db.execute(sql`
      SELECT id FROM locales LIMIT 1
    `)
    
    const localeId = (locale as any)?.id || 1

    // Create an OPEN release directly in database
    const [release] = await app.db.execute(sql`
      INSERT INTO releases (name, description, status, created_by)
      VALUES ('Test Open Release', 'Test open release', 'OPEN', '00000000-0000-0000-0000-000000000000')
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
        ${localeId},
        'CREATE',
        '00000000-0000-0000-0000-000000000000'
      )
      RETURNING id
    `)

    // Should successfully insert
    expect(insertResult.length).toBe(1)
    expect((insertResult[0] as any).id).toBeDefined()
  })

  it('should include release ID in error message', async () => {
    // Get a locale first to satisfy the constraint
    const [locale] = await app.db.execute(sql`
      SELECT id FROM locales LIMIT 1
    `)
    
    const localeId = (locale as any)?.id || 1

    // Create a CLOSED release
    const [release] = await app.db.execute(sql`
      INSERT INTO releases (name, description, status, created_by)
      VALUES ('Error Test', 'Test error format', 'CLOSED', '00000000-0000-0000-0000-000000000000')
      RETURNING id
    `)

    const releaseId = (release as any).id

    // Create an entity first
    const [entity] = await app.db.execute(sql`
      INSERT INTO entities (entity_type)
      VALUES ('translation')
      RETURNING id
    `)

    const entityId = (entity as any).id

    // Try to insert and verify error message format
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
          ${localeId},
          'CREATE',
          '00000000-0000-0000-0000-000000000000'
        )
      `)
      // Should not reach here
      expect(true).toBe(false)
    } catch (error: any) {
      expect(error.message).toContain(`Cannot modify entities in CLOSED release (ID: ${releaseId})`)
      expect(error.message).toContain('Only OPEN releases can be modified')
    }
  })
})