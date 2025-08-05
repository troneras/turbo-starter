import { pgTable, bigserial, bigint, varchar, timestamp, uuid, jsonb, text, index, inet } from 'drizzle-orm/pg-core'
import { entities } from './entities'
import { releases } from './releases'
import { users } from './index'

// Audit events table for proper audit trail
export const auditEvents = pgTable('audit_events', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  entityId: bigint('entity_id', { mode: 'bigint' })
    .references(() => entities.id),
  releaseId: bigint('release_id', { mode: 'bigint' })
    .references(() => releases.id)
    .notNull(),
  entityType: varchar('entity_type', { length: 50 }),
  operation: varchar('operation', { length: 20 }).notNull(),
  oldData: jsonb('old_data'),
  newData: jsonb('new_data'),
  changedBy: uuid('changed_by')
    .references(() => users.id)
    .notNull(),
  changedAt: timestamp('changed_at').defaultNow().notNull(),
  requestId: varchar('request_id', { length: 255 }),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
}, (table) => [
  index('audit_events_entity_idx').on(table.entityId, table.changedAt),
  index('audit_events_release_idx').on(table.releaseId, table.changedAt),
  index('audit_events_user_idx').on(table.changedBy, table.changedAt),
])

// Type exports
export type AuditEvent = typeof auditEvents.$inferSelect
export type NewAuditEvent = typeof auditEvents.$inferInsert 