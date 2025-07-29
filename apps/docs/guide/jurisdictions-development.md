# Jurisdictions Development Guide

This guide provides developers with comprehensive information on how to work with, extend, and integrate the jurisdictions feature in the CMS platform.

## Architecture Overview

The jurisdictions feature follows the platform's architectural patterns with clear separation between API, UI, and data layers.

### Technology Stack

- **Backend**: Fastify with TypeBox validation
- **Frontend**: React with TanStack Router
- **Database**: PostgreSQL with Drizzle ORM
- **Contracts**: Shared TypeBox schemas for type safety
- **Testing**: Bun test runner with comprehensive test coverage

### Directory Structure

```
cms-platform/
├── packages/contracts/
│   ├── schemas/jurisdictions.ts      # TypeBox validation schemas
│   └── types/jurisdictions.ts        # TypeScript type definitions
├── packages/db/
│   └── schema/index.ts               # Database schema (jurisdictions table)
├── apps/api/
│   ├── src/routes/api/jurisdictions/ # API endpoint implementation
│   └── test/routes/api/jurisdictions/ # API tests
└── apps/admin/
    └── src/features/jurisdictions/   # React UI implementation
        ├── components/               # UI components
        ├── hooks/                   # React hooks
        ├── pages/                   # Page components
        └── types.ts                 # UI-specific types
```

## Data Model and Schema

### Database Schema

The jurisdictions table is defined in `/packages/db/schema/index.ts`:

```typescript
export const jurisdictions = pgTable('jurisdictions', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 20 }).unique().notNull(),
  name: text('name').notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  region: varchar('region', { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### Relationships

**Brand Jurisdictions (Many-to-Many)**
```typescript
export const brandJurisdictions = pgTable('brand_jurisdictions', {
  brandId: integer('brand_id').references(() => brands.id).notNull(),
  jurisdictionId: integer('jurisdiction_id').references(() => jurisdictions.id).notNull(),
}, (table) => [
  primaryKey({ columns: [table.brandId, table.jurisdictionId] }),
]);
```

**Translation Context**
```typescript
export const translations = pgTable('translations', {
  // ... other fields
  jurisdictionId: integer('jurisdiction_id').references(() => jurisdictions.id),
  // ... other fields
});
```

### Type Safety with Contracts

The platform uses shared contracts for type safety between API and UI:

```typescript
// packages/contracts/schemas/jurisdictions.ts
export const JurisdictionSchema = Type.Object({
  id: Type.Number(),
  code: Type.String(),
  name: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  status: Type.String({ enum: ["active", "inactive"] }),
  region: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" })
});

