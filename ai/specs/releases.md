# Edition-Based Release System Implementation Design

## Overview

This specification defines the implementation of an edition-based release and rollback system for the CMS platform, enabling Git-like branching, atomic deployments, and instant rollbacks. The system allows multiple parallel releases, preview functionality, and maintains a complete audit trail of all content changes.

## Architecture

### Core Concepts

- **Release**: A logical grouping of content changes with lifecycle states (`OPEN`, `CLOSED`, `DEPLOYED`, `ROLLED_BACK`)
- **Entity**: Universal content object (brands, translations, pages, etc.) with stable `entity_id`
- **Entity Version**: Immutable snapshot of an entity within a specific release
- **Deploy Sequence**: Monotonically increasing deployment order for rollback capabilities

### Integration with Existing CMS

The release system extends the current multi-tenant architecture:

- **Brands/Jurisdictions/Locales**: Existing hierarchy remains unchanged
- **RBAC**: Release operations respect existing role-based permissions
- **Audit Trail**: Leverages current audit logging patterns
- **Type Safety**: Full TypeScript integration via Drizzle ORM and shared contracts

---

## Database Schema Evolution

### New Core Tables

#### 1. Release Management

```typescript
// packages/db/schema/releases.ts
export const releases = pgTable("releases", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 })
    .notNull()
    .default("OPEN")
    .$type<"OPEN" | "CLOSED" | "DEPLOYED" | "ROLLED_BACK">(),
  deploySeq: bigint("deploy_seq", { mode: "bigint" }).unique(),
  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deployedAt: timestamp("deployed_at"),
  deployedBy: uuid("deployed_by").references(() => users.id),
});

export const deploySequence = pgSequence("deploy_seq");
```

#### 2. Universal Entity System

```typescript
// packages/db/schema/entities.ts
export const entities = pgTable("entities", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  // Optional: soft delete support
  deletedAt: timestamp("deleted_at"),
});

export const entityVersions = pgTable(
  "entity_versions",
  {
    entityId: bigint("entity_id", { mode: "bigint" })
      .references(() => entities.id)
      .notNull(),
    releaseId: bigint("release_id", { mode: "bigint" })
      .references(() => releases.id)
      .notNull(),

    // Universal content fields
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    brandId: integer("brand_id").references(() => brands.id),
    jurisdictionId: integer("jurisdiction_id").references(
      () => jurisdictions.id
    ),
    localeId: integer("locale_id").references(() => locales.id),

    // Core content fields
    title: text("title"),
    slug: varchar("slug", { length: 255 }),
    status: varchar("status", { length: 20 }).default("draft"),
    publishedAt: timestamp("published_at"),

    // Flexible payload for entity-specific data
    payload: jsonb("payload").$type<Record<string, any>>(),

    // Change tracking
    changeType: varchar("change_type", { length: 20 })
      .notNull()
      .default("UPDATE")
      .$type<"CREATE" | "UPDATE" | "DELETE">(),
    changeSetId: uuid("change_set_id"),
    changeReason: text("change_reason"),

    // Audit fields
    createdBy: uuid("created_by")
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.entityId, table.releaseId] }),
    entityTypeIdx: index("entity_versions_entity_type_idx").on(
      table.entityType
    ),
    brandIdx: index("entity_versions_brand_idx").on(table.brandId),
    releaseIdx: index("entity_versions_release_idx").on(table.releaseId),
  })
);
```

#### 3. Relationship Management

```typescript
// packages/db/schema/relations.ts
export const relationVersions = pgTable("relation_versions", {
  id: bigserial("id", { mode: "bigint" }).primaryKey(),
  releaseId: bigint("release_id", { mode: "bigint" })
    .references(() => releases.id)
    .notNull(),
  leftEntityId: bigint("left_entity_id", { mode: "bigint" })
    .references(() => entities.id)
    .notNull(),
  rightEntityId: bigint("right_entity_id", { mode: "bigint" })
    .references(() => entities.id)
    .notNull(),
  relationType: varchar("relation_type", { length: 50 }).notNull(),
  action: varchar("action", { length: 10 }).notNull().$type<"ADD" | "REMOVE">(),
  position: integer("position"), // For ordered relationships
  metadata: jsonb("metadata"),
  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### Session Context Management

```sql
-- PostgreSQL session variable for active release context
-- Set by application middleware per request
SET cms.active_release = :release_id;
```

### Canonical Views

```typescript
// Database views for release-aware queries
export const viewEntities = pgView("v_entities").as((qb) =>
  qb
    .selectDistinctOn([entityVersions.entityId], {
      ...entityVersions,
      isFromActiveRelease: sql<boolean>`${entityVersions.releaseId} = current_setting('cms.active_release')::bigint`,
    })
    .from(entityVersions)
    .innerJoin(releases, eq(releases.id, entityVersions.releaseId))
    .innerJoin(
      sql`release AS live ON live.id = current_setting('cms.active_release')::bigint`
    )
    .where(
      or(
        eq(
          entityVersions.releaseId,
          sql`current_setting('cms.active_release')::bigint`
        ),
        isNotNull(releases.deploySeq)
      )
    )
    .orderBy(
      entityVersions.entityId,
      desc(
        sql`(${entityVersions.releaseId} = current_setting('cms.active_release')::bigint)`
      ),
      desc(releases.deploySeq)
    )
);
```

---

## Shared Contracts

### TypeBox Schemas

```typescript
// packages/contracts/schemas/releases.ts
import { Type, Static } from "@sinclair/typebox";

