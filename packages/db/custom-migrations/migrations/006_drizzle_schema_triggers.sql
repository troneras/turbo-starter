-- =============================================================================
-- TRIGGERS THAT CANNOT BE REPRESENTED IN DRIZZLE SCHEMA FILES
-- =============================================================================
-- These triggers need to remain as SQL migrations since Drizzle doesn't support
-- trigger definitions in schema files

-- Create trigger for audit logging
DROP TRIGGER IF EXISTS trg_audit_entity_versions ON entity_versions;
CREATE TRIGGER trg_audit_entity_versions
  AFTER INSERT OR UPDATE OR DELETE ON entity_versions
  FOR EACH ROW EXECUTE FUNCTION log_entity_version_changes();

-- Create trigger for release status changes
DROP TRIGGER IF EXISTS trg_audit_releases ON releases;
CREATE TRIGGER trg_audit_releases
  AFTER UPDATE ON releases
  FOR EACH ROW EXECUTE FUNCTION log_release_changes(); 