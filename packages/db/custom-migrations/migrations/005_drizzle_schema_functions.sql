-- =============================================================================
-- FUNCTIONS THAT CANNOT BE REPRESENTED IN DRIZZLE SCHEMA FILES
-- =============================================================================
-- These functions need to remain as SQL migrations since Drizzle doesn't support
-- function definitions in schema files

-- Create function to get active release from session variable
CREATE OR REPLACE FUNCTION get_active_release()
RETURNS bigint
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    release_id bigint;
BEGIN
    -- Try to get release ID from session variable
    BEGIN
        release_id := current_setting('cms.active_release', true)::bigint;
    EXCEPTION
        WHEN OTHERS THEN
            -- If not set or invalid, return NULL
            release_id := NULL;
    END;
    
    RETURN release_id;
END;
$$;

-- Create function to set active release in session
CREATE OR REPLACE FUNCTION set_active_release(release_id bigint)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Set the session variable
    PERFORM set_config('cms.active_release', release_id::text, false);
END;
$$;

-- Create function to get the latest deployed release
CREATE OR REPLACE FUNCTION get_latest_deployed_release()
RETURNS bigint
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    release_id bigint;
BEGIN
    SELECT id INTO release_id
    FROM releases
    WHERE status = 'DEPLOYED'
    ORDER BY deploy_seq DESC
    LIMIT 1;
    
    RETURN release_id;
END;
$$;

-- Optimized function to calculate release diff with temp tables
CREATE OR REPLACE FUNCTION calculate_release_diff(from_release_id bigint, to_release_id bigint)
RETURNS TABLE (
    entity_id bigint,
    entity_type varchar(50),
    entity_name text,
    change_type varchar(20),
    from_payload jsonb,
    to_payload jsonb
) AS $$
BEGIN
    -- Create temporary tables with indexes for better join performance
    CREATE TEMP TABLE _from_entities ON COMMIT DROP AS
    SELECT * FROM get_entities_for_release(from_release_id);
    
    CREATE INDEX ON _from_entities(entity_id);
    
    CREATE TEMP TABLE _to_entities ON COMMIT DROP AS
    SELECT * FROM get_entities_for_release(to_release_id);
    
    CREATE INDEX ON _to_entities(entity_id);
    
    RETURN QUERY
    -- Added entities (in to_release but not in from_release)
    SELECT 
        t.entity_id,
        t.entity_type,
        t.entity_name,
        'ADDED'::varchar(20) as change_type,
        NULL::jsonb as from_payload,
        t.payload as to_payload
    FROM _to_entities t
    LEFT JOIN _from_entities f ON t.entity_id = f.entity_id
    WHERE f.entity_id IS NULL
    
    UNION ALL
    
    -- Modified entities
    SELECT 
        t.entity_id,
        t.entity_type,
        t.entity_name,
        'MODIFIED'::varchar(20) as change_type,
        f.payload as from_payload,
        t.payload as to_payload
    FROM _to_entities t
    INNER JOIN _from_entities f ON t.entity_id = f.entity_id
    WHERE t.payload IS DISTINCT FROM f.payload
    
    UNION ALL
    
    -- Deleted entities (in from_release but not in to_release)
    SELECT 
        f.entity_id,
        f.entity_type,
        f.entity_name,
        'DELETED'::varchar(20) as change_type,
        f.payload as from_payload,
        NULL::jsonb as to_payload
    FROM _from_entities f
    LEFT JOIN _to_entities t ON f.entity_id = t.entity_id
    WHERE t.entity_id IS NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Enhanced conflict detection function for pre-deploy checks
CREATE OR REPLACE FUNCTION check_release_conflicts(release_id bigint)
RETURNS TABLE (
    entity_id bigint,
    conflicting_release_id bigint,
    conflicting_release_name text,
    entity_type varchar(50),
    entity_key varchar(255),
    conflict_type varchar(20)
) AS $$
DECLARE
    candidate_created_at timestamptz;
    candidate_base_deploy_seq bigint;
