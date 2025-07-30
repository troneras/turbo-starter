-- Add release-related permissions
INSERT INTO permissions (name, description, resource, action, category, created_at)
VALUES 
    ('releases:create', 'Create new releases', 'releases', 'create', 'releases', NOW()),
    ('releases:read', 'View releases', 'releases', 'read', 'releases', NOW()),
    ('releases:update', 'Update release metadata', 'releases', 'update', 'releases', NOW()),
    ('releases:close', 'Close releases for editing', 'releases', 'close', 'releases', NOW()),
    ('releases:deploy', 'Deploy releases to production', 'releases', 'deploy', 'releases', NOW()),
    ('releases:rollback', 'Rollback to previous releases', 'releases', 'rollback', 'releases', NOW()),
    ('releases:delete', 'Delete releases', 'releases', 'delete', 'releases', NOW()),
    ('releases:preview', 'Preview release content', 'releases', 'preview', 'releases', NOW()),
    ('releases:diff', 'View differences between releases', 'releases', 'diff', 'releases', NOW())
ON CONFLICT (name) DO NOTHING;

-- Grant release permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
AND p.name IN (
    'releases:create', 'releases:read', 'releases:update', 'releases:close',
    'releases:deploy', 'releases:rollback', 'releases:delete', 'releases:preview', 'releases:diff'
)
ON CONFLICT DO NOTHING;

-- Grant limited release permissions to editor role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'editor'
AND p.name IN (
    'releases:create', 'releases:read', 'releases:update', 
    'releases:close', 'releases:preview', 'releases:diff'
)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- PERFORMANCE OPTIMIZATIONS AND CONSTRAINTS
-- =============================================================================

-- Update tables to use enum types for better validation
-- Note: In production, you might want to do this gradually to avoid locks

-- Convert releases.status to enum (commented out - requires careful migration)
/*
ALTER TABLE releases 
  ALTER COLUMN status TYPE release_status USING status::release_status;
*/

-- Convert entity_versions.change_type to enum (commented out)
/*
ALTER TABLE entity_versions 
  ALTER COLUMN change_type TYPE entity_change_type USING change_type::entity_change_type;
*/

-- Convert relation_versions.action to enum (commented out)
/*
ALTER TABLE relation_versions 
  ALTER COLUMN action TYPE relation_action_type USING action::relation_action_type;
*/

-- For now, add check constraints to enforce valid values
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

-- Removed: Redundant GIN index - handled by general payload index below

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

-- =============================================================================
-- UNIQUE CONSTRAINTS FOR DATA INTEGRITY
-- =============================================================================

-- Unique constraint for editorial content using partial unique indexes
-- This ensures you can't create two pages with the same slug in the same release
-- within the same brand/jurisdiction/locale context
CREATE UNIQUE INDEX IF NOT EXISTS uq_slug_context_release
  ON entity_versions (slug, brand_id, jurisdiction_id, locale_id, release_id)
  WHERE entity_type IN ('page', 'article', 'content') AND slug IS NOT NULL;

-- Unique constraint for translations
-- Ensures one translation per key per locale per release
CREATE UNIQUE INDEX IF NOT EXISTS uq_translation_key_locale_release
  ON entity_versions (entity_key, locale_id, release_id)
  WHERE entity_type = 'translation' AND entity_key IS NOT NULL;

-- Unique constraint for feature flags
-- Ensures one flag per key per release
CREATE UNIQUE INDEX IF NOT EXISTS uq_feature_flag_key_release
  ON entity_versions (entity_key, release_id)
  WHERE entity_type = 'feature_flag' AND entity_key IS NOT NULL;

-- Add unique constraint for relation_versions to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS uq_relation_versions_unique
  ON relation_versions (left_entity_id, right_entity_id, relation_type, release_id);

-- =============================================================================
-- CHECK CONSTRAINTS
-- =============================================================================

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

-- =============================================================================
-- ADDITIONAL PERFORMANCE OPTIMIZATIONS
-- =============================================================================

-- Add simple index for conflict detection queries
-- Removed illegal subquery-based partial index per technical review
-- For ~100 changes per release, a simple release_id + status combination works fine
CREATE INDEX IF NOT EXISTS idx_entity_versions_release_entity
  ON entity_versions(release_id, entity_id);

-- Essential JSONB indexes only - avoid redundancy per technical review

-- 1. Generic JSONB containment queries (most common)
CREATE INDEX IF NOT EXISTS idx_entity_versions_payload_gin
  ON entity_versions USING gin (payload jsonb_path_ops)
  WHERE payload IS NOT NULL;

