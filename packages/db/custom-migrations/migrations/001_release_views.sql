-- =============================================================================
-- COMPLEX VIEWS THAT CANNOT BE REPRESENTED IN DRIZZLE SCHEMA FILES (Updated v2)
-- =============================================================================
-- These views contain complex logic that cannot be expressed in Drizzle's view API
-- The basic table structures and enums are now defined in Drizzle schema files

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Drop the view if it exists to recreate it
DROP VIEW IF EXISTS v_entities;

-- Function to get entities for a specific release (optimized version)
-- This function is used by the complex views below
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

-- Simplified canonical view for entities based on active release
-- For now, just return all entity_versions for testing
CREATE OR REPLACE VIEW v_entities AS
SELECT 
  ev.*,
  false AS is_from_active_release
FROM entity_versions ev;

