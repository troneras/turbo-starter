# Release Management System

## Overview

The CMS Platform implements a sophisticated **edition-based release system** that brings Git-like version control to content management. This system enables teams to work on content changes in isolation, preview them before deployment, and instantly rollback if issues arise.

## Core Concepts

### What is a Release?

A **release** is a container for a set of related content changes, similar to a Git branch. Every content modification happens within the context of a release, ensuring changes are grouped logically and can be deployed atomically.

### Key Benefits

- **Atomic Deployments**: All changes in a release deploy together or not at all
- **Instant Rollback**: Switch back to any previous release in milliseconds
- **Parallel Development**: Multiple teams can work on different releases simultaneously
- **Preview & Testing**: View and test content changes before they go live
- **Complete Audit Trail**: Every change is tracked with who, what, when, and why

## Architecture

### Database Design

The release system is built on three core database concepts:

#### 1. Releases Table

```sql
CREATE TABLE releases (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    deploy_seq BIGINT UNIQUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    deployed_at TIMESTAMP,
    deployed_by UUID
);
```

**Status Values**:
- `OPEN` - Accepting new changes
- `CLOSED` - Locked for deployment
- `DEPLOYED` - Live in production
- `ROLLED_BACK` - Previously deployed, now inactive

#### 2. Entity Versions Table

```sql
CREATE TABLE entity_versions (
    id BIGSERIAL PRIMARY KEY,
    entity_id BIGINT NOT NULL,
    release_id BIGINT NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    payload JSONB,
    change_type VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID NOT NULL
);
```

Every content change creates an immutable version linked to the current release.

#### 3. Deploy Sequence

The `deploy_seq` column provides monotonic ordering of deployments, ensuring consistent state across the system and enabling efficient rollback operations.

### Release Context

Every API request operates within a **release context** that determines which version of content is visible:

```typescript
// Set via HTTP header
X-CMS-Release: 12345

// Or defaults to latest deployed release
```

The release context is stored as a PostgreSQL session variable:

```sql
SET cms.active_release = '12345';
```

### Canonical Views

Database views automatically filter content based on the active release:

```sql
CREATE VIEW v_entities AS
SELECT DISTINCT ON (entity_id) *
FROM entity_versions
WHERE release_id = current_setting('cms.active_release')::bigint
   OR (release_id IN deployed_releases AND NOT EXISTS newer_version)
ORDER BY entity_id, deploy_sequence DESC;
```

## Workflow

### 1. Creating a Release

```typescript
POST /api/releases
{
  "name": "Q4 2024 Product Updates",
  "description": "New product features and translations"
}
```

Creates a new release based on the current production state.

### 2. Making Changes

All content modifications automatically associate with the active release:

```typescript
// Set release context
headers: { 'X-CMS-Release': '12345' }

// Make changes
PUT /api/translations/67890
{
  "value": "Updated translation text"
}
```

### 3. Preview & Testing

View the release in isolation:

```typescript
// All content filtered to this release
GET /api/translations
headers: { 'X-CMS-Release': '12345' }
```

### 4. Deployment

Deploy all changes atomically:

```typescript
POST /api/releases/12345/deploy
{
  "confirmationToken": "DEPLOY-CONFIRMED"
}
```

The system:
1. Assigns a new deploy sequence number
2. Updates release status to DEPLOYED
3. Makes all changes immediately visible in production

### 5. Rollback

Instantly revert to a previous release:

```typescript
POST /api/releases/rollback
{
  "targetReleaseId": "12340",
  "confirmationToken": "ROLLBACK-CONFIRMED"
}
```

## Technical Implementation

### Release Context Middleware

```typescript
// apps/api/src/plugins/app/releases/release-context.ts
fastify.addHook('onRequest', async (request) => {
  // Get release from header or use latest deployed
  const releaseId = request.headers['x-cms-release'] 
    || await releases.getLatestDeployedRelease();
  
  // Set PostgreSQL session variable
  await db.execute(sql`SELECT set_active_release(${releaseId})`);
  
  // Attach to request for logging
  request.releaseContext = { releaseId };
});
```

### Database Functions

