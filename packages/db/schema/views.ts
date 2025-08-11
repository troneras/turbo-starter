import { pgView, bigint, varchar, text, timestamp, uuid, jsonb, boolean, integer } from 'drizzle-orm/pg-core'
import { entityTypeEnum, entityChangeTypeEnum } from './enums'

// Schema definition for the SQL-created v_entities view
// The actual view is created in migrations/001_release_views.sql with complex logic
// This schema definition allows Drizzle to understand the structure
export const vEntities = pgView('v_entities', {
  id: bigint('id', { mode: 'number' }).primaryKey(),
  entityId: bigint('entity_id', { mode: 'number' }).notNull(),
  releaseId: bigint('release_id', { mode: 'number' }).notNull(),
  entityType: entityTypeEnum('entity_type').notNull(),
  entityKey: varchar('entity_key', { length: 255 }),
  brandId: bigint('brand_id', { mode: 'number' }),
  jurisdictionId: bigint('jurisdiction_id', { mode: 'number' }),
  localeId: bigint('locale_id', { mode: 'number' }),
  parentEntityId: bigint('parent_entity_id', { mode: 'number' }),
  value: text('value'),
  status: varchar('status', { length: 20 }),
  publishedAt: timestamp('published_at'),
  isDeleted: boolean('is_deleted').notNull().default(false),
  payload: jsonb('payload'),
  changeType: entityChangeTypeEnum('change_type').notNull(),
  changeSetId: varchar('change_set_id', { length: 255 }),
  changeReason: text('change_reason'),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').notNull(),
  isFromActiveRelease: boolean('is_from_active_release'),
}).existing()

// Note: The actual SQL view includes complex logic with DISTINCT ON, CTEs, and joins
// that cannot be fully represented in Drizzle's view API. The actual view
// is created via SQL migrations for full functionality.
// See migrations/001_release_views.sql for the actual view definitions