export const ReleaseStatus = Type.Union([
  Type.Literal("OPEN"),
  Type.Literal("CLOSED"),
  Type.Literal("DEPLOYED"),
  Type.Literal("ROLLED_BACK"),
]);

export const CreateReleaseSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 255 }),
  description: Type.Optional(Type.String()),
  basedOnReleaseId: Type.Optional(Type.Integer()),
});

export const ReleaseSchema = Type.Object({
  id: Type.Integer(),
  name: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  status: ReleaseStatus,
  deploySeq: Type.Union([Type.Integer(), Type.Null()]),
  createdBy: Type.String({ format: "uuid" }),
  createdAt: Type.String({ format: "date-time" }),
  deployedAt: Type.Union([Type.String({ format: "date-time" }), Type.Null()]),
  deployedBy: Type.Union([Type.String({ format: "uuid" }), Type.Null()]),
});

export const EntityVersionSchema = Type.Object({
  entityId: Type.Integer(),
  releaseId: Type.Integer(),
  entityType: Type.String(),
  brandId: Type.Union([Type.Integer(), Type.Null()]),
  jurisdictionId: Type.Union([Type.Integer(), Type.Null()]),
  localeId: Type.Union([Type.Integer(), Type.Null()]),
  title: Type.Union([Type.String(), Type.Null()]),
  slug: Type.Union([Type.String(), Type.Null()]),
  status: Type.String(),
  payload: Type.Record(Type.String(), Type.Any()),
  changeType: Type.Union([
    Type.Literal("CREATE"),
    Type.Literal("UPDATE"),
    Type.Literal("DELETE"),
  ]),
  createdBy: Type.String({ format: "uuid" }),
  createdAt: Type.String({ format: "date-time" }),
});

export const DeployReleaseSchema = Type.Object({
  releaseId: Type.Integer(),
  confirmationToken: Type.String(),
});

export const PreviewDiffSchema = Type.Object({
  fromReleaseId: Type.Integer(),
  toReleaseId: Type.Integer(),
  entityTypes: Type.Optional(Type.Array(Type.String())),
});
```

---

## API Layer Implementation

### Release Management Plugin

```typescript
// apps/api/src/plugins/app/releases/releases-repository.ts
import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { eq, sql, desc, and, isNull, or } from "drizzle-orm";

export interface ReleasesRepository {
  createRelease(data: CreateReleaseRequest): Promise<Release>;
  getReleases(filters?: ReleaseFilters): Promise<Release[]>;
  getRelease(id: number): Promise<Release | null>;
  updateReleaseStatus(id: number, status: ReleaseStatus): Promise<void>;
  deployRelease(id: number, userId: string): Promise<void>;
  rollbackToRelease(id: number, userId: string): Promise<void>;
  setActiveRelease(releaseId: number): Promise<void>;
}

async function releasesRepository(fastify: FastifyInstance) {
  const repository: ReleasesRepository = {
    async createRelease(data) {
      const [release] = await fastify.db
        .insert(releases)
        .values({
          name: data.name,
          description: data.description,
          createdBy: fastify.user.id,
        })
        .returning();

      return release;
    },

    async deployRelease(id, userId) {
      return await fastify.db.transaction(async (tx) => {
        // Get next sequence number
        const nextSeq = await tx.execute(sql`SELECT nextval('deploy_seq')`);
        const deploySeq = nextSeq.rows[0].nextval as number;

        // Update release status
        await tx
          .update(releases)
          .set({
            status: "DEPLOYED",
            deploySeq: deploySeq,
            deployedAt: new Date(),
            deployedBy: userId,
          })
          .where(eq(releases.id, id));

        // Set as active release globally
        await tx.execute(
          sql`SELECT set_config('cms.active_release', ${id}::text, false)`
        );
      });
    },

    async setActiveRelease(releaseId) {
      await fastify.db.execute(
        sql`SELECT set_config('cms.active_release', ${releaseId}::text, false)`
      );
    },
  };

  fastify.decorate("releases", repository);
}

export default fp(releasesRepository);
```

### Release-Aware Middleware

```typescript
// apps/api/src/plugins/app/releases/release-context.ts
import { FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";

async function releaseContext(fastify: FastifyInstance) {
  fastify.addHook(
    "preHandler",
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Extract release context from header or query param
      const releaseId =
        request.headers["x-cms-release"] ||
        request.query?.release ||
        (await getCurrentActiveRelease());

      if (releaseId) {
        await fastify.releases.setActiveRelease(Number(releaseId));
        request.releaseContext = { releaseId: Number(releaseId) };
      }
    }
  );
}

export default fp(releaseContext);
```

### API Routes

```typescript
// apps/api/src/routes/api/releases/index.ts
import { FastifyInstance } from "fastify";
import {
  CreateReleaseSchema,
  ReleaseSchema,
  DeployReleaseSchema,
} from "@cms/contracts/schemas/releases";

