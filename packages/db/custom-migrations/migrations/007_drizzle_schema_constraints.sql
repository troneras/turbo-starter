-- =============================================================================
-- CONSTRAINTS AND INDEXES THAT CANNOT BE REPRESENTED IN DRIZZLE SCHEMA FILES
-- =============================================================================
-- These constraints and indexes need to remain as SQL migrations since they involve
-- complex logic that cannot be expressed in Drizzle schema definitions

-- =============================================================================
-- CHECK CONSTRAINTS
-- =============================================================================

-- For now, add check constraints to enforce valid values
-- Note: In production, you might want to convert these to use the enum types
ALTER TABLE releases
  ADD CONSTRAINT releases_status_valid
  CHECK (status IN ('OPEN', 'CLOSED', 'DEPLOYED', 'ROLLED_BACK'));

ALTER TABLE entity_versions
  ADD CONSTRAINT entity_versions_change_type_valid
  CHECK (change_type IN ('CREATE', 'UPDATE', 'DELETE'));

ALTER TABLE relation_versions
  ADD CONSTRAINT relation_versions_action_valid
  CHECK (action IN ('ADD', 'REMOVE'));

-- Enforce deploy_seq / status integrity
-- Ensures DEPLOYED releases always have deploy_seq and vice versa
ALTER TABLE releases
  ADD CONSTRAINT releases_deployseq_status_ck
  CHECK ((status = 'DEPLOYED') = (deploy_seq IS NOT NULL));

-- Check constraint to ensure entity_key is provided for certain entity types
ALTER TABLE entity_versions
  ADD CONSTRAINT ck_entity_key_required
  CHECK (
    (entity_type IN ('translation', 'feature_flag', 'setting') AND entity_key IS NOT NULL)
    OR entity_type NOT IN ('translation', 'feature_flag', 'setting')
  );

-- Check constraint to ensure locale is provided for translations
ALTER TABLE entity_versions
  ADD CONSTRAINT ck_translation_locale_required
  CHECK (
    (entity_type = 'translation' AND locale_id IS NOT NULL)
    OR entity_type != 'translation'
  );

-- Add FK constraint for parent_entity_id with ON DELETE SET NULL
ALTER TABLE entity_versions
  ADD CONSTRAINT fk_entity_versions_parent_entity
  FOREIGN KEY (parent_entity_id) REFERENCES entities(id) ON DELETE SET NULL;

-- Add check constraint for translation key format
-- Note: Removed this constraint as 'translation_key' is not a valid entity_type
-- and validate_translation_key function doesn't exist

-- Add check constraint for translation status
ALTER TABLE entity_versions
ADD CONSTRAINT check_translation_status
CHECK (
  entity_type != 'translation' OR 
  status IN ('DRAFT', 'PENDING', 'APPROVED')
);

-- =============================================================================
-- UNIQUE CONSTRAINTS
-- =============================================================================


-- Unique constraint for translations
-- Ensures one translation per key per locale per release
CREATE UNIQUE INDEX IF NOT EXISTS uq_translation_key_locale_release
  ON entity_versions (entity_key, locale_id, release_id)
  WHERE entity_type = 'translation' AND entity_key IS NOT NULL;

  -- Add unique constraint for relation_versions to prevent duplicates
  CREATE UNIQUE INDEX IF NOT EXISTS uq_relation_versions_unique
    ON relation_versions (left_entity_id, right_entity_id, relation_type, release_id);



-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_releases_deploy_seq
  ON releases(deploy_seq)
  WHERE deploy_seq IS NOT NULL;

-- Composite index for view performance  
CREATE INDEX IF NOT EXISTS idx_releases_id_deploy_seq
  ON releases(id, deploy_seq);

-- Optimized index for DISTINCT ON performance in v_entities view
-- Order matches the ORDER BY clause: entity_id, then release_id DESC for proper sort elimination
CREATE INDEX IF NOT EXISTS idx_entity_versions_entity_release_optimized
  ON entity_versions(entity_id, release_id DESC);

CREATE INDEX IF NOT EXISTS idx_entity_versions_parent
  ON entity_versions(parent_entity_id, release_id)
  WHERE parent_entity_id IS NOT NULL;

-- Indexes for the new fields
CREATE INDEX IF NOT EXISTS idx_entity_versions_entity_key 
  ON entity_versions(entity_key, release_id)
  WHERE entity_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_entity_versions_parent_entity 
  ON entity_versions(parent_entity_id, release_id)
  WHERE parent_entity_id IS NOT NULL;

-- Add partial index for efficient soft-delete queries (replaces duplicate indexes)
-- This is more efficient than the previous is_deleted index as it only indexes active records
CREATE INDEX IF NOT EXISTS idx_entity_versions_active_only
  ON entity_versions(entity_id, release_id)
  WHERE is_deleted = FALSE;

-- Add simple index for conflict detection queries
CREATE INDEX IF NOT EXISTS idx_entity_versions_release_entity
  ON entity_versions(release_id, entity_id);

-- Essential JSONB indexes only - avoid redundancy per technical review

-- 1. Generic JSONB containment queries (most common)
CREATE INDEX IF NOT EXISTS idx_entity_versions_payload_gin
  ON entity_versions USING gin (payload jsonb_path_ops)
  WHERE payload IS NOT NULL;

