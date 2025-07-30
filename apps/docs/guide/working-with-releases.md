# Working with Releases - Developer Guide

This guide explains how to work with the release management system from both the API and UI perspectives.

## Quick Start

### 1. Create a Release

```bash
# Create a new release
curl -X POST http://localhost:3000/api/releases \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Feature XYZ Updates",
    "description": "Adding new translations for Feature XYZ"
  }'

# Response
{
  "id": "12345",
  "name": "Feature XYZ Updates",
  "status": "OPEN",
  "createdBy": "user@example.com",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### 2. Work Within the Release

Set the release context for all subsequent operations:

```bash
# Set release header for all requests
export RELEASE_ID="12345"

# Create/update content within this release
curl -X PUT http://localhost:3000/api/translations/some-key \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "X-CMS-Release: $RELEASE_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "feature.xyz.title",
    "value": "New Feature XYZ",
    "locale": "en-US"
  }'
```

### 3. Preview Changes

View all content as it would appear in this release:

```bash
# Get translations for this release
curl http://localhost:3000/api/translations \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "X-CMS-Release: $RELEASE_ID"
```

### 4. Deploy the Release

```bash
# First, close the release
curl -X PATCH http://localhost:3000/api/releases/$RELEASE_ID \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "CLOSED"}'

# Then deploy it
curl -X POST http://localhost:3000/api/releases/$RELEASE_ID/deploy \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirmationToken": "DEPLOY-CONFIRMED"}'
```

## Frontend Integration

### React Context Provider

The admin UI uses a Release Context Provider to manage the active release:

```typescript
// apps/admin/src/app/providers/release-provider.tsx
import { createContext, useContext, useState } from 'react'

interface ReleaseContextValue {
  activeRelease: Release | null
  setActiveRelease: (release: Release | null) => void
  isLoading: boolean
}

export const ReleaseContext = createContext<ReleaseContextValue>({
  activeRelease: null,
  setActiveRelease: () => {},
  isLoading: false
})

