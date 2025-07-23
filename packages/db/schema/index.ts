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
});

export const jurisdictions = pgTable('jurisdictions', {
    id: serial('id').primaryKey(),
    code: varchar('code', { length: 10 }).unique().notNull(),
    name: text('name').notNull(),
});

export const brandLocales = pgTable('brand_locales', {
    brandId: integer('brand_id').references(() => brands.id).notNull(),
    localeId: integer('locale_id').references(() => locales.id).notNull(),
}, (table) => [
    primaryKey({ columns: [table.brandId, table.localeId] }),
]);

export const roles = pgTable('roles', {
    id: serial('id').primaryKey(),
    name: text('name').unique().notNull(),
});

export const userRoles = pgTable('user_roles', {
    userId: uuid('user_id').references(() => users.id).notNull(),
    roleId: integer('role_id').references(() => roles.id).notNull(),
}, (table) => [
    primaryKey({ columns: [table.userId, table.roleId] }),
]);

export const translationKeys = pgTable('translation_keys', {
    id: serial('id').primaryKey(),
    key: text('key').unique().notNull(),
    description: text('description'),
    isBrandSpecific: boolean('is_brand_specific').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const translations = pgTable('translations', {
    id: serial('id').primaryKey(),
    keyId: integer('key_id').references(() => translationKeys.id).notNull(),
    brandId: integer('brand_id').references(() => brands.id),
    jurisdictionId: integer('jurisdiction_id').references(() => jurisdictions.id),
    localeId: integer('locale_id').references(() => locales.id).notNull(),
    value: text('value'),
    status: varchar('status', { length: 20 }).default('draft'),
    aiGenerated: boolean('ai_generated').default(false),
    context: text('context'),
    createdBy: uuid('created_by').references(() => users.id),
    updatedBy: uuid('updated_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
    unique().on(table.keyId, table.brandId, table.jurisdictionId, table.localeId),
]);

export const releases = pgTable('releases', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    status: varchar('status', { length: 20 }).default('draft'),
    description: text('description'),
    createdBy: uuid('created_by').references(() => users.id).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    deployedAt: timestamp('deployed_at'),
    rolledBackAt: timestamp('rolled_back_at'),
});

export const releaseItems = pgTable('release_items', {
    id: serial('id').primaryKey(),
    releaseId: integer('release_id').references(() => releases.id).notNull(),
    itemType: varchar('item_type', { length: 50 }).notNull(),
    itemId: integer('item_id').notNull(),
    oldValue: jsonb('old_value'),
    newValue: jsonb('new_value'),
    changeType: varchar('change_type', { length: 20 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
    unique().on(table.releaseId, table.itemType, table.itemId),
]);

export const featureFlags = pgTable('feature_flags', {
    id: serial('id').primaryKey(),
    name: text('name').unique().notNull(),
    description: text('description'),
    status: varchar('status', { length: 10 }).default('off'),
    rolloutRules: jsonb('rollout_rules'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const releaseFeatureFlags = pgTable('release_feature_flags', {
    releaseId: integer('release_id').references(() => releases.id).notNull(),
    featureFlagId: integer('feature_flag_id').references(() => featureFlags.id).notNull(),
}, (table) => [
    primaryKey({ columns: [table.releaseId, table.featureFlagId] }),
]);

export const contexts = pgTable('contexts', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    screenshotUrl: text('screenshot_url'),
    componentName: text('component_name'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const translationKeyContexts = pgTable('translation_key_contexts', {
    translationKeyId: integer('translation_key_id').references(() => translationKeys.id).notNull(),
    contextId: integer('context_id').references(() => contexts.id).notNull(),
}, (table) => [
    primaryKey({ columns: [table.translationKeyId, table.contextId] }),
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
    createdAt: timestamp('created_at').defaultNow().notNull(),
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

export type Role = typeof roles.$inferSelect
export type NewRole = typeof roles.$inferInsert

export type UserRole = typeof userRoles.$inferSelect
export type NewUserRole = typeof userRoles.$inferInsert

export type TranslationKey = typeof translationKeys.$inferSelect
export type NewTranslationKey = typeof translationKeys.$inferInsert

export type Translation = typeof translations.$inferSelect
export type NewTranslation = typeof translations.$inferInsert

export type Release = typeof releases.$inferSelect
export type NewRelease = typeof releases.$inferInsert

export type ReleaseItem = typeof releaseItems.$inferSelect
export type NewReleaseItem = typeof releaseItems.$inferInsert

export type FeatureFlag = typeof featureFlags.$inferSelect
export type NewFeatureFlag = typeof featureFlags.$inferInsert

export type ReleaseFeatureFlag = typeof releaseFeatureFlags.$inferSelect
export type NewReleaseFeatureFlag = typeof releaseFeatureFlags.$inferInsert

export type Context = typeof contexts.$inferSelect
export type NewContext = typeof contexts.$inferInsert

export type TranslationKeyContext = typeof translationKeyContexts.$inferSelect
export type NewTranslationKeyContext = typeof translationKeyContexts.$inferInsert

export type ServiceToken = typeof serviceTokens.$inferSelect
export type NewServiceToken = typeof serviceTokens.$inferInsert

export type Permission = typeof permissions.$inferSelect
export type NewPermission = typeof permissions.$inferInsert

export type RolePermission = typeof rolePermissions.$inferSelect
export type NewRolePermission = typeof rolePermissions.$inferInsert

export type UserAuditLog = typeof userAuditLogs.$inferSelect
export type NewUserAuditLog = typeof userAuditLogs.$inferInsert