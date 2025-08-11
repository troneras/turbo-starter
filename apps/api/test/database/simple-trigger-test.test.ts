import { it, describe, expect, beforeEach, afterEach } from 'bun:test'
import { build } from '../helpers/build-app'
import type { FastifyInstance } from 'fastify'
import { sql } from 'drizzle-orm'

describe('Release Trigger Test', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await build()
    await app.ready()
  })

  afterEach(async () => {
    if (app) await app.close() 
  })

  it('should successfully insert into OPEN release', async () => {
    // Create minimal test data with unique names
    const uniqueName = `Test Brand ${Date.now()}`
    const [brand] = await app.db.execute(sql`
      INSERT INTO brands (name, description)
      VALUES (${uniqueName}, 'Test Brand Description')
      RETURNING id
    `)
    const brandId = (brand as any).id

    // Create an OPEN release
    const [release] = await app.db.execute(sql`
      INSERT INTO releases (name, description, status, created_by)
      VALUES ('Test Open', 'Open release', 'OPEN', '00000000-0000-0000-0000-000000000000')
      RETURNING id
    `)
    const releaseId = (release as any).id

    // Create entity
    const [entity] = await app.db.execute(sql`
      INSERT INTO entities (entity_type)
      VALUES ('setting')
      RETURNING id
    `)
    const entityId = (entity as any).id

    // This should work - inserting into OPEN release
    const result = await app.db.execute(sql`
      INSERT INTO entity_versions (
        entity_id, release_id, entity_type, entity_key,
        brand_id, change_type, created_by, value
      )
      VALUES (
        ${entityId}, ${releaseId}, 'setting', 'test.setting',
        ${brandId}, 'CREATE', '00000000-0000-0000-0000-000000000000', 'test value'
      )
      RETURNING id
    `)

    expect(result.length).toBe(1)
    expect((result[0] as any).id).toBeDefined()
  })

  it('should prevent insert into CLOSED release', async () => {
    // Create minimal test data with unique names
    const uniqueName = `Test Brand ${Date.now()}-2`
    const [brand] = await app.db.execute(sql`
      INSERT INTO brands (name, description)
      VALUES (${uniqueName}, 'Test Brand Description')
      RETURNING id
    `)
    const brandId = (brand as any).id

    // Create a CLOSED release
    const [release] = await app.db.execute(sql`
      INSERT INTO releases (name, description, status, created_by)
      VALUES ('Test Closed', 'Closed release', 'CLOSED', '00000000-0000-0000-0000-000000000000')
      RETURNING id
    `)
    const releaseId = (release as any).id

    // Create entity
    const [entity] = await app.db.execute(sql`
      INSERT INTO entities (entity_type)
      VALUES ('setting')
      RETURNING id
    `)
    const entityId = (entity as any).id

    // This should fail with our trigger error
    try {
      await app.db.execute(sql`
        INSERT INTO entity_versions (
          entity_id, release_id, entity_type, entity_key,
          brand_id, change_type, created_by, value
        )
        VALUES (
          ${entityId}, ${releaseId}, 'setting', 'test.setting',
          ${brandId}, 'CREATE', '00000000-0000-0000-0000-000000000000', 'test value'
        )
      `)
      
      // Should not reach here
      expect(true).toBe(false)
    } catch (error: any) {
      console.log('Full error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        stack: error.stack?.split('\n').slice(0, 5)
      })
      
      // Check if it contains our trigger error message
      const errorMessage = error.cause?.message || error.message
      expect(errorMessage).toContain('Cannot modify entities in CLOSED release')
    }
  })
})