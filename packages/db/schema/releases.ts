import { pgTable, bigserial, text, varchar, timestamp, uuid, bigint, index, primaryKey } from 'drizzle-orm/pg-core'
import { pgSequence } from 'drizzle-orm/pg-core'
import { users } from './index'
import { releaseStatusEnum } from './enums'

// Deploy sequence for monotonic ordering
export const deploySequence = pgSequence('deploy_seq')

// Core release table
export const releases = pgTable('releases', {
  id: bigserial('id', { mode: 'bigint' }),
  name: text('name').notNull(),
  description: text('description'),
  status: releaseStatusEnum('status')
    .notNull()
    .default('OPEN'),
  deploySeq: bigint('deploy_seq', { mode: 'bigint' }).unique(),
  createdBy: uuid('created_by')
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  deployedAt: timestamp('deployed_at'),
  deployedBy: uuid('deployed_by').references(() => users.id),
}, (table) => [
  primaryKey({ columns: [table.id] }),
  index('releases_status_idx').on(table.status),
  index('releases_deploy_seq_idx').on(table.deploySeq),
  index('releases_id_deploy_seq_idx').on(table.id, table.deploySeq),
])

// Type exports
export type Release = typeof releases.$inferSelect
export type NewRelease = typeof releases.$inferInsert