export function useRelease() {
  const context = useContext(ReleaseContext)
  if (!context) {
    throw new Error('useRelease must be used within ReleaseProvider')
  }
  return context
}
```

### API Client Integration

The API client automatically includes the release header:

```typescript
// apps/admin/src/lib/api-client.ts
const apiClient = {
  async request(url: string, options: RequestInit = {}) {
    const { activeRelease } = useRelease()
    
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${getToken()}`,
      ...(activeRelease && { 'X-CMS-Release': activeRelease.id })
    }
    
    return fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers
    })
  }
}
```

### Release Switcher Component

```typescript
// apps/admin/src/features/releases/components/release-switcher.tsx
export function ReleaseSwitcher() {
  const { activeRelease, setActiveRelease } = useRelease()
  const { data: releases } = useReleasesQuery()
  
  return (
    <Select
      value={activeRelease?.id}
      onValueChange={(id) => {
        const release = releases?.find(r => r.id === id)
        setActiveRelease(release || null)
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select release" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">Production (Latest Deployed)</SelectItem>
        {releases?.map(release => (
          <SelectItem key={release.id} value={release.id}>
            {release.name} ({release.status})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

## API Implementation Details

### Release Repository Plugin

```typescript
// apps/api/src/plugins/app/releases/releases-repository.ts
export function releasesRepository(fastify: FastifyInstance) {
  return {
    async createRelease(data: CreateReleaseRequest, userId: string) {
      return await fastify.db.transaction(async (tx) => {
        // Create the release
        const [release] = await tx
          .insert(releases)
          .values({
            name: data.name,
            description: data.description,
            createdBy: userId,
            status: 'OPEN'
          })
          .returning()
          
        // Copy current state if baseReleaseId provided
        if (data.baseReleaseId) {
          await this.copyReleaseContent(
            data.baseReleaseId, 
            release.id, 
            tx
          )
        }
        
        return release
      })
    },
    
    async deployRelease(releaseId: string, userId: string) {
      return await fastify.db.transaction(async (tx) => {
        // Get next deploy sequence
        const nextSeq = await this.getNextDeploySequence(tx)
        
        // Update release
        const [deployed] = await tx
          .update(releases)
          .set({
            status: 'DEPLOYED',
            deploySeq: nextSeq,
            deployedAt: new Date(),
            deployedBy: userId
          })
          .where(eq(releases.id, releaseId))
          .returning()
          
        return deployed
      })
    }
  }
}
```

### Release Context Middleware

```typescript
// apps/api/src/plugins/app/releases/release-context.ts
export default fp(async function (fastify: FastifyInstance) {
  // Decorate request with release context
  fastify.decorateRequest('releaseContext', null)
  
  // Add hook to set release context
  fastify.addHook('onRequest', async (request, reply) => {
    try {
      // Get release ID from header
      const headerRelease = request.headers['x-cms-release'] as string
      
      let releaseId: string | null = null
      
      if (headerRelease) {
        // Validate the release exists and user has access
        const release = await fastify.releases.getRelease(headerRelease)
        if (release) {
          releaseId = release.id
        }
      } else {
        // Use latest deployed release
        releaseId = await fastify.releases.getActiveRelease()
      }
      
      if (releaseId) {
        // Set PostgreSQL session variable
        await fastify.db.execute(
          sql`SELECT set_active_release(${releaseId})`
        )
        
        // Attach to request
        request.releaseContext = { 
          releaseId, 
          release: await fastify.releases.getRelease(releaseId) 
        }
      }
    } catch (error) {
      fastify.log.error({ error }, 'Error setting release context')
      // Continue without release context
    }
  })
  
  // Provide helper to get release context
  fastify.decorate('getReleaseContext', function (request: FastifyRequest) {
    return request.releaseContext || null
  })
})
```

## Database Queries with Release Context

### Using Canonical Views

```typescript
// Automatically filtered by release context
const translations = await db
  .select()
  .from(v_active_translations)
  .where(eq(v_active_translations.locale_id, localeId))
```

### Direct Entity Version Queries

```typescript
// Manual release filtering
const releaseId = await db.execute(sql`SELECT get_active_release()`)

const entities = await db
  .select()
  .from(entityVersions)
  .where(
    and(
      eq(entityVersions.releaseId, releaseId),
      eq(entityVersions.entityType, 'translation')
    )
  )
```

## Testing with Releases

### Unit Tests

```typescript
describe('Release Operations', () => {
  let testRelease: Release
  
  beforeEach(async () => {
    // Create test release
    testRelease = await app.releases.createRelease({
      name: 'Test Release',
      description: 'For testing'
    }, testUserId)
  })
  
  it('should create content in release', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/translations',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-CMS-Release': testRelease.id
      },
      payload: {
        key: 'test.key',
        value: 'Test Value'
      }
    })
    
    expect(response.statusCode).toBe(201)
  })
})
```

### Integration Tests

```typescript
it('should deploy release atomically', async () => {
  // Create release with changes
  const release = await createReleaseWithChanges()
  
  // Deploy
  await app.releases.deployRelease(release.id, adminId)
  
  // Verify all changes are visible
  const response = await app.inject({
    method: 'GET',
    url: '/api/translations',
    headers: { 'Authorization': `Bearer ${token}` }
    // No release header - should see deployed content
  })
  
  const translations = JSON.parse(response.body)
  expect(translations).toContainEqual(
    expect.objectContaining({ key: 'test.key' })
  )
})
```

## Performance Considerations

### Release Context Caching

```typescript
// Cache release context per request
fastify.decorateRequest('cachedReleaseContext', null)

