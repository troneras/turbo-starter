    -- =============================================================================
-- PERMISSIONS AND BASIC SETUP
-- =============================================================================
-- This file contains permissions and basic setup that cannot be represented in Drizzle schema files

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

-- Note: Functions have been moved to 005_drizzle_schema_functions.sql
-- Note: Triggers have been moved to 006_drizzle_schema_triggers.sql
-- Note: Constraints and indexes have been moved to 007_drizzle_schema_constraints.sql