**get_active_release()**: Returns the current release from session
```sql
CREATE FUNCTION get_active_release() RETURNS BIGINT AS $$
BEGIN
  RETURN current_setting('cms.active_release', true)::BIGINT;
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

**calculate_release_diff()**: Computes changes between releases
```sql
CREATE FUNCTION calculate_release_diff(from_id BIGINT, to_id BIGINT)
RETURNS TABLE(entity_id BIGINT, change_type VARCHAR, ...) AS $$
BEGIN
  -- Returns ADDED, MODIFIED, DELETED changes
END;
$$ LANGUAGE plpgsql;
```

### API Endpoints

- `GET /api/releases` - List all releases
- `POST /api/releases` - Create new release
- `GET /api/releases/:id` - Get release details
- `PATCH /api/releases/:id` - Update release metadata
- `POST /api/releases/:id/deploy` - Deploy a release
- `POST /api/releases/rollback` - Rollback to previous
- `POST /api/releases/diff` - Compare two releases
- `GET /api/releases/active` - Get current active release

### Permissions

Release operations are protected by RBAC:

- `releases:create` - Create new releases (editor, admin)
- `releases:read` - View releases (all authenticated)
- `releases:update` - Modify release metadata (editor, admin)
- `releases:deploy` - Deploy to production (admin only)
- `releases:rollback` - Perform rollbacks (admin only)

## Best Practices

### Release Naming

Use descriptive names that indicate purpose and timing:
- ✅ "Q4 2024 Holiday Campaign"
- ✅ "Black Friday Price Updates"
- ❌ "Release 123"
- ❌ "John's changes"

### Release Scope

Keep releases focused on related changes:
- ✅ All translations for a new feature
- ✅ Complete marketing campaign content
- ❌ Unrelated changes across multiple features

### Testing Strategy

1. Create release in development environment
2. Make and test all changes
3. Close release when ready
4. Deploy to staging for final validation
5. Deploy to production with confidence

### Rollback Planning

Before deploying:
1. Note the current deployed release ID
2. Ensure you have rollback permissions
3. Communicate rollback procedures to team
4. Monitor after deployment

## Advanced Features

### Release Branching

Create a new release based on another release:

```typescript
POST /api/releases
{
  "name": "Hotfix for Release 12345",
  "baseReleaseId": "12345"
}
```

### Partial Rollback

Cherry-pick specific changes from a release (coming soon):

```typescript
POST /api/releases/12350/cherry-pick
{
  "entityIds": [100, 101, 102],
  "targetReleaseId": "12360"
}
```

### Release Comparison

View detailed diff between releases:

```typescript
POST /api/releases/diff
{
  "fromReleaseId": "12345",
  "toReleaseId": "12350",
  "entityTypes": ["translation", "content"]
}
```

## Troubleshooting

### Common Issues

**Release Context Not Set**
- Ensure `X-CMS-Release` header is included
- Check middleware is properly registered
- Verify PostgreSQL session variables are enabled

**Cannot See Changes**
- Confirm you're viewing the correct release
- Check if release has been deployed
- Verify entity versions were created

**Deployment Fails**
- Ensure release is in CLOSED status
- Check user has deploy permissions
- Review deploy sequence for conflicts

### Monitoring

Track release operations via logs:

```typescript
fastify.log.info({
  releaseId: 12345,
  action: 'deploy',
  user: 'admin@example.com',
  timestamp: new Date()
}, 'Release deployed successfully');
```

## Migration Guide

### From Traditional CMS

1. **Initial State**: Import existing content as "Release 0"
2. **First Release**: Create first release for new changes
3. **Gradual Adoption**: Start with low-risk content types
4. **Full Migration**: Move all content operations to releases

### Data Migration

```sql
-- Import existing content as initial release
INSERT INTO releases (name, status, deploy_seq)
VALUES ('Initial Import', 'DEPLOYED', 1);

-- Convert existing content to entity versions
INSERT INTO entity_versions (entity_id, release_id, ...)
SELECT id, 1, ... FROM legacy_content;
```

## Future Enhancements

- **Scheduled Deployments**: Deploy releases at specific times
- **Approval Workflows**: Require sign-off before deployment
- **Release Templates**: Predefined release configurations
- **Conflict Resolution**: Automatic merge of non-conflicting changes
- **Release Analytics**: Track deployment success and rollback rates