BEGIN
    -- Get candidate release info
    SELECT created_at INTO candidate_created_at
    FROM releases
    WHERE id = release_id;
    
    -- Find the highest deploy_seq at the time this release was created
    -- This represents the "branch point" from production
    SELECT COALESCE(MAX(deploy_seq), 0) INTO candidate_base_deploy_seq
    FROM releases
    WHERE status = 'DEPLOYED' 
    AND deployed_at <= candidate_created_at;
    
    RETURN QUERY
    WITH release_entities AS (
        SELECT DISTINCT ev.entity_id, ev.entity_type, ev.entity_key
        FROM entity_versions ev
        WHERE ev.release_id = check_release_conflicts.release_id
    ),
    conflicting_releases AS (
        -- Other OPEN releases (parallel work conflicts)
        SELECT id, name, 'PARALLEL' as conflict_type
        FROM releases
        WHERE status = 'OPEN' 
        AND id != check_release_conflicts.release_id
        
        UNION ALL
        
        -- Deployed releases after our branch point (overwrite conflicts)
        SELECT id, name, 'OVERWRITE' as conflict_type
        FROM releases
        WHERE status = 'DEPLOYED'
        AND deploy_seq > candidate_base_deploy_seq
    )
    SELECT 
        re.entity_id,
        ev.release_id as conflicting_release_id,
        cr.name as conflicting_release_name,
        re.entity_type,
        re.entity_key,
        cr.conflict_type
    FROM release_entities re
    INNER JOIN entity_versions ev ON ev.entity_id = re.entity_id
    INNER JOIN conflicting_releases cr ON cr.id = ev.release_id
    ORDER BY re.entity_id, cr.conflict_type, cr.name;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to automatically set entity_name from title or entity_key
-- Note: This function is currently disabled since entity_name field doesn't exist in current schema
CREATE OR REPLACE FUNCTION set_entity_name()
RETURNS TRIGGER AS $$
BEGIN
  -- This function is currently a no-op since entity_name field doesn't exist
  -- in the current entity_versions schema. Keeping for future compatibility.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for audit logging
