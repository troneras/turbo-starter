-- Create canonical views for release-aware queries
-- These views automatically filter entities based on the active release

-- =============================================================================
-- REQUIRED EXTENSIONS
-- =============================================================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =============================================================================
-- ENUM TYPES FOR DATA VALIDATION
-- =============================================================================

-- Create enum types for better data validation and performance
CREATE TYPE release_status AS ENUM ('OPEN', 'CLOSED', 'DEPLOYED', 'ROLLED_BACK');
CREATE TYPE entity_change_type AS ENUM ('CREATE', 'UPDATE', 'DELETE');
CREATE TYPE relation_action_type AS ENUM ('ADD', 'REMOVE');

-- Common entity types (can be extended)
CREATE TYPE entity_type_enum AS ENUM (
    'translation', 'feature_flag', 'setting', 'page', 'article', 'content',
    'menu', 'navigation', 'component', 'template', 'media', 'user_preference'
);

-- Audit event table for proper audit trail
CREATE TABLE IF NOT EXISTS audit_events (
    id BIGSERIAL PRIMARY KEY,
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
    user_agent TEXT
);

-- Indexes for audit events
CREATE INDEX idx_audit_events_entity 
  ON audit_events(entity_id, changed_at DESC);

CREATE INDEX idx_audit_events_release 
  ON audit_events(release_id, changed_at DESC);

CREATE INDEX idx_audit_events_user 
  ON audit_events(changed_by, changed_at DESC);

-- Function to get entities for a specific release (optimized version)
CREATE OR REPLACE FUNCTION get_entities_for_release(target_release_id bigint)
RETURNS TABLE (
    entity_id bigint,
    release_id bigint,
    entity_type varchar(50),
    entity_name text,
    entity_key varchar(255),
    brand_id bigint,
    jurisdiction_id bigint,
    locale_id bigint,
    parent_entity_id bigint,
    payload jsonb,
    change_type varchar(20),
    created_at timestamp,
    created_by uuid,
    is_deleted boolean,
    version_id bigint
) AS $$
BEGIN
    RETURN QUERY
    WITH target_release AS (
        SELECT id, deploy_seq
        FROM releases
        WHERE id = target_release_id
        LIMIT 1
    )
    SELECT DISTINCT ON (ev.entity_id)
        ev.entity_id,
        ev.release_id,
        ev.entity_type,
        ev.entity_name,
        ev.entity_key,
        ev.brand_id,
        ev.jurisdiction_id,
        ev.locale_id,
        ev.parent_entity_id,
        ev.payload,
        ev.change_type,
        ev.created_at,
        ev.created_by,
        ev.is_deleted,
        ev.id as version_id
    FROM entity_versions ev
    INNER JOIN releases r ON ev.release_id = r.id
    CROSS JOIN target_release tr
    WHERE 
        -- Include if it's the target release itself
        ev.release_id = tr.id
        OR (
            -- Or if it's from a deployed release at or before the target
            -- Handle OPEN releases by including all deployed releases when deploy_seq IS NULL
            r.deploy_seq IS NOT NULL
            AND (tr.deploy_seq IS NULL OR r.deploy_seq <= tr.deploy_seq)
        )
    ORDER BY 
        ev.entity_id, 
        (ev.release_id = tr.id) DESC,  -- Prioritize target release
        r.deploy_seq DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Optimized canonical view for entities based on active release
CREATE OR REPLACE VIEW v_entities AS
WITH active_release AS (
  SELECT id, deploy_seq
  FROM releases
  WHERE id = current_setting('cms.active_release', true)::bigint
  LIMIT 1
)
SELECT DISTINCT ON (ev.entity_id)
  ev.*,
  (ev.release_id = ar.id) AS is_from_active_release
FROM entity_versions ev
INNER JOIN releases r ON r.id = ev.release_id
CROSS JOIN active_release ar
WHERE 
  ev.release_id = ar.id  -- Direct match with active release
  OR (
    r.status = 'DEPLOYED' 
    AND r.deploy_seq IS NOT NULL
    AND (ar.deploy_seq IS NULL OR r.deploy_seq <= ar.deploy_seq)
    -- Include if from a deployed release before or at the active release's deploy point
  )
ORDER BY 
  ev.entity_id,
  (ev.release_id = ar.id) DESC,  -- Prioritize active release
  r.deploy_seq DESC;  -- Then most recent deployed

-- View for active translations (convenience view)
CREATE OR REPLACE VIEW v_active_translations AS
SELECT 
    entity_id as translation_id,
    entity_key as translation_key,
    brand_id,
    jurisdiction_id,
    locale_id,
    payload->>'value' as translation_value,
    payload->'metadata' as metadata,
    is_deleted,
    created_at,
    created_by
FROM v_entities
WHERE entity_type = 'translation'
AND is_deleted = FALSE;