export default async function (fastify: FastifyInstance) {
  // List releases
  fastify.get(
    "/",
    {
      schema: {
        tags: ["releases"],
        response: {
          200: Type.Array(ReleaseSchema),
        },
      },
    },
    async (request, reply) => {
      const releases = await fastify.releases.getReleases();
      return releases;
    }
  );

  // Create release
  fastify.post(
    "/",
    {
      schema: {
        tags: ["releases"],
        body: CreateReleaseSchema,
        response: {
          201: ReleaseSchema,
        },
      },
      preHandler: [fastify.requireRole("editor")],
    },
    async (request, reply) => {
      const release = await fastify.releases.createRelease(request.body);
      reply.code(201);
      return release;
    }
  );

  // Deploy release
  fastify.post(
    "/:id/deploy",
    {
      schema: {
        tags: ["releases"],
        params: Type.Object({ id: Type.Integer() }),
        body: DeployReleaseSchema,
        response: {
          200: Type.Object({ success: Type.Boolean() }),
        },
      },
      preHandler: [fastify.requireRole("admin")],
    },
    async (request, reply) => {
      const { id } = request.params;
      await fastify.releases.deployRelease(id, request.user.id);
      return { success: true };
    }
  );

  // Preview diff between releases
  fastify.post(
    "/preview-diff",
    {
      schema: {
        tags: ["releases"],
        body: PreviewDiffSchema,
        response: {
          200: Type.Object({
            changes: Type.Array(
              Type.Object({
                entityId: Type.Integer(),
                entityType: Type.String(),
                changeType: Type.String(),
                fromVersion: Type.Optional(EntityVersionSchema),
                toVersion: Type.Optional(EntityVersionSchema),
              })
            ),
          }),
        },
      },
    },
    async (request, reply) => {
      const diff = await fastify.releases.previewDiff(
        request.body.fromReleaseId,
        request.body.toReleaseId,
        request.body.entityTypes
      );
      return { changes: diff };
    }
  );
}
```

---

## Frontend Integration

### Release Context Provider

```typescript
// apps/admin/src/app/providers/release-provider.tsx
import React, { createContext, useContext, useState, useEffect } from 'react'
import { Release } from '@cms/contracts/types/releases'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

interface ReleaseContextType {
  activeRelease: Release | null
  setActiveRelease: (release: Release) => void
  releases: Release[]
  isLoading: boolean
  deployRelease: (releaseId: number) => Promise<void>
  createRelease: (data: CreateReleaseRequest) => Promise<Release>
}

const ReleaseContext = createContext<ReleaseContextType | null>(null)

export function ReleaseProvider({ children }: { children: React.ReactNode }) {
  const [activeRelease, setActiveReleaseState] = useState<Release | null>(null)
  const queryClient = useQueryClient()

  const { data: releases = [], isLoading } = useQuery({
    queryKey: ['releases'],
    queryFn: () => apiClient.get<Release[]>('/releases').then(r => r.data),
  })

  const deployMutation = useMutation({
    mutationFn: async (releaseId: number) => {
      const response = await apiClient.post(`/releases/${releaseId}/deploy`, {
        confirmationToken: 'confirmed' // In real app, require user confirmation
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['releases'] })
    }
  })

  const createMutation = useMutation({
    mutationFn: async (data: CreateReleaseRequest) => {
      const response = await apiClient.post<Release>('/api/releases', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['releases'] })
    }
  })

  const setActiveRelease = (release: Release) => {
    setActiveReleaseState(release)
    // Set header for subsequent API calls
    apiClient.defaults.headers['X-CMS-Release'] = release.id.toString()
  }

  useEffect(() => {
    // Set default active release to most recent deployed
    if (releases.length > 0 && !activeRelease) {
      const deployed = releases
        .filter(r => r.status === 'DEPLOYED')
        .sort((a, b) => (b.deploySeq || 0) - (a.deploySeq || 0))[0]
      if (deployed) {
        setActiveRelease(deployed)
      }
    }
  }, [releases, activeRelease])

  return (
    <ReleaseContext.Provider value={{
      activeRelease,
      setActiveRelease,
      releases,
      isLoading,
      deployRelease: deployMutation.mutateAsync,
      createRelease: createMutation.mutateAsync,
    }}>
      {children}
    </ReleaseContext.Provider>
  )
}

export const useRelease = () => {
  const context = useContext(ReleaseContext)
  if (!context) {
    throw new Error('useRelease must be used within ReleaseProvider')
  }
  return context
}
```

### Release Management UI

```typescript
// apps/admin/src/features/releases/components/release-switcher.tsx
import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Plus, Deploy, Eye } from 'lucide-react'
import { useRelease } from '@/app/providers/release-provider'
import { Release } from '@cms/contracts/types/releases'

