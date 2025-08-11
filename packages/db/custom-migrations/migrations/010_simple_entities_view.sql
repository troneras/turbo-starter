-- =============================================================================
-- SIMPLIFIED VIEW FOR DEBUGGING
-- =============================================================================

-- Simplified canonical view for entities based on active release
-- For now, just return all entity_versions for testing
CREATE OR REPLACE VIEW v_entities AS
SELECT 
  ev.*,
  false AS is_from_active_release
FROM entity_versions ev;

