import { pgTable, uuid, varchar, timestamp, text, jsonb, boolean, serial, integer, primaryKey, unique } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    azure_ad_oid: varchar('azure_ad_oid', { length: 255 }),
    azure_ad_tid: varchar('azure_ad_tid', { length: 255 }),
    last_login_at: timestamp('last_login_at'),
    status: varchar('status', { length: 20 }).default('active').notNull(),
    is_test_user: boolean('is_test_user').default(false).notNull(),
    created_by: uuid('created_by'),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const brands = pgTable('brands', {
    id: serial('id').primaryKey(),
    name: text('name').unique().notNull(),
    description: text('description'),
});

export const locales = pgTable('locales', {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 10 }).unique().notNull(),
    name: text('name').notNull(),
    source: boolean('source').default(false).notNull(),
});

export const jurisdictions = pgTable('jurisdictions', {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 20 }).unique().notNull(),
    name: text('name').notNull(),
    description: text('description'),
    status: varchar('status', { length: 20 }).default('active').notNull(),
    region: varchar('region', { length: 100 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const brandLocales = pgTable('brand_locales', {
    brandId: integer('brand_id').references(() => brands.id).notNull(),
    localeId: integer('locale_id').references(() => locales.id).notNull(),
}, (table) => [
    primaryKey({ columns: [table.brandId, table.localeId] }),
]);

export const brandJurisdictions = pgTable('brand_jurisdictions', {
    brandId: integer('brand_id').references(() => brands.id).notNull(),
    jurisdictionId: integer('jurisdiction_id').references(() => jurisdictions.id).notNull(),
}, (table) => [
    primaryKey({ columns: [table.brandId, table.jurisdictionId] }),
]);

export const roles = pgTable('roles', {
    id: serial('id').primaryKey(),
    name: text('name').unique().notNull(),
    description: text('description'),
    parent_role_id: integer('parent_role_id').references((): any => roles.id),
    created_by: uuid('created_by').references(() => users.id),
    updated_by: uuid('updated_by').references(() => users.id),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const userRoles = pgTable('user_roles', {
    userId: uuid('user_id').references(() => users.id).notNull(),
    roleId: integer('role_id').references(() => roles.id).notNull(),
}, (table) => [
    primaryKey({ columns: [table.userId, table.roleId] }),
]);

export const serviceTokens = pgTable('service_tokens', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    token_hash: varchar('token_hash', { length: 255 }).unique().notNull(),
    scope: jsonb('scope').$type<string[]>().notNull(),
    created_by: uuid('created_by').references(() => users.id).notNull(),
    expires_at: timestamp('expires_at'),
    last_used_at: timestamp('last_used_at'),
    status: varchar('status', { length: 20 }).default('active').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const permissions = pgTable('permissions', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).unique().notNull(),
    description: text('description'),
    resource: varchar('resource', { length: 100 }).notNull(),
    action: varchar('action', { length: 100 }).notNull(),
    category: varchar('category', { length: 100 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const rolePermissions = pgTable('role_permissions', {
    roleId: integer('role_id').references(() => roles.id).notNull(),
    permissionId: integer('permission_id').references(() => permissions.id).notNull(),
}, (table) => [
    primaryKey({ columns: [table.roleId, table.permissionId] }),
]);

export const userAuditLogs = pgTable('user_audit_logs', {
    id: serial('id').primaryKey(),
    targetUserId: uuid('target_user_id').references(() => users.id).notNull(),
    performedBy: uuid('performed_by').references(() => users.id).notNull(),
    action: varchar('action', { length: 50 }).notNull(),
    oldValue: jsonb('old_value'),
    newValue: jsonb('new_value'),
    reason: text('reason'),
    isAutomatic: boolean('is_automatic').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Type exports
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Brand = typeof brands.$inferSelect
export type NewBrand = typeof brands.$inferInsert

export type Locale = typeof locales.$inferSelect
export type NewLocale = typeof locales.$inferInsert

export type Jurisdiction = typeof jurisdictions.$inferSelect
export type NewJurisdiction = typeof jurisdictions.$inferInsert

export type BrandLocale = typeof brandLocales.$inferSelect
export type NewBrandLocale = typeof brandLocales.$inferInsert

export type BrandJurisdiction = typeof brandJurisdictions.$inferSelect
export type NewBrandJurisdiction = typeof brandJurisdictions.$inferInsert

export type Role = typeof roles.$inferSelect
export type NewRole = typeof roles.$inferInsert

export type UserRole = typeof userRoles.$inferSelect
export type NewUserRole = typeof userRoles.$inferInsert

export type ServiceToken = typeof serviceTokens.$inferSelect
export type NewServiceToken = typeof serviceTokens.$inferInsert

export type Permission = typeof permissions.$inferSelect
export type NewPermission = typeof permissions.$inferInsert

export type RolePermission = typeof rolePermissions.$inferSelect
export type NewRolePermission = typeof rolePermissions.$inferInsert

export type UserAuditLog = typeof userAuditLogs.$inferSelect
export type NewUserAuditLog = typeof userAuditLogs.$inferInsert

// Re-export release and entity schemas
export * from './releases'
export * from './entities'
export * from './views'
export * from './enums'
export * from './audit'