// packages/contracts/types/jurisdictions.ts
export type Jurisdiction = Static<typeof JurisdictionSchema>;
```

## API Development

### Route Implementation

The API follows Fastify plugin patterns with full schema validation:

```typescript
// apps/api/src/routes/api/jurisdictions/index.ts
export default async function (fastify: FastifyInstance) {
  // GET /api/jurisdictions
  fastify.get('/', {
    schema: {
      tags: ['jurisdictions'],
      querystring: JurisdictionQuerySchema,
      response: {
        200: JurisdictionListResponseSchema,
        401: UnauthorizedErrorSchema
      }
    },
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    // Implementation with filtering, pagination, search
  });

  // Other CRUD operations...
}
```

### Authentication and Authorization

```typescript
// Admin-only operations
fastify.post('/', {
  schema: { /* ... */ },
  onRequest: [
    fastify.authenticate,      // JWT validation
    fastify.requireRole('admin') // Role-based access
  ]
}, async (request, reply) => {
  // Create jurisdiction implementation
});
```

### Error Handling

```typescript
try {
  const [jurisdiction] = await fastify.db
    .insert(jurisdictions)
    .values(data)
    .returning();
  
  reply.code(201);
  return jurisdiction;
} catch (error: any) {
  if (error.code === '23505') { // Unique constraint violation
    return reply.conflict(`Jurisdiction with code "${data.code}" already exists`);
  }
  throw error; // Re-throw unexpected errors
}
```

### Testing API Endpoints

The API includes comprehensive tests covering all scenarios:

```typescript
// apps/api/test/routes/api/jurisdictions/index.test.ts
describe('Jurisdictions API', () => {
  let app: any;
  let testUser: any;
  let adminUser: any;

  beforeEach(async () => {
    app = await build(); // Test app setup
    // Create test users and roles
  });

  describe('GET /api/jurisdictions', () => {
    it('should return jurisdictions list when authenticated', async () => {
      const token = app.jwt.sign({ 
        email: testUser.email, 
        roles: [] 
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/jurisdictions',
        headers: { authorization: `Bearer ${token}` }
      });

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(JSON.parse(res.payload))).toBe(true);
    });
  });
});
```

## Frontend Development

### Component Architecture

The UI follows a feature-driven architecture with clear separation of concerns:

```
src/features/jurisdictions/
├── components/
│   ├── jurisdictions-table.tsx          # Main table component
│   ├── jurisdictions-search-bar.tsx     # Search and filters
│   ├── jurisdiction-form-dialog.tsx     # Create/edit form
│   ├── delete-jurisdiction-dialog.tsx   # Delete confirmation
│   ├── bulk-delete-jurisdictions-dialog.tsx
│   └── jurisdictions-bulk-actions.tsx   # Bulk operations
├── hooks/
│   ├── use-jurisdictions.ts             # Data fetching
│   └── use-jurisdiction-selection.ts    # Selection state
├── pages/
│   └── jurisdictions-page.tsx           # Main page component
└── types.ts                             # UI-specific types
```

### Data Fetching with React Query

```typescript
// hooks/use-jurisdictions.ts
export function useJurisdictions({
  filters,
  sort,
  page,
  pageSize
}: UseJurisdictionsParams) {
  return useQuery({
    queryKey: ['jurisdictions', filters, sort, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.region && { region: filters.region })
      });

      const response = await apiClient.get<Jurisdiction[]>(
        `/jurisdictions?${params}`
      );
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

### Form Management

```typescript
// components/jurisdiction-form-dialog.tsx
export function JurisdictionFormDialog({ 
  jurisdiction, 
  open, 
  onOpenChange 
}: JurisdictionFormDialogProps) {
  const form = useForm<CreateJurisdictionRequest>({
    resolver: zodResolver(createJurisdictionSchema),
    defaultValues: {
      code: jurisdiction?.code || '',
      name: jurisdiction?.name || '',
      description: jurisdiction?.description || '',
      status: jurisdiction?.status || 'active',
      region: jurisdiction?.region || ''
    }
  });

  const mutation = useMutation({
    mutationFn: jurisdiction 
      ? (data: UpdateJurisdictionRequest) => 
          apiClient.put(`/jurisdictions/${jurisdiction.id}`, data)
      : (data: CreateJurisdictionRequest) => 
          apiClient.post('/jurisdictions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jurisdictions'] });
      onOpenChange(false);
      toast.success(
        jurisdiction 
          ? 'Jurisdiction updated successfully' 
          : 'Jurisdiction created successfully'
      );
    },
    onError: (error) => {
      toast.error('Failed to save jurisdiction');
    }
  });

  // Form JSX implementation...
}
```

### State Management Patterns

**URL Synchronization**
```typescript
// Sync filters and pagination with URL
useEffect(() => {
  const timeoutId = setTimeout(() => {
    const params: Record<string, any> = {};
    if (filters.search) params.search = filters.search;
    if (filters.status) params.status = filters.status;
    if (page > 1) params.page = page;

    navigate({ to: '/jurisdictions', search: params, replace: true });
  }, 100);

  return () => clearTimeout(timeoutId);
}, [filters, page]);
```

**Selection Management**
```typescript
// hooks/use-jurisdiction-selection.ts
export function useJurisdictionSelection({ 
  totalJurisdictions 
}: UseJurisdictionSelectionParams) {
  const [selectedJurisdictions, setSelectedJurisdictions] = 
    useState<Set<number>>(new Set());

  const toggleJurisdiction = useCallback((id: number) => {
    setSelectedJurisdictions(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedJurisdictions(prev => 
      prev.size === totalJurisdictions ? new Set() : new Set(jurisdictionIds)
    );
  }, [totalJurisdictions]);

  return {
    selection: {
      selectedJurisdictions,
      isAllSelected: selectedJurisdictions.size === totalJurisdictions,
      isIndeterminate: selectedJurisdictions.size > 0 && 
                      selectedJurisdictions.size < totalJurisdictions
    },
    toggleJurisdiction,
    toggleAll,
    clearSelection: () => setSelectedJurisdictions(new Set())
  };
}
```

## Extending the Jurisdictions Feature

### Adding New API Endpoints

1. **Define Schema Contracts**
```typescript
// packages/contracts/schemas/jurisdictions.ts
export const JurisdictionStatsSchema = Type.Object({
  totalJurisdictions: Type.Number(),
  activeJurisdictions: Type.Number(),
  regionBreakdown: Type.Record(Type.String(), Type.Number())
});
```

2. **Implement API Route**
```typescript
// apps/api/src/routes/api/jurisdictions/stats.ts
export default async function (fastify: FastifyInstance) {
  fastify.get('/stats', {
    schema: {
      tags: ['jurisdictions'],
      response: { 200: JurisdictionStatsSchema }
    },
    onRequest: [fastify.authenticate]
  }, async (request, reply) => {
    const stats = await calculateJurisdictionStats(fastify.db);
    return stats;
  });
}
```

3. **Add Tests**
```typescript
describe('GET /api/jurisdictions/stats', () => {
  it('should return jurisdiction statistics', async () => {
    // Test implementation
  });
});
```

### Adding UI Features

1. **Create New Components**
```typescript
// components/jurisdiction-stats-card.tsx
export function JurisdictionStatsCard() {
  const { data: stats } = useQuery({
    queryKey: ['jurisdiction-stats'],
    queryFn: () => apiClient.get('/jurisdictions/stats')
  });

  return (
    <Card>
      <CardHeader>Jurisdiction Statistics</CardHeader>
      <CardContent>
        <div>Total: {stats?.totalJurisdictions}</div>
        <div>Active: {stats?.activeJurisdictions}</div>
      </CardContent>
    </Card>
  );
}
```

2. **Integrate with Existing Pages**
```typescript
// Update jurisdictions-page.tsx to include stats
<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
  <JurisdictionStatsCard />
  {/* Other cards */}
</div>
```

### Database Schema Changes

1. **Create Migration**
```bash
bun run db:generate
```

2. **Update Schema**
```typescript
// packages/db/schema/index.ts
export const jurisdictions = pgTable('jurisdictions', {
  // existing fields...
  complianceLevel: varchar('compliance_level', { length: 50 }),
  regulatoryBody: text('regulatory_body'),
  // new fields
});
```

3. **Update Contracts**
```typescript
// Update JurisdictionSchema to include new fields
export const JurisdictionSchema = Type.Object({
  // existing fields...
  complianceLevel: Type.Optional(Type.String()),
  regulatoryBody: Type.Optional(Type.String())
});
```

## Integration Patterns

### Brand-Jurisdiction Relationships

```typescript
// API endpoint for managing brand jurisdictions
fastify.post('/brands/:brandId/jurisdictions', {
  schema: {
    params: Type.Object({ brandId: Type.Number() }),
    body: Type.Object({ jurisdictionIds: Type.Array(Type.Number()) })
  }
}, async (request, reply) => {
  const { brandId } = request.params;
  const { jurisdictionIds } = request.body;

  // Clear existing relationships
  await fastify.db.delete(brandJurisdictions)
    .where(eq(brandJurisdictions.brandId, brandId));

  // Create new relationships
  await fastify.db.insert(brandJurisdictions)
    .values(jurisdictionIds.map(id => ({ brandId, jurisdictionId: id })));

  return { success: true };
});
```

### Translation Context Integration

```typescript
// Query translations with jurisdiction context
const getTranslationsWithJurisdiction = async (
  brandId: number, 
  jurisdictionId: number, 
  localeId: number
) => {
  return await db
    .select({
      translation: translations,
      jurisdiction: jurisdictions
    })
    .from(translations)
    .leftJoin(jurisdictions, eq(translations.jurisdictionId, jurisdictions.id))
    .where(and(
      eq(translations.brandId, brandId),
      eq(translations.jurisdictionId, jurisdictionId),
      eq(translations.localeId, localeId)
    ));
};
```

### Content Hierarchy Resolution

```typescript
// Resolve content with jurisdiction hierarchy
const resolveContent = async (
  keyId: number,
  context: {
    brandId?: number;
    jurisdictionId?: number;
    localeId: number;
  }
) => {
  // Try most specific first: brand + jurisdiction + locale
  let translation = await findTranslation({
    keyId,
    brandId: context.brandId,
    jurisdictionId: context.jurisdictionId,
    localeId: context.localeId
  });

  // Fallback to jurisdiction + locale
  if (!translation && context.jurisdictionId) {
    translation = await findTranslation({
      keyId,
      jurisdictionId: context.jurisdictionId,
      localeId: context.localeId
    });
  }

  // Continue fallback chain...
  return translation;
};
```

## Testing Strategies

### API Testing

```typescript
// Comprehensive API test coverage
describe('Jurisdictions API Integration', () => {
  describe('CRUD Operations', () => {
    it('should handle complete lifecycle', async () => {
      // Create
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/jurisdictions',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { code: 'TEST', name: 'Test Jurisdiction' }
      });
      
      const jurisdiction = JSON.parse(createRes.payload);
      
      // Read
      const getRes = await app.inject({
        method: 'GET',
        url: `/api/jurisdictions/${jurisdiction.id}`,
        headers: { authorization: `Bearer ${token}` }
      });
      
      // Update
      const updateRes = await app.inject({
        method: 'PUT',
        url: `/api/jurisdictions/${jurisdiction.id}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { status: 'inactive' }
      });
      
      // Delete
      const deleteRes = await app.inject({
        method: 'DELETE',
        url: `/api/jurisdictions/${jurisdiction.id}`,
        headers: { authorization: `Bearer ${adminToken}` }
      });
      
      expect(deleteRes.statusCode).toBe(204);
    });
  });
});
```

### Component Testing

```typescript
// React component testing
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { JurisdictionsPage } from '../pages/jurisdictions-page';

