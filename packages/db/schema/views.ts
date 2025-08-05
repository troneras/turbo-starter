import { pgView, bigint, varchar, text, timestamp, uuid, jsonb, boolean, integer } from 'drizzle-orm/pg-core'
import { entityVersions } from './entities'

// Optimized canonical view for entities based on active release
export const vEntities = pgView('v_entities').as((qb) => 
  qb.select({
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
    // Note: is_from_active_release is computed in the actual SQL view
    // but we can't represent this directly in Drizzle view definition
  }).from(entityVersions)
)



// Note: The actual SQL views include complex logic with DISTINCT ON and joins
// that cannot be fully represented in Drizzle's view API. The actual views
// are created via SQL migrations for now.
// See migrations/001_release_views.sql for the actual view definitions