export function ReleaseSwitcher() {
  const { activeRelease, releases, setActiveRelease } = useRelease()

  const getStatusBadgeVariant = (status: Release['status']) => {
    switch (status) {
      case 'DEPLOYED': return 'default'
      case 'CLOSED': return 'secondary'
      case 'OPEN': return 'outline'
      case 'ROLLED_BACK': return 'destructive'
      default: return 'outline'
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-[300px] justify-between">
          <div className="flex items-center gap-2">
            <span className="truncate">
              {activeRelease?.name || 'Select Release'}
            </span>
            {activeRelease && (
              <Badge variant={getStatusBadgeVariant(activeRelease.status)}>
                {activeRelease.status}
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[300px]">
        <DropdownMenuLabel>Switch Release</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {releases.map((release) => (
          <DropdownMenuItem
            key={release.id}
            onClick={() => setActiveRelease(release)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="truncate">{release.name}</span>
              <Badge variant={getStatusBadgeVariant(release.status)} size="sm">
                {release.status}
              </Badge>
            </div>
            {release.id === activeRelease?.id && (
              <Badge variant="outline" size="sm">Active</Badge>
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Plus className="h-4 w-4 mr-2" />
          Create New Release
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Release Management Page

```typescript
// apps/admin/src/features/releases/pages/releases-page.tsx
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Deploy, Eye, Trash2, GitBranch } from 'lucide-react'
import { useRelease } from '@/app/providers/release-provider'
import { formatDistanceToNow } from 'date-fns'

export function ReleasesPage() {
  const { releases, deployRelease, activeRelease } = useRelease()
  const [deployingId, setDeployingId] = useState<number | null>(null)

  const handleDeploy = async (releaseId: number) => {
    if (confirm('Are you sure you want to deploy this release? This will make it live.')) {
      setDeployingId(releaseId)
      try {
        await deployRelease(releaseId)
      } finally {
        setDeployingId(null)
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Releases</h1>
        <Button>
          <GitBranch className="h-4 w-4 mr-2" />
          Create Release
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Releases</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Deployed</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {releases.map((release) => (
                <TableRow key={release.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {release.name}
                      {release.id === activeRelease?.id && (
                        <Badge variant="outline" size="sm">Active</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      release.status === 'DEPLOYED' ? 'default' :
                      release.status === 'CLOSED' ? 'secondary' :
                      release.status === 'OPEN' ? 'outline' : 'destructive'
                    }>
                      {release.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(release.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    {release.deployedAt
                      ? formatDistanceToNow(new Date(release.deployedAt), { addSuffix: true })
                      : '-'
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {release.status === 'CLOSED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeploy(release.id)}
                          disabled={deployingId === release.id}
                        >
                          <Deploy className="h-4 w-4" />
                        </Button>
                      )}
                      {release.status === 'OPEN' && (
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## Migration Strategy

### Data Migration Approach

1. **Phase 1: Schema Setup**
   - Add new tables (releases, entities, entity_versions, relation_versions)
   - Create deploy sequence
   - Set up canonical views

2. **Phase 2: Existing Data Migration**

   ```sql
   -- Create initial "baseline" release for existing data
   INSERT INTO releases (name, status, deploy_seq, created_by, created_at, deployed_at)
   VALUES ('Baseline', 'DEPLOYED', 1, (SELECT id FROM users LIMIT 1), NOW(), NOW());

   -- Migrate existing brands to entity system
   INSERT INTO entities (id, entity_type)
   SELECT id, 'BRAND' FROM brands;

   INSERT INTO entity_versions (entity_id, release_id, entity_type, title, payload, created_by, created_at)
   SELECT
     b.id,
     (SELECT id FROM releases WHERE name = 'Baseline'),
     'BRAND',
     b.name,
     jsonb_build_object('description', b.description),
     (SELECT id FROM users LIMIT 1),
     NOW()
   FROM brands b;
   ```

3. **Phase 3: Gradual Cutover**
   - Update application to read from views
   - Test extensively with baseline data
   - Begin using release system for new changes

### Backward Compatibility

- Maintain existing table structures during transition
- Use database views to provide old API compatibility
- Gradual migration of routes to release-aware versions

---

## Testing Strategy

### Database Testing

```typescript
// packages/db/test/releases.test.ts
import { describe, test, expect, beforeEach } from "bun:test";
import { setupTestDb, cleanupTestDb } from "./helpers/db";
import { releases, entities, entityVersions } from "../schema";

describe("Release System", () => {
  beforeEach(async () => {
    await setupTestDb();
  });

  test("should create release and deploy atomically", async () => {
    const db = await getTestDb();

    // Create release
    const [release] = await db
      .insert(releases)
      .values({ name: "Test Release", createdBy: "test-user" })
      .returning();

    // Add content to release
    await db.insert(entityVersions).values({
      entityId: 1,
      releaseId: release.id,
      entityType: "BRAND",
      title: "Test Brand",
      createdBy: "test-user",
    });

    // Deploy release
    await deployRelease(db, release.id, "test-user");

    // Verify deployment
    const deployed = await db
      .select()
      .from(releases)
      .where(eq(releases.id, release.id));

    expect(deployed[0].status).toBe("DEPLOYED");
    expect(deployed[0].deploySeq).toBeDefined();
  });

  test("should provide correct canonical view results", async () => {
    // Test canonical view behavior with multiple releases
  });
});
```

### API Integration Testing

```typescript
// apps/api/test/routes/releases.test.ts
import { describe, test, expect } from "bun:test";
import { buildApp } from "../helpers/build-app";

describe("Release API", () => {
  test("POST /api/releases should create new release", async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/releases",
      headers: { authorization: "Bearer test-token" },
      payload: {
        name: "Summer Campaign",
        description: "Q3 content updates",
      },
    });

    expect(response.statusCode).toBe(201);
    const release = JSON.parse(response.payload);
    expect(release.name).toBe("Summer Campaign");
    expect(release.status).toBe("OPEN");
  });

  test("should require admin role for deployment", async () => {
    // Test RBAC enforcement
  });
});
```

### Frontend Component Testing

```typescript
// apps/admin/src/features/releases/components/release-switcher.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { ReleaseSwitcher } from './release-switcher'
import { ReleaseProvider } from '@/app/providers/release-provider'

test('should display active release and allow switching', async () => {
  render(
    <ReleaseProvider>
      <ReleaseSwitcher />
    </ReleaseProvider>
  )

  // Test component behavior
  expect(screen.getByText('Select Release')).toBeInTheDocument()
})
```

---

## Performance Considerations

### Database Optimization

1. **Indexing Strategy**

   ```sql
   -- Critical indexes for performance
   CREATE INDEX CONCURRENTLY entity_versions_lookup
   ON entity_versions (entity_id, release_id);

   CREATE INDEX CONCURRENTLY entity_versions_release_type
   ON entity_versions (release_id, entity_type)
   WHERE entity_type IN ('BRAND', 'TRANSLATION', 'PAGE');

   CREATE INDEX CONCURRENTLY releases_deploy_seq
   ON releases (deploy_seq DESC NULLS LAST);
   ```

2. **Canonical View Optimization**
   - Use DISTINCT ON for efficient latest-version queries
   - Leverage deploy_seq ordering for rollback performance
   - Consider materialized views for read-heavy workloads

3. **Partitioning Strategy**
   ```sql
   -- Partition entity_versions by release_id for large datasets
   CREATE TABLE entity_versions_partitioned (LIKE entity_versions)
   PARTITION BY HASH (release_id);
   ```

### Application-Level Caching

```typescript
// Cache active release context to avoid repeated session variable sets
const releaseCache = new Map<string, number>();

async function setReleaseContext(fastify: FastifyInstance, releaseId: number) {
  const cacheKey = `release:${fastify.requestContext.requestId}`;

  if (releaseCache.get(cacheKey) !== releaseId) {
    await fastify.db.execute(
      sql`SELECT set_config('cms.active_release', ${releaseId}::text, false)`
    );
    releaseCache.set(cacheKey, releaseId);
  }
}
```

### Monitoring and Metrics

```typescript
// Add performance monitoring for release operations
fastify.addHook("onResponse", async (request, reply) => {
  if (request.url.includes("/api/releases")) {
    fastify.metrics.timing("release_operation_duration", reply.elapsedTime);
    fastify.metrics.increment(
      `release_operation.${request.method.toLowerCase()}`
    );
  }
});
```

---

## Security & RBAC Integration

### Release-Specific Permissions

```typescript
// Extend existing permission system
export const RELEASE_PERMISSIONS = {
  "releases:create": "Create new releases",
  "releases:edit": "Edit open releases",
  "releases:close": "Close releases for deployment",
  "releases:deploy": "Deploy releases to production",
  "releases:rollback": "Rollback deployed releases",
  "releases:delete": "Delete unused releases",
} as const;

// Role assignments
export const RELEASE_ROLE_PERMISSIONS = {
  editor: ["releases:create", "releases:edit"],
  admin: [
    "releases:create",
    "releases:edit",
    "releases:close",
    "releases:deploy",
  ],
  super_admin: ["releases:*"],
} as const;
```

### Audit Trail Enhancement

```typescript
// Enhanced audit logging for release operations
export const releaseAuditEvents = pgTable("release_audit_events", {
  id: serial("id").primaryKey(),
  releaseId: bigint("release_id", { mode: "bigint" }).references(
    () => releases.id
  ),
  action: varchar("action", { length: 50 }).notNull(),
  performedBy: uuid("performed_by")
    .references(() => users.id)
    .notNull(),
  metadata: jsonb("metadata"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### Branch-Level Access Control

```typescript
// Restrict access to specific releases based on user roles/brands
async function checkReleaseAccess(
  fastify: FastifyInstance,
  userId: string,
  releaseId: number
): Promise<boolean> {
  const userRoles = await fastify.users.getUserRoles(userId);
  const release = await fastify.releases.getRelease(releaseId);

  // Super admins can access all releases
  if (userRoles.includes("super_admin")) return true;

  // Check brand-specific access if release contains brand-specific content
  const releaseEntities = await fastify.db
    .select({ brandId: entityVersions.brandId })
    .from(entityVersions)
    .where(eq(entityVersions.releaseId, releaseId));

  const userBrands = await fastify.users.getUserBrands(userId);
  const releaseBrands = [
    ...new Set(releaseEntities.map((e) => e.brandId).filter(Boolean)),
  ];

  return releaseBrands.every((brandId) => userBrands.includes(brandId));
}
```

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)

- ✅ Database schema design and migration
- ✅ Core Drizzle ORM models and relationships
- ✅ Basic release repository with CRUD operations
- ✅ Session context management
- ✅ Canonical views implementation

### Phase 2: API Layer (Weeks 3-4)

- ✅ Release management API endpoints
- ✅ Release-aware middleware
- ✅ Deploy/rollback operations
- ✅ Preview and diff functionality
- ✅ RBAC integration for release operations

### Phase 3: Frontend Integration (Weeks 5-6)

- ✅ Release context provider
- ✅ Release switcher component
- ✅ Release management pages
- ✅ Preview and diff UI
- ✅ Integration with existing content management

### Phase 4: Content Migration (Weeks 7-8)

- ✅ Existing data migration scripts
- ✅ Backward compatibility layers
- ✅ Testing and validation
- ✅ Gradual rollout strategy

### Phase 5: Advanced Features (Weeks 9-10)

- ✅ Conflict detection and resolution
- ✅ Automated testing and CI integration
- ✅ Performance optimization
- ✅ Monitoring and alerting
- ✅ Documentation and training

---

## Success Metrics

### Performance Targets

- **Deploy time**: < 500ms for releases with up to 10,000 entities
- **Rollback time**: < 200ms regardless of release size
- **Read performance**: < 50ms P95 for canonical view queries
- **UI responsiveness**: < 100ms for release switching

### Functional Requirements

- ✅ Support for 50+ concurrent releases
- ✅ Complete audit trail for all changes
- ✅ Zero-downtime deployments and rollbacks
- ✅ Conflict detection with 99.9% accuracy
- ✅ Role-based access control integration

### Operational Excellence

- ✅ Automated testing coverage > 90%
- ✅ Comprehensive monitoring and alerting
- ✅ Documentation and training materials
- ✅ Disaster recovery procedures
- ✅ Performance benchmarking and optimization

---

This comprehensive design provides a robust foundation for implementing the edition-based release system while maintaining compatibility with the existing CMS platform architecture. The phased approach ensures minimal disruption during implementation while delivering immediate value through improved content management workflows.

Original requirements:

# Edition‑Based CMS – Release & Rollback Design Document

_Last updated: 29 Jul 2025_

---

## 1. Purpose

Design a relational data model and runtime pattern that lets a custom CMS:

- Group arbitrary edits into **releases** (a.k.a. “editions”).
- Preview, deploy, and roll back any release instantly.
- Work on **multiple releases in parallel** without clashes.
- Keep a full **audit trail** of every change.

## 2. High‑Level Requirements

| ID   | Requirement                                                               |
| ---- | ------------------------------------------------------------------------- |
| R‑01 | Reads must be _fast_—ideally a single indexed query.                      |
| R‑02 | Deploy/Rollback must be atomic and sub‑second.                            |
| R‑03 | Editors can branch off an existing production state and iterate safely.   |
| R‑04 | Must record _who/what/when/why_ for each change.                          |
| R‑05 | Model must tolerate sparse edits (only touched rows appear in a release). |

## 3. Core Concepts

| Concept         | Description                                                                                                                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Entity**      | Logical business object (Brand, Post, Translation…). Stable `entity_id`. _All object types reside in the same **`** and **`** tables, distinguished only by **\`\`**—there are no per‑type tables._ |
| **Release**     | Metadata bucket that tags a set of edits. _Statuses_: `OPEN`, `CLOSED`, `DEPLOYED`, `ROLLED_BACK`.                                                                                                  |
| **Version Row** | Immutable snapshot of an entity _within_ a release. Always an **INSERT**, never an UPDATE.                                                                                                          |
| **deploy_seq**  | Monotonically increasing integer set when a release is deployed—gives a total order of production releases.                                                                                         |

## 4. Database Schema (PostgreSQL 16 syntax)

```sql
CREATE TABLE release (
  release_id   bigint  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name         text    NOT NULL,
  status       text    CHECK (status IN ('OPEN','CLOSED','DEPLOYED','ROLLED_BACK')),
  deploy_seq   bigint  UNIQUE,  -- NULL until deployed
  created_by   bigint,
  created_at   timestamptz DEFAULT now(),
  deployed_at  timestamptz
);

CREATE TABLE entity (
  entity_id   bigint PRIMARY KEY,
  entity_type text NOT NULL  -- e.g. 'BRAND','TRANSLATION',…
);

CREATE TABLE entity_version (
  entity_id     bigint NOT NULL REFERENCES entity,
  release_id    bigint NOT NULL REFERENCES release,
  /* business columns */
  title         text,
  body          text,
  locale        text,
  /* audit */
  created_by    bigint,
  created_at    timestamptz DEFAULT now(),
  PRIMARY KEY (entity_id, release_id)
);

-- Many‑to‑many example (Brand ↔ Jurisdiction)
CREATE TABLE relation_version (
  relation_id   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  release_id    bigint NOT NULL REFERENCES release,
  left_entity   bigint NOT NULL,
  right_entity  bigint NOT NULL,
  action        text   CHECK (action IN ('ADD','REMOVE')),
  created_by    bigint,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX ON entity_version (entity_id, release_id);
```

_Optional_: `change_set`, `audit_event` tables for finer‑grained grouping and diffing.

### 4.1 Attribute storage patterns

If you need attributes that differ wildly across types, choose one of:

1. **Wide table** (shown above): add superset columns to `entity_version`; nullable when not used.
2. **JSONB payload**: replace typed columns with `payload JSONB`, letting the application enforce schema per `entity_type`.
3. **Table inheritance / adjunct tables**: keep a small core in `entity_version` and store rare or large blobs in per‑type extension tables keyed by `(entity_id, release_id)`.

The runtime view logic is identical whichever storage form you choose.

### 4.2 "Wide" Table Viability

Even if you adopt a **single shared `entity_version` table** with many core columns, Postgres handles it well:

| Myth                                                   | Reality                                                                                                                   |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| _“Hundreds of nullable columns will bloat every row.”_ | NULLs cost one bit in the row’s **null‑bitmap**; variable‑width columns (`text`, `jsonb`) occupy no heap space when NULL. |
| _“Postgres will choke on a large schema.”_             | Hard limit is **≈ 1 600 columns**. Most CMS core schemas need < 50.                                                       |
| _“Queries will pull 200 columns I don’t need.”_        | Use narrow _covering indexes_ or `SELECT column_list …`—only referenced columns are fetched.                              |

#### Recommended approach

1. **Keep the truly universal set small** (≤ 15 fields): `entity_id`, `release_id`, `entity_type`, `brand_id`, `jurisdiction_id`, `locale`, `title`, `slug`, `status`, `published_at`, audit columns.
2. **Everything else** → `payload JSONB` or an adjunct table. Promote a field to a typed column **only when** it becomes hot for filtering/ordering.
3. **Index surgically**: B‑tree on dimension columns; GIN/expression indexes on JSONB paths you filter; never index the entire payload.
4. **Row size check**: aim for average < 8 kB so many rows fit in shared buffers.

#### Rules of thumb

- Wide table simpler than n adjunct joins _until_ you hit dozens of hot optional fields.
- Monitor query plans; if you see repeated `->> 'foo'` JSON extraction in filters, consider promoting `foo`.
- Column additions in Postgres are metadata‑only and near‑instant if placed at the end of the table.

> In short, a moderately wide table is usually **the sweet spot**: fast predicates & joins on stable dimensions, full flexibility via JSONB for everything else.

## 5. Read Path

### 5.1 Session variable

```sql
SET cms.active_release = :release_id;  -- set by UI or request middleware
```

### 5.2 Canonical view (example for brands)

```sql
CREATE OR REPLACE VIEW v_brand AS
SELECT DISTINCT ON (ev.entity_id)
       ev.*
FROM   entity_version ev
JOIN   release        r    ON r.release_id = ev.release_id
JOIN   release        live ON live.release_id = current_setting('cms.active_release')::bigint
WHERE  -- (a) row belongs to the active release
       ev.release_id = live.release_id
   OR  -- (b) row’s release is already deployed
       r.deploy_seq IS NOT NULL
ORDER BY ev.entity_id,
         (ev.release_id = live.release_id) DESC,  -- live rows win
         r.deploy_seq DESC;                       -- else newest deployed
```

_Guarantees_: ignores edits in releases that are still `OPEN`/`CLOSED`, picks newest deployed version when entity untouched in the active release. Query cost ≈ one index seek + sort in memory.

## 6. Write Workflow

1. **Create release** `INSERT INTO release (name, status) VALUES ('Summer Sale', 'OPEN') RETURNING release_id;`
2. **Editor session**: `SET cms.active_release = <new id>`.
3. **Edits**: every save inserts rows into `entity_version` or `relation_version`, tagged with the release id.
4. **Close for QA**: `UPDATE release SET status='CLOSED' WHERE release_id=?;`

## 7. Deploy & Rollback

```sql
CREATE SEQUENCE deploy_seq;

CREATE FUNCTION cms.deploy(_release bigint) RETURNS void LANGUAGE plpgsql AS $$
DECLARE new_seq bigint;
BEGIN
  SELECT nextval('deploy_seq') INTO new_seq;
  UPDATE release
     SET status      = 'DEPLOYED',
         deploy_seq  = new_seq,
         deployed_at = now()
   WHERE release_id  = _release;
  -- Point site to new release
  PERFORM set_config('cms.active_release', _release::text, false);
END;$$;
```

_Rollback_: call the same function with the previous good release id. _Latency_: < 50 ms, independent of data volume.

## 8. Parallel Releases & Conflict Detection

- Editors set their own `cms.active_release` (e.g., 43, 44…).
- When QA attempts to deploy 43 the system checks for each edited entity whether a newer `deploy_seq` already exists (i.e., someone else shipped a change). If yes → ask for re‑base.
- Merge is row‑level: copy latest row into 43, redo change, or abandon.

## 9. Auditing & Diff

- `audit_event` trigger logs `INSERT` into all `*_version` tables.
- Diff two releases:

  ```sql
  SELECT e.entity_id
  FROM   entity_version e FULL JOIN entity_version p USING (entity_id)
  WHERE  e.release_id = :left AND p.release_id = :right
    AND  e IS DISTINCT FROM p;
  ```

- UI can group by `change_set` and display who/when/why.

## 10. Optional Enhancement – Materialised Live Tables

If absolute minimal read complexity is required, deploy script can COPY winning rows into `entity_live`, replacing in‑place via `ON CONFLICT`. Reads touch only `entity_live`, at the cost of a bulk write during deploy.

## 11. Scalability & Maintenance

| Concern             | Mitigation                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| History bloat       | Partition `*_version` by `release_id`; drop partitions for `ROLLED_BACK` releases after N days. |
| FTS performance     | Store concatenated docs in `fts_document_version`, same pattern.                                |
| Very large releases | Batched deploy (`LIMIT …`) wrapped in transaction – still atomic thanks to pointer flip.        |

## 12. Trade‑Offs & Alternatives

| Approach                                    | Pros                                                          | Cons                                                   |
| ------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------ |
| **Append‑only per release** _(this design)_ | No overwrite; instant deploy; Git‑like branching; cheap reads | Slightly smarter view; more rows overall               |
| Clone whole DB per release                  | Isolation is trivial                                          | Heavy storage; cross‑release diff painful; deploy slow |
| Temporal tables (system‑versioned) only     | Built‑in history                                              | Needs extra filter logic for _non‑deployed_ releases   |

## 13. Appendix – Example Timeline

| Time | Action                                 | Live release | deploy_seq |
| ---- | -------------------------------------- | ------------ | ---------- |
| T₀   | Deploy 42 (`translate 123`)            | 42           | 141        |
| T₁   | Edits in 43 (`post 311`) – still OPEN  | 42           | 141        |
| T₂   | Edits in 44 (`translate 124`) – CLOSED | 42           | 141        |
| T₃   | Deploy 44 → pointer flips              | **44**       | 142        |
| T₄   | 43 still ignored until deployed        | 44           | 142        |

---

## 14. Extending to Rich Content (Posts, Pages, Components)

The same **Entity + Entity_version + Relation_version** backbone scales to an entire headless CMS. You simply register new `entity_type` values and, if needed, adjunct tables or JSONB payloads for their bespoke fields.

| Content type | `entity_type` | Core columns in `entity_version`                                   | Typical adjunct / JSONB fields             |
| ------------ | ------------- | ------------------------------------------------------------------ | ------------------------------------------ |
| Blog post    | `POST`        | `title`, `slug`, `author_id`, `published_at`, `locale`, `brand_id` | body (markdown/HTML), hero_image, SEO JSON |
| Web page     | `PAGE`        | `title`, `path`, `locale`, `brand_id`, `status` (draft/published)  | layout options JSON, meta_tags JSON        |
| Component    | `COMPONENT`   | `component_type`, `locale`, `brand_id`                             | props JSON (flexible per component)        |
| Media asset  | `ASSET`       | `file_id`, `mime_type`, `original_name`, `size`                    | focal_point, alt_text (JSON)               |

### 14.1 Nested & repeatable regions

Pages are usually built from **component instances**:

```
PAGE (entity_id = 5001)
 ├── COMPONENT (5010 ‑ hero)
 ├── COMPONENT (5011 ‑ product‑grid)
 └── COMPONENT (5012 ‑ footer‑cta)
```

Store each component as an entity row and link it via `relation_version` rows:

```sql
-- add component 5010 into page 5001 in release 42
INSERT INTO relation_version (
  release_id, left_entity, right_entity, action, created_by
) VALUES (
  42,           5001,        5010,        'ADD',  :user_id
);
```

_Ordering_ can be kept in a `position` numeric column on `relation_version`, or in a JSONB `children` array inside the parent component/page payload.

### 14.2 Tags, categories, menus

All many‑to‑many metadata (post ↔ tag, page ↔ menu‑item) fits the same pattern—just different `entity_type`s and `relation_version` rows.

### 14.3 Search and listings

Materialise search docs into `fts_document_version` (one row per `(entity_id, release_id)`) so every release can be full‑text‑searched in isolation. A nightly job (or trigger) updates this table whenever a post/page/component row changes in that release.

### 14.4 Rendering & API delivery

GraphQL/REST resolvers read via the canonical views (`v_entity`, `v_relation`) scoped to `cms.active_release`. Your front‑end framework (Next.js, Nuxt, etc.) can therefore preview or publish simply by toggling the release id in the header.

### 14.5 Storage cost estimate

| Volume                                     | Approx rows                      |
| ------------------------------------------ | -------------------------------- |
| 10 k pages × 20 releases                   | 200 k `PAGE` rows                |
| 50 k components × 20 releases              | 1 M `COMPONENT` rows             |
| 100 k blog posts (5 locales) × 30 releases | 15 M `POST` rows                 |
| Relations (avg 5 per parent)               | \~5–10 M `relation_version` rows |

PostgreSQL with partitioning and zstd TOAST comfortably handles this on a single medium instance (\~8‑16 vCPU, 64 GB RAM) with sub‑50 ms P95 read latency.

---

_End of document_