CREATE OR REPLACE FUNCTION log_entity_version_changes() 
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_events(
            entity_id, 
            release_id, 
            entity_type,
            operation, 
            new_data, 
            changed_by
        )
        VALUES (
            NEW.entity_id, 
            NEW.release_id,
            NEW.entity_type,
            NEW.change_type,
            to_jsonb(NEW), 
            NEW.created_by
        );
    ELSIF TG_OP = 'UPDATE' THEN
        -- Entity versions should be immutable, but log if it happens
        INSERT INTO audit_events(
            entity_id, 
            release_id,
            entity_type, 
            operation, 
            old_data,
            new_data, 
            changed_by
        )
        VALUES (
            NEW.entity_id, 
            NEW.release_id,
            NEW.entity_type,
            'UPDATE', 
            to_jsonb(OLD),
            to_jsonb(NEW), 
            NEW.created_by
        );
    ELSIF TG_OP = 'DELETE' THEN
        -- Should not happen in normal operation
        INSERT INTO audit_events(
            entity_id, 
            release_id,
            entity_type, 
            operation, 
            old_data,
            changed_by
        )
        VALUES (
            OLD.entity_id, 
            OLD.release_id,
            OLD.entity_type,
            'DELETE', 
            to_jsonb(OLD),
            OLD.created_by
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function for release status change logging
CREATE OR REPLACE FUNCTION log_release_changes() 
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO audit_events(
            entity_id, 
            release_id,
            entity_type, 
            operation, 
            old_data,
            new_data, 
            changed_by
        )
        VALUES (
            NULL, -- Release changes don't have an entity_id since releases aren't entities
            NEW.id,
            'release', 
            'STATUS_CHANGE', 
            jsonb_build_object('status', OLD.status, 'deploy_seq', OLD.deploy_seq),
            jsonb_build_object('status', NEW.status, 'deploy_seq', NEW.deploy_seq), 
            COALESCE(NEW.deployed_by, NEW.created_by)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enhanced function to validate release can be deployed (no conflicts)
CREATE OR REPLACE FUNCTION validate_release_for_deployment(release_id bigint)
RETURNS TABLE (
    is_valid boolean,
    conflict_count bigint,
    error_message text,
    parallel_conflicts bigint,
    overwrite_conflicts bigint
) AS $$
DECLARE
    total_conflicts bigint;
    parallel_count bigint;
    overwrite_count bigint;
    release_status_val varchar(20);
BEGIN
    -- Check release status
    SELECT status INTO release_status_val
    FROM releases 
    WHERE id = release_id;
    
    IF release_status_val IS NULL THEN
        RETURN QUERY SELECT false, 0::bigint, 'Release not found', 0::bigint, 0::bigint;
        RETURN;
    END IF;
    
    IF release_status_val != 'CLOSED' THEN
        RETURN QUERY SELECT false, 0::bigint, 'Release must be CLOSED before deployment', 0::bigint, 0::bigint;
        RETURN;
    END IF;
    
    -- Check for conflicts by type
    SELECT 
        COUNT(*) FILTER (WHERE conflict_type = 'PARALLEL'),
        COUNT(*) FILTER (WHERE conflict_type = 'OVERWRITE'),
        COUNT(*)
    INTO parallel_count, overwrite_count, total_conflicts
    FROM check_release_conflicts(release_id);
    
    IF total_conflicts > 0 THEN
        DECLARE
            error_msg text := '';
        BEGIN
            IF parallel_count > 0 THEN
                error_msg := error_msg || parallel_count || ' parallel work conflicts';
            END IF;
            
            IF overwrite_count > 0 THEN
                IF error_msg != '' THEN
                    error_msg := error_msg || ', ';
                END IF;
                error_msg := error_msg || overwrite_count || ' potential overwrites of newer deployed content';
            END IF;
            
            RETURN QUERY SELECT false, total_conflicts, 'Release has conflicts: ' || error_msg, parallel_count, overwrite_count;
            RETURN;
        END;
    END IF;
    
    RETURN QUERY SELECT true, 0::bigint, 'Release is valid for deployment', 0::bigint, 0::bigint;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get release statistics
CREATE OR REPLACE FUNCTION get_release_stats(release_id bigint)
RETURNS TABLE (
    entity_count bigint,
    create_count bigint,
    update_count bigint,
    delete_count bigint,
    relation_count bigint,
    translation_count bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as entity_count,
        COUNT(*) FILTER (WHERE change_type = 'CREATE') as create_count,
        COUNT(*) FILTER (WHERE change_type = 'UPDATE') as update_count,
        COUNT(*) FILTER (WHERE change_type = 'DELETE') as delete_count,
        (SELECT COUNT(*) FROM relation_versions WHERE relation_versions.release_id = get_release_stats.release_id) as relation_count,
        COUNT(*) FILTER (WHERE entity_type = 'translation') as translation_count
    FROM entity_versions 
    WHERE entity_versions.release_id = get_release_stats.release_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function to get release branch point information
CREATE OR REPLACE FUNCTION get_release_branch_info(release_id bigint)
RETURNS TABLE (
    release_name text,
    created_at timestamptz,
    branch_point_deploy_seq bigint,
    releases_deployed_since_branch bigint
) AS $$
DECLARE
    r_created_at timestamptz;
    r_name text;
    base_deploy_seq bigint;
    newer_releases bigint;
BEGIN
    -- Get release basic info
    SELECT name, created_at INTO r_name, r_created_at
    FROM releases
    WHERE id = release_id;
    
    IF r_name IS NULL THEN
        RETURN;
    END IF;
    
    -- Find branch point (highest deploy_seq when this release was created)
    SELECT COALESCE(MAX(deploy_seq), 0) INTO base_deploy_seq
    FROM releases
    WHERE status = 'DEPLOYED' 
    AND deployed_at <= r_created_at;
    
    -- Count releases deployed since this one was branched
    SELECT COUNT(*) INTO newer_releases
    FROM releases
    WHERE status = 'DEPLOYED'
    AND deploy_seq > base_deploy_seq;
    
    RETURN QUERY SELECT r_name, r_created_at, base_deploy_seq, newer_releases;
END;
$$ LANGUAGE plpgsql STABLE; 