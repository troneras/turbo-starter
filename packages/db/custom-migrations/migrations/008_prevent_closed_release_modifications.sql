-- =============================================================================
-- PREVENT MODIFICATIONS TO ENTITIES IN CLOSED RELEASES
-- =============================================================================
-- This trigger ensures that entities cannot be modified once their release is CLOSED

-- Function to check if a release is open (modifiable)
CREATE OR REPLACE FUNCTION check_release_is_open()
RETURNS TRIGGER AS $$
DECLARE
    release_status varchar(20);
BEGIN
    -- Get the status of the release being modified
    SELECT status INTO release_status
    FROM releases 
    WHERE id = NEW.release_id;
    
    -- If release not found, allow (might be a new release being created)
    IF release_status IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Only allow modifications to OPEN releases
    IF release_status != 'OPEN' THEN
        RAISE EXCEPTION 'Cannot modify entities in % release (ID: %). Only OPEN releases can be modified.', 
            release_status, NEW.release_id
            USING ERRCODE = 'P0001', -- custom error code
                  HINT = 'Create a new OPEN release or modify an existing OPEN release';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent modifications to closed releases
DROP TRIGGER IF EXISTS trg_prevent_closed_release_modifications ON entity_versions;
CREATE TRIGGER trg_prevent_closed_release_modifications
    BEFORE INSERT ON entity_versions
    FOR EACH ROW EXECUTE FUNCTION check_release_is_open();

-- Also apply the same constraint to relation_versions if they exist
DROP TRIGGER IF EXISTS trg_prevent_closed_release_modifications_relations ON relation_versions;
CREATE TRIGGER trg_prevent_closed_release_modifications_relations
    BEFORE INSERT ON relation_versions
    FOR EACH ROW EXECUTE FUNCTION check_release_is_open();

-- Add a comment explaining the business rule
COMMENT ON FUNCTION check_release_is_open() IS 
'Enforces business rule: entities can only be modified in OPEN releases. 
CLOSED, DEPLOYED, and ROLLED_BACK releases are immutable to maintain data integrity and audit trail.';