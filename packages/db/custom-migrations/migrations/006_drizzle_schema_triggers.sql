-- =============================================================================
-- TRIGGERS THAT CANNOT BE REPRESENTED IN DRIZZLE SCHEMA FILES
-- =============================================================================
-- These triggers need to remain as SQL migrations since Drizzle doesn't support
-- trigger definitions in schema files

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