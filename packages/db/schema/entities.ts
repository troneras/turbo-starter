import { pgTable, bigserial, bigint, varchar, text, timestamp, uuid, jsonb, index, integer, boolean, unique, primaryKey } from 'drizzle-orm/pg-core'
import { releases } from './releases'
import { users, brands, jurisdictions, locales } from './index'

// Core entity table
export const entities = pgTable('entities', {
  id: bigserial('id', { mode: 'bigint' }),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  primaryKey({ columns: [table.id] }),
  index('entities_entity_type_idx').on(table.entityType),
])

// Entity version table with all content
export const entityVersions = pgTable(
  'entity_versions',
  {
    id: bigserial('id', { mode: 'bigint' }),
    entityId: bigint('entity_id', { mode: 'bigint' })
      .references(() => entities.id)
      .notNull(),
    releaseId: bigint('release_id', { mode: 'bigint' })
      .references(() => releases.id)
      .notNull(),

    // Universal content fields
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityName: text('entity_name'),
    entityKey: varchar('entity_key', { length: 255 }),
    brandId: integer('brand_id').references(() => brands.id),
    jurisdictionId: integer('jurisdiction_id').references(() => jurisdictions.id),
    localeId: integer('locale_id').references(() => locales.id),
    parentEntityId: bigint('parent_entity_id', { mode: 'bigint' })
      .references(() => entities.id, { onDelete: 'set null' }),

    // Core content fields
    title: text('title'),
    slug: varchar('slug', { length: 255 }),
    status: varchar('status', { length: 20 }).default('draft'),
    publishedAt: timestamp('published_at'),
    isDeleted: boolean('is_deleted').default(false).notNull(),

    // Flexible payload for entity-specific data
    payload: jsonb('payload').$type<Record<string, any>>(),

    // Change tracking
    changeType: varchar('change_type', { length: 20 })
      .notNull()
      .default('UPDATE')
      .$type<'CREATE' | 'UPDATE' | 'DELETE'>(),
    changeSetId: uuid('change_set_id'),
    changeReason: text('change_reason'),

    // Audit fields
    createdBy: uuid('created_by')
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.id] }),
    unique().on(table.entityId, table.releaseId),
    index('entity_versions_entity_type_idx').on(table.entityType),
    index('entity_versions_brand_idx').on(table.brandId),
    index('entity_versions_release_idx').on(table.releaseId),
    index('entity_versions_entity_release_optimized_idx').on(table.entityId, table.releaseId),
    index('entity_versions_entity_key_idx').on(table.entityKey, table.releaseId),
    index('entity_versions_parent_entity_idx').on(table.parentEntityId, table.releaseId),
    // Partial index for efficient soft-delete queries - handled in SQL migrations
  ]
)

// Relationship versions for many-to-many relationships
export const relationVersions = pgTable('relation_versions', {
  id: bigserial('id', { mode: 'bigint' }),
  releaseId: bigint('release_id', { mode: 'bigint' })
    .references(() => releases.id)
    .notNull(),
  leftEntityId: bigint('left_entity_id', { mode: 'bigint' })
    .references(() => entities.id)
    .notNull(),
  rightEntityId: bigint('right_entity_id', { mode: 'bigint' })
    .references(() => entities.id)
    .notNull(),
  relationType: varchar('relation_type', { length: 50 }).notNull(),
  action: varchar('action', { length: 10 }).notNull().$type<'ADD' | 'REMOVE'>(),
  position: integer('position'), // For ordered relationships
  metadata: jsonb('metadata'),
  createdBy: uuid('created_by')
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.id] }),
  unique().on(table.leftEntityId, table.rightEntityId, table.relationType, table.releaseId),
  index('relation_versions_release_idx').on(table.releaseId),
  index('relation_versions_left_entity_idx').on(table.leftEntityId),
  index('relation_versions_right_entity_idx').on(table.rightEntityId),
  index('relation_versions_relation_type_idx').on(table.relationType),
])

// Type exports
export type Entity = typeof entities.$inferSelect
export type NewEntity = typeof entities.$inferInsert

export type EntityVersion = typeof entityVersions.$inferSelect
export type NewEntityVersion = typeof entityVersions.$inferInsert

export type RelationVersion = typeof relationVersions.$inferSelect
export type NewRelationVersion = typeof relationVersions.$inferInsert