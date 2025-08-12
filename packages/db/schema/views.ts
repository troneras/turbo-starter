import { pgView } from 'drizzle-orm/pg-core'
import { eq, sql } from 'drizzle-orm'
import { entityVersions } from './entities'
import { releases } from './releases'

// Simple view that selects all entity versions with additional computed fields
// This replaces the complex SQL view with a simpler Drizzle-native approach
export const vEntities = pgView('v_entities').as((qb) =>
  qb.select({
    // All fields from entity_versions with proper aliasing
    id: entityVersions.id,
    entityId: entityVersions.entityId,
    releaseId: entityVersions.releaseId,
    entityType: entityVersions.entityType,
    entityKey: entityVersions.entityKey,
    brandId: entityVersions.brandId,
    jurisdictionId: entityVersions.jurisdictionId,
    localeId: entityVersions.localeId,
    parentEntityId: entityVersions.parentEntityId,
    value: entityVersions.value,
    status: entityVersions.status,
    publishedAt: entityVersions.publishedAt,
    isDeleted: entityVersions.isDeleted,
    payload: entityVersions.payload,
    changeType: entityVersions.changeType,
    changeSetId: entityVersions.changeSetId,
    changeReason: entityVersions.changeReason,
    createdBy: entityVersions.createdBy,
    createdAt: entityVersions.createdAt,
    // Computed field: check if this entity version is from the active (OPEN) release
    isFromActiveRelease: sql<boolean>`CASE WHEN ${releases.status} = 'OPEN' THEN true ELSE false END`.as('is_from_active_release'),
  })
    .from(entityVersions)
    .leftJoin(releases, eq(entityVersions.releaseId, releases.id))
)

// For complex views that require advanced SQL features not supported by Drizzle's query builder,
// you can use the .existing() approach with a schema definition and create the view in SQL migrations.
// The current approach above provides a good balance of type safety and simplicity.
//
// If you need the complex DISTINCT ON logic from the original SQL view, you can either:
// 1. Use raw SQL with explicit schema definition (as before)
// 2. Create a more complex view using CTEs and window functions in the query builder
// 3. Handle the complexity in application logic when querying this view

// Example views demonstrating different approaches:

// 1. Simple filtered view using query builder
export const vActiveEntities = pgView('v_active_entities').as((qb) =>
  qb.select({
    id: entityVersions.id,
    entityId: entityVersions.entityId,
    entityType: entityVersions.entityType,
    entityKey: entityVersions.entityKey,
    value: entityVersions.value,
    status: entityVersions.status,
    createdAt: entityVersions.createdAt,
  })
    .from(entityVersions)
    .innerJoin(releases, eq(entityVersions.releaseId, releases.id))
    .where(eq(releases.status, 'OPEN'))
)

// 2. For complex SQL that can't be expressed in query builder, use raw SQL with schema definition
// This approach is needed when you have DISTINCT ON, complex CTEs, or advanced PostgreSQL features
/*
import { bigint, varchar, text, timestamp, uuid, jsonb, boolean, integer } from 'drizzle-orm/pg-core'
import { entityTypeEnum, entityChangeTypeEnum } from './enums'

export const vEntitiesComplex = pgView('v_entities_complex', {
  id: bigint('id', { mode: 'bigint' }),
  entityId: bigint('entity_id', { mode: 'bigint' }),
  releaseId: bigint('release_id', { mode: 'bigint' }),
  entityType: entityTypeEnum('entity_type'),
  entityKey: varchar('entity_key', { length: 255 }),
  brandId: integer('brand_id'),
  jurisdictionId: integer('jurisdiction_id'),
  localeId: integer('locale_id'),
  parentEntityId: bigint('parent_entity_id', { mode: 'bigint' }),
  value: text('value'),
  status: varchar('status', { length: 20 }),
  publishedAt: timestamp('published_at'),
  isDeleted: boolean('is_deleted'),
  payload: jsonb('payload'),
  changeType: entityChangeTypeEnum('change_type'),
  changeSetId: uuid('change_set_id'),
  changeReason: text('change_reason'),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at'),
  isFromActiveRelease: boolean('is_from_active_release'),
}).as(sql`
  WITH latest_entities AS (
    SELECT DISTINCT ON (ev.entity_id)
      ev.*,
      CASE WHEN r.status = 'OPEN' THEN true ELSE false END as is_from_active_release
    FROM entity_versions ev
    INNER JOIN releases r ON ev.release_id = r.id
    ORDER BY ev.entity_id, r.deploy_seq DESC NULLS FIRST
  )
  SELECT * FROM latest_entities
`).existing()
*/