describe('JurisdictionsPage', () => {
  it('should filter jurisdictions by search term', async () => {
    render(<JurisdictionsPage />);
    
    const searchInput = screen.getByPlaceholderText('Search jurisdictions...');
    fireEvent.change(searchInput, { target: { value: 'UKGC' } });
    
    await waitFor(() => {
      expect(screen.getByText('UK Gambling Commission')).toBeInTheDocument();
      expect(screen.queryByText('Malta Gaming Authority')).not.toBeInTheDocument();
    });
  });
});
```

### E2E Testing

```typescript
// End-to-end workflow testing
describe('Jurisdictions Management E2E', () => {
  it('should complete full jurisdiction management workflow', async () => {
    // Login as admin
    await page.goto('/login');
    await login(page, adminCredentials);
    
    // Navigate to jurisdictions
    await page.goto('/jurisdictions');
    
    // Create jurisdiction
    await page.click('[data-testid="add-jurisdiction-button"]');
    await page.fill('[name="code"]', 'E2E_TEST');
    await page.fill('[name="name"]', 'E2E Test Jurisdiction');
    await page.click('[data-testid="submit-button"]');
    
    // Verify creation
    await expect(page.locator('text=E2E Test Jurisdiction')).toBeVisible();
    
    // Edit jurisdiction
    await page.click('[data-testid="edit-jurisdiction-button"]');
    await page.fill('[name="description"]', 'Updated description');
    await page.click('[data-testid="submit-button"]');
    
    // Delete jurisdiction
    await page.click('[data-testid="delete-jurisdiction-button"]');
    await page.click('[data-testid="confirm-delete-button"]');
    
    // Verify deletion
    await expect(page.locator('text=E2E Test Jurisdiction')).not.toBeVisible();
  });
});
```

## Performance Considerations

### Database Optimization

```sql
-- Indexes for common queries
CREATE INDEX idx_jurisdictions_code ON jurisdictions(code);
CREATE INDEX idx_jurisdictions_status ON jurisdictions(status);
CREATE INDEX idx_jurisdictions_region ON jurisdictions(region);
CREATE INDEX idx_jurisdictions_created_at ON jurisdictions(created_at);