-- 2. Full-text search on translation values only (specialized use case)
-- Note: Requires pg_trgm extension - enable with: CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_entity_versions_translation_value_gin
  ON entity_versions USING gin ((payload->>'value') gin_trgm_ops)
  WHERE entity_type = 'translation' AND payload ? 'value';

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Create trigger to auto-populate entity_name (INSERT only - UPDATEs are blocked)
DROP TRIGGER IF EXISTS trg_set_entity_name ON entity_versions;
CREATE TRIGGER trg_set_entity_name
  BEFORE INSERT ON entity_versions
  FOR EACH ROW EXECUTE FUNCTION set_entity_name();

-- Create trigger to enforce immutability (append-only)
CREATE OR REPLACE FUNCTION prevent_entity_version_updates()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'entity_versions is append-only - updates not allowed. Create a new version instead.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_updates_entity_versions ON entity_versions;
CREATE TRIGGER trg_prevent_updates_entity_versions
  BEFORE UPDATE ON entity_versions
  FOR EACH ROW EXECUTE FUNCTION prevent_entity_version_updates();

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS trg_audit_entity_versions ON entity_versions;
CREATE TRIGGER trg_audit_entity_versions
  AFTER INSERT OR DELETE ON entity_versions
  FOR EACH ROW EXECUTE FUNCTION log_entity_version_changes();

-- Create trigger for release status changes
DROP TRIGGER IF EXISTS trg_audit_releases ON releases;
CREATE TRIGGER trg_audit_releases
  AFTER UPDATE ON releases
  FOR EACH ROW EXECUTE FUNCTION log_release_changes();

-- =============================================================================
-- STATISTICS UPDATE
-- =============================================================================

-- =============================================================================
-- AUDIT EVENTS PARTITIONING PREPARATION
-- =============================================================================

-- Add function to create monthly partitions for audit_events
CREATE OR REPLACE FUNCTION create_audit_events_partition(start_date DATE)
RETURNS VOID AS $$
DECLARE
    table_name TEXT;
    end_date DATE;
BEGIN
    -- Calculate partition name and end date
    table_name := 'audit_events_' || to_char(start_date, 'YYYY_MM');
    end_date := start_date + INTERVAL '1 month';
    
    -- Create partition if it doesn't exist
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_events
        FOR VALUES FROM (%L) TO (%L);
    ', table_name, start_date, end_date);
    
    -- Add indexes to the partition
    EXECUTE format('
        CREATE INDEX IF NOT EXISTS %I ON %I(entity_id, changed_at DESC);
    ', table_name || '_entity_idx', table_name);
    
    EXECUTE format('
        CREATE INDEX IF NOT EXISTS %I ON %I(release_id, changed_at DESC);
    ', table_name || '_release_idx', table_name);
    
    EXECUTE format('
        CREATE INDEX IF NOT EXISTS %I ON %I(changed_by, changed_at DESC);
    ', table_name || '_user_idx', table_name);
END;
$$ LANGUAGE plpgsql;

-- Convert audit_events to partitioned table (commented out - run manually when ready)
-- This requires downtime, so it's provided as a manual migration
/*
BEGIN;
-- Rename existing table
ALTER TABLE audit_events RENAME TO audit_events_old;

-- Create new partitioned table
CREATE TABLE audit_events (
    id BIGSERIAL,
    entity_id BIGINT NOT NULL,
    release_id BIGINT NOT NULL,
    entity_type VARCHAR(50),
    operation VARCHAR(20) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_by UUID NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    request_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    PRIMARY KEY (id, changed_at)
) PARTITION BY RANGE (changed_at);

-- Create initial partition for current month
SELECT create_audit_events_partition(date_trunc('month', CURRENT_DATE));

-- Migrate existing data
INSERT INTO audit_events SELECT * FROM audit_events_old;

-- Drop old table
DROP TABLE audit_events_old;
COMMIT;
*/

-- Create function to automatically create partitions
CREATE OR REPLACE FUNCTION ensure_audit_partition_exists()
RETURNS TRIGGER AS $$
BEGIN
    -- Create partition for the month of the new record if it doesn't exist
    PERFORM create_audit_events_partition(date_trunc('month', NEW.changed_at)::DATE);
    RETURN NEW;
EXCEPTION
    WHEN duplicate_table THEN
        -- Partition already exists, continue
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment about partition maintenance
COMMENT ON FUNCTION create_audit_events_partition(DATE) IS 'Creates monthly partitions for audit_events. Run monthly or set up automated partition creation.';

-- =============================================================================
-- STATISTICS UPDATE
-- =============================================================================

-- Update statistics for query performance
ANALYZE releases;
ANALYZE entities;
ANALYZE entity_versions;
ANALYZE relation_versions;
ANALYZE audit_events;