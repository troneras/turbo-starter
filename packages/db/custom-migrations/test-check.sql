
-- Skip if already exists by checking first
DO $$
BEGIN
    -- Check if custom_migrations has this migration
    IF NOT EXISTS (SELECT 1 FROM custom_migrations WHERE filename = '001_release_views.sql') THEN
        -- The view and function creation SQL will be here
        RAISE NOTICE 'Creating release views...';
    ELSE
        RAISE NOTICE 'Migration 001_release_views.sql already applied';
    END IF;
END
$$;