-- Composite index for filtered searches
CREATE INDEX idx_jurisdictions_status_region ON jurisdictions(status, region);
```

### API Performance

```typescript
// Pagination with efficient counting
const getJurisdictionsWithCount = async (filters: JurisdictionFilters) => {
  const [jurisdictions, [{ count }]] = await Promise.all([
    db.select().from(jurisdictions)
      .where(buildWhereClause(filters))
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize),
    
    db.select({ count: count() }).from(jurisdictions)
      .where(buildWhereClause(filters))
  ]);

  return { jurisdictions, total: count };
};
```

### Frontend Performance

```typescript
// Memoized components for performance
const JurisdictionsTable = memo(function JurisdictionsTable({
  jurisdictions,
  onEdit,
  onDelete
}: JurisdictionsTableProps) {
  // Component implementation
});

// Debounced search to reduce API calls
const useDebounced = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [value, delay]);

  return debouncedValue;
};
```

## Security Considerations

### Input Validation

```typescript
// Server-side validation with TypeBox
const CreateJurisdictionRequestSchema = Type.Object({
  code: Type.String({ 
    minLength: 1,
    maxLength: 20,
    pattern: "^[A-Z0-9_-]+$" // Prevent injection
  }),
  name: Type.String({ 
    minLength: 1,
    maxLength: 255 // Prevent buffer overflow
  }),
  description: Type.Optional(Type.String({ maxLength: 1000 }))
});
```

### Authorization Checks

```typescript
// Role-based access control
const requireAdminRole = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user;
  if (!user.roles.includes('admin')) {
    return reply.forbidden('Admin role required');
  }
};
```

### SQL Injection Prevention

```typescript
// Use parameterized queries with Drizzle
const getJurisdictionsByRegion = async (region: string) => {
  // Safe - uses parameterized query
  return await db.select().from(jurisdictions)
    .where(eq(jurisdictions.region, region));
  
  // NEVER do this - vulnerable to SQL injection
  // return await db.execute(`SELECT * FROM jurisdictions WHERE region = '${region}'`);
};
```

## Monitoring and Observability

### Logging

```typescript
// Structured logging for jurisdiction operations
fastify.post('/jurisdictions', async (request, reply) => {
  const { code, name } = request.body;
  
  fastify.log.info({
    operation: 'create_jurisdiction',
    jurisdiction_code: code,
    user_id: request.user.id
  }, 'Creating new jurisdiction');

  try {
    const jurisdiction = await createJurisdiction(request.body);
    
    fastify.log.info({
      operation: 'create_jurisdiction_success',
      jurisdiction_id: jurisdiction.id,
      jurisdiction_code: code
    }, 'Jurisdiction created successfully');
    
    return jurisdiction;
  } catch (error) {
    fastify.log.error({
      operation: 'create_jurisdiction_error',
      jurisdiction_code: code,
      error: error.message
    }, 'Failed to create jurisdiction');
    
    throw error;
  }
});
```

### Metrics

```typescript
// Custom metrics for monitoring
const jurisdictionMetrics = {
  created: prometheus.counter({
    name: 'jurisdictions_created_total',
    help: 'Total number of jurisdictions created'
  }),
  
  queries: prometheus.histogram({
    name: 'jurisdiction_query_duration_seconds',
    help: 'Duration of jurisdiction queries'
  })
};

// Usage in handlers
jurisdictionMetrics.created.inc();
```

This comprehensive development guide provides the foundation for working with and extending the jurisdictions feature. The modular architecture, comprehensive testing, and clear patterns make it straightforward to add new functionality while maintaining code quality and platform consistency.