fastify.addHook('onRequest', async (request) => {
  if (!request.cachedReleaseContext) {
    const releaseId = await determineReleaseId(request)
    request.cachedReleaseContext = { releaseId }
    
    // Set DB session only once per request
    await db.execute(sql`SELECT set_active_release(${releaseId})`)
  }
})
```

### Batch Operations

```typescript
// Efficient bulk inserts within a release
async function bulkCreateTranslations(
  translations: Translation[], 
  releaseId: string
) {
  const entities = translations.map(t => ({
    entityType: 'translation',
    entityKey: t.key,
    releaseId,
    payload: { value: t.value },
    changeType: 'CREATE',
    createdBy: userId
  }))
  
  return await db
    .insert(entityVersions)
    .values(entities)
    .returning()
}
```

## Security Considerations

### Release Access Control

```typescript
// Middleware to check release access
async function checkReleaseAccess(
  request: FastifyRequest, 
  reply: FastifyReply
) {
  const releaseId = request.headers['x-cms-release']
  if (!releaseId) return
  
  const release = await fastify.releases.getRelease(releaseId)
  
  // Check if user can access this release
  if (release.status === 'DEPLOYED') {
    // Anyone can read deployed releases
    return
  }
  
  // For non-deployed, check permissions
  const hasPermission = await checkUserPermission(
    request.user.id,
    'releases:read'
  )
  
  if (!hasPermission) {
    return reply.forbidden('Cannot access this release')
  }
}
```

### Audit Logging

```typescript
// Log all release operations
fastify.addHook('onResponse', async (request, reply) => {
  if (request.releaseContext && reply.statusCode < 400) {
    await fastify.audit.log({
      userId: request.user?.id,
      action: `${request.method} ${request.url}`,
      releaseId: request.releaseContext.releaseId,
      timestamp: new Date(),
      result: 'success'
    })
  }
})
```

## Common Patterns

### Feature Flag Integration

```typescript
// Check feature flags within release context
async function isFeatureEnabled(
  featureKey: string, 
  releaseId: string
): Promise<boolean> {
  const flag = await db
    .select()
    .from(v_entities)
    .where(
      and(
        eq(v_entities.entityType, 'feature_flag'),
        eq(v_entities.entityKey, featureKey)
      )
    )
    .limit(1)
  
  return flag[0]?.payload?.enabled ?? false
}
```

### Content Diffing

```typescript
// Compare content between releases
async function diffTranslations(
  fromReleaseId: string,
  toReleaseId: string
) {
  const changes = await db.execute(sql`
    SELECT * FROM calculate_release_diff(
      ${fromReleaseId}::bigint,
      ${toReleaseId}::bigint
    )
    WHERE entity_type = 'translation'
  `)
  
  return changes.map(change => ({
    key: change.entity_key,
    type: change.change_type,
    oldValue: change.from_payload?.value,
    newValue: change.to_payload?.value
  }))
}
```

## Troubleshooting Guide

### Debug Release Context

```typescript
// Add debug endpoint
fastify.get('/api/debug/release-context', {
  onRequest: [fastify.authenticate]
}, async (request, reply) => {
  const dbRelease = await db.execute(
    sql`SELECT get_active_release() as release_id`
  )
  
  return {
    headerRelease: request.headers['x-cms-release'],
    contextRelease: request.releaseContext?.releaseId,
    dbSessionRelease: dbRelease[0]?.release_id,
    latestDeployed: await releases.getLatestDeployedRelease()
  }
})
```

### Common Issues

**Changes Not Visible**
```bash
# Check active release
curl http://localhost:3000/api/releases/active \
  -H "Authorization: Bearer $TOKEN"

# Verify entity was created in correct release
curl http://localhost:3000/api/debug/entity-versions/ENTITY_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Deploy Fails**
```bash
# Check release status
curl http://localhost:3000/api/releases/$RELEASE_ID \
  -H "Authorization: Bearer $TOKEN"

# Ensure status is CLOSED before deploying
# Check for deploy permissions
```

**Rollback Issues**
```bash
# List deployed releases
curl http://localhost:3000/api/releases?status=DEPLOYED \
  -H "Authorization: Bearer $TOKEN"

# Verify target release was previously deployed
# Check deploy_seq is not null
```