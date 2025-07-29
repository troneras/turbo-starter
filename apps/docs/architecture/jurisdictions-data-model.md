# Jurisdictions Data Model

This document provides a comprehensive overview of the jurisdictions data model, its relationships within the CMS platform, and how it integrates with the broader content management architecture.

## Overview

The jurisdictions data model represents regulatory bodies and legal frameworks that govern content and operations across different geographical regions. It serves as a cornerstone for multi-jurisdiction content management, enabling compliance with diverse regulatory requirements while maintaining operational efficiency.

## Core Entity: Jurisdictions

### Database Schema

```sql
CREATE TABLE jurisdictions (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'active' NOT NULL,
  region VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_jurisdictions_code ON jurisdictions(code);
CREATE INDEX idx_jurisdictions_status ON jurisdictions(status);
CREATE INDEX idx_jurisdictions_region ON jurisdictions(region);
CREATE INDEX idx_jurisdictions_status_region ON jurisdictions(status, region);
```

### Field Specifications

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | Serial | Primary Key | Auto-incrementing unique identifier |
| `code` | VARCHAR(20) | Unique, NOT NULL, Pattern: `^[A-Z0-9_-]+$` | Jurisdiction identifier (e.g., "UKGC", "MGA") |
| `name` | TEXT | NOT NULL | Human-readable jurisdiction name |
| `description` | TEXT | Nullable | Detailed regulatory information |
| `status` | VARCHAR(20) | NOT NULL, Default: 'active' | Status: 'active' or 'inactive' |
| `region` | VARCHAR(100) | Nullable | Geographic region classification |
| `created_at` | TIMESTAMP | NOT NULL, Default: NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL, Default: NOW() | Record modification timestamp |

### Business Rules

**Code Format Rules:**
- Must be unique across the system
- Uppercase alphanumeric characters only
- Underscores and hyphens allowed
- Maximum 20 characters
- Should reflect official regulator abbreviations when possible

**Status Management:**
- `active`: Jurisdiction is operational and should be included in content workflows
- `inactive`: Jurisdiction is deprecated but preserved for historical data

**Naming Conventions:**
- Use official regulator names when available
- Include geographical context when helpful
- Maintain consistency in naming patterns

## Entity Relationships

### Direct Relationships

#### 1. Brand-Jurisdiction Association (Many-to-Many)

```sql
CREATE TABLE brand_jurisdictions (
  brand_id INTEGER REFERENCES brands(id) NOT NULL,
  jurisdiction_id INTEGER REFERENCES jurisdictions(id) NOT NULL,
  PRIMARY KEY (brand_id, jurisdiction_id)
);
```

**Purpose:** Links brands to the jurisdictions they operate under.

**Business Logic:**
- Brands can operate in multiple jurisdictions
- Each jurisdiction can govern multiple brands
- Association determines content compliance requirements
- Affects translation visibility and content inheritance

**Usage Example:**
```typescript
// Brand operating in multiple jurisdictions
const brandJurisdictions = [
  { brandId: 1, jurisdictionId: 1 }, // Brand 1 -> UKGC
  { brandId: 1, jurisdictionId: 2 }, // Brand 1 -> MGA
  { brandId: 2, jurisdictionId: 1 }  // Brand 2 -> UKGC
];
```

#### 2. Translation Context (One-to-Many)

```sql
CREATE TABLE translations (
  id SERIAL PRIMARY KEY,
  key_id INTEGER REFERENCES translation_keys(id) NOT NULL,
  brand_id INTEGER REFERENCES brands(id),
  jurisdiction_id INTEGER REFERENCES jurisdictions(id),
  locale_id INTEGER REFERENCES locales(id) NOT NULL,
  value TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  -- ... other fields
  UNIQUE(key_id, brand_id, jurisdiction_id, locale_id)
);
```

**Purpose:** Provides jurisdictional context for content translations.

**Business Logic:**
- Translations can be specific to jurisdiction requirements
- Enables regulatory compliance through localized content
- Supports content hierarchy and inheritance patterns
- Allows jurisdiction-specific overrides of global content

### Content Hierarchy and Inheritance

The jurisdictions model participates in a sophisticated content hierarchy that enables flexible content management across different contexts:

```
Global Content (Base)
├── Brand-Specific Content
├── Jurisdiction-Specific Content
└── Brand + Jurisdiction Specific Content (Most Specific)
```

#### Inheritance Rules

1. **Global Content**: Default content when no specific overrides exist
2. **Brand Content**: Overrides global content for specific brands
3. **Jurisdiction Content**: Overrides global content for regulatory compliance
4. **Brand + Jurisdiction Content**: Most specific, overrides all other levels

#### Resolution Algorithm

```typescript
const resolveContent = async (
  keyId: number,
  context: {
    brandId?: number;
    jurisdictionId?: number;
    localeId: number;
  }
): Promise<Translation | null> => {
  // 1. Try most specific: brand + jurisdiction + locale
  if (context.brandId && context.jurisdictionId) {
    const specific = await findTranslation({
      keyId,
      brandId: context.brandId,
      jurisdictionId: context.jurisdictionId,
      localeId: context.localeId
    });
    if (specific) return specific;
  }

  // 2. Try brand + locale
  if (context.brandId) {
    const brandSpecific = await findTranslation({
      keyId,
      brandId: context.brandId,
      localeId: context.localeId
    });
    if (brandSpecific) return brandSpecific;
  }

  // 3. Try jurisdiction + locale
  if (context.jurisdictionId) {
    const jurisdictionSpecific = await findTranslation({
      keyId,
      jurisdictionId: context.jurisdictionId,
      localeId: context.localeId
    });
    if (jurisdictionSpecific) return jurisdictionSpecific;
  }

  // 4. Fallback to global content
  return await findTranslation({
    keyId,
    localeId: context.localeId
  });
};
```

## Integration Patterns

### 1. Multi-Tenant Content Strategy

```typescript
interface ContentContext {
  brandId?: number;
  jurisdictionId?: number;
  localeId: number;
  userId?: string;
}

class ContentResolver {
  async resolve(key: string, context: ContentContext): Promise<string> {
    const keyRecord = await this.findTranslationKey(key);
    const translation = await this.resolveTranslation(keyRecord.id, context);
    
    return translation?.value || key; // Fallback to key if no translation
  }

  private async resolveTranslation(
    keyId: number, 
    context: ContentContext
  ): Promise<Translation | null> {
    // Implementation follows hierarchy rules
  }
}
```

### 2. Compliance Framework

```typescript
interface ComplianceRule {
  jurisdictionId: number;
  ruleType: 'content_restriction' | 'display_requirement' | 'audit_trail';
  configuration: Record<string, any>;
}

class ComplianceEngine {
  async validateContent(
    content: string, 
    jurisdictionId: number
  ): Promise<ComplianceResult> {
    const rules = await this.getRulesForJurisdiction(jurisdictionId);
    
    for (const rule of rules) {
      const result = await this.applyRule(content, rule);
      if (!result.compliant) {
        return result;
      }
    }
    
    return { compliant: true };
  }
}
```

### 3. Regional Content Management

```typescript
interface RegionalStrategy {
  region: string;
  jurisdictions: Jurisdiction[];
  contentPolicies: ContentPolicy[];
  complianceRequirements: ComplianceRequirement[];
}

class RegionalContentManager {
  async getRegionalStrategy(region: string): Promise<RegionalStrategy> {
    const jurisdictions = await this.getJurisdictionsByRegion(region);
    const policies = await this.getContentPoliciesForRegion(region);
    const requirements = await this.getComplianceRequirements(jurisdictions);
    
    return {
      region,
      jurisdictions,
      contentPolicies: policies,
      complianceRequirements: requirements
    };
  }
}
```

## Data Access Patterns

### 1. Repository Pattern

```typescript
interface JurisdictionRepository {
  findAll(filters?: JurisdictionFilters): Promise<Jurisdiction[]>;
  findById(id: number): Promise<Jurisdiction | null>;
  findByCode(code: string): Promise<Jurisdiction | null>;
  findByRegion(region: string): Promise<Jurisdiction[]>;
  create(data: CreateJurisdictionRequest): Promise<Jurisdiction>;
  update(id: number, data: UpdateJurisdictionRequest): Promise<Jurisdiction>;
  delete(id: number): Promise<void>;
  
  // Relationship queries
  findBrandJurisdictions(brandId: number): Promise<Jurisdiction[]>;
  findJurisdictionBrands(jurisdictionId: number): Promise<Brand[]>;
}

class DrizzleJurisdictionRepository implements JurisdictionRepository {
  constructor(private db: DrizzleDB) {}

  async findAll(filters?: JurisdictionFilters): Promise<Jurisdiction[]> {
    let query = this.db.select().from(jurisdictions);
    
    if (filters?.status) {
      query = query.where(eq(jurisdictions.status, filters.status));
    }
    
    if (filters?.region) {
      query = query.where(eq(jurisdictions.region, filters.region));
    }
    
    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.where(
        or(
          like(jurisdictions.code, searchTerm),
          like(jurisdictions.name, searchTerm),
          like(jurisdictions.region, searchTerm)
        )
      );
    }
    
    return await query;
  }

  async findBrandJurisdictions(brandId: number): Promise<Jurisdiction[]> {
    return await this.db
      .select({ jurisdiction: jurisdictions })
      .from(brandJurisdictions)
      .innerJoin(jurisdictions, eq(brandJurisdictions.jurisdictionId, jurisdictions.id))
      .where(eq(brandJurisdictions.brandId, brandId))
      .then(results => results.map(r => r.jurisdiction));
  }
}
```

### 2. Service Layer

```typescript
class JurisdictionService {
  constructor(
    private repository: JurisdictionRepository,
    private auditService: AuditService,
    private cacheService: CacheService
  ) {}

  async createJurisdiction(
    data: CreateJurisdictionRequest,
    createdBy: string
  ): Promise<Jurisdiction> {
    // Validate business rules
    await this.validateJurisdictionCode(data.code);
    
    // Create jurisdiction
    const jurisdiction = await this.repository.create(data);
    
    // Audit trail
    await this.auditService.log({
      action: 'jurisdiction_created',
      entityId: jurisdiction.id,
      entityType: 'jurisdiction',
      userId: createdBy,
      data: jurisdiction
    });
    
    // Cache invalidation
    await this.cacheService.invalidate(['jurisdictions', 'jurisdiction-stats']);
    
    return jurisdiction;
  }

  async associateBrandWithJurisdictions(
    brandId: number,
    jurisdictionIds: number[],
    updatedBy: string
  ): Promise<void> {
    // Validate jurisdictions exist and are active
    const jurisdictions = await Promise.all(
      jurisdictionIds.map(id => this.repository.findById(id))
    );
    
    const invalid = jurisdictions.filter(j => !j || j.status !== 'active');
    if (invalid.length > 0) {
      throw new Error('Invalid or inactive jurisdictions provided');
    }
    
    // Update associations
    await this.updateBrandJurisdictions(brandId, jurisdictionIds);
    
    // Audit trail
    await this.auditService.log({
      action: 'brand_jurisdictions_updated',
      entityId: brandId,
      entityType: 'brand',
      userId: updatedBy,
      data: { jurisdictionIds }
    });
  }
}
```

## Query Optimization

### 1. Efficient Pagination

```sql
-- Optimized pagination with filtering
SELECT j.*
FROM jurisdictions j
WHERE 
  (status = $1 OR $1 IS NULL) AND
  (region = $2 OR $2 IS NULL) AND
  (
    code ILIKE $3 OR 
    name ILIKE $3 OR 
    region ILIKE $3 OR 
    $3 IS NULL
  )
ORDER BY j.name ASC
LIMIT $4 OFFSET $5;

-- Count query for pagination metadata
SELECT COUNT(*)
FROM jurisdictions j
WHERE 
  (status = $1 OR $1 IS NULL) AND
  (region = $2 OR $2 IS NULL) AND
  (
    code ILIKE $3 OR 
    name ILIKE $3 OR 
    region ILIKE $3 OR 
    $3 IS NULL
  );
```

### 2. Complex Relationship Queries

```sql
-- Get all translations for a specific brand-jurisdiction combination
SELECT 
  tk.key,
  t.value,
  l.code as locale_code,
  j.code as jurisdiction_code,
  b.name as brand_name
FROM translations t
JOIN translation_keys tk ON t.key_id = tk.id
JOIN locales l ON t.locale_id = l.id
LEFT JOIN jurisdictions j ON t.jurisdiction_id = j.id
LEFT JOIN brands b ON t.brand_id = b.id
WHERE 
  b.id = $1 AND 
  j.id = $2 AND 
  t.status = 'published'
ORDER BY tk.key, l.code;

-- Get jurisdiction statistics with brand counts
SELECT 
  j.id,
  j.code,
  j.name,
  j.region,
  j.status,
  COUNT(DISTINCT bj.brand_id) as brand_count,
  COUNT(DISTINCT t.id) as translation_count
FROM jurisdictions j
LEFT JOIN brand_jurisdictions bj ON j.id = bj.jurisdiction_id
LEFT JOIN translations t ON j.id = t.jurisdiction_id
GROUP BY j.id, j.code, j.name, j.region, j.status
ORDER BY j.name;
```

### 3. Performance Indexes

```sql
-- Composite indexes for common query patterns
CREATE INDEX idx_jurisdictions_status_region ON jurisdictions(status, region);
CREATE INDEX idx_brand_jurisdictions_lookup ON brand_jurisdictions(brand_id, jurisdiction_id);
CREATE INDEX idx_translations_context ON translations(brand_id, jurisdiction_id, locale_id);
CREATE INDEX idx_translations_key_context ON translations(key_id, brand_id, jurisdiction_id, locale_id);

-- Partial indexes for active jurisdictions
CREATE INDEX idx_jurisdictions_active_region ON jurisdictions(region) WHERE status = 'active';
CREATE INDEX idx_jurisdictions_active_name ON jurisdictions(name) WHERE status = 'active';
```

## Caching Strategy

### 1. Multi-Level Caching

```typescript
class JurisdictionCacheService {
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  async getJurisdictions(filters: JurisdictionFilters): Promise<Jurisdiction[]> {
    const cacheKey = this.buildCacheKey('jurisdictions', filters);
    
    // L1: Memory cache
    let result = this.memoryCache.get(cacheKey);
    if (result) return result;
    
    // L2: Redis cache
    result = await this.redisCache.get(cacheKey);
    if (result) {
      this.memoryCache.set(cacheKey, result, this.CACHE_TTL);
      return result;
    }
    
    // L3: Database
    result = await this.repository.findAll(filters);
    
    // Populate caches
    await this.redisCache.set(cacheKey, result, this.CACHE_TTL);
    this.memoryCache.set(cacheKey, result, this.CACHE_TTL);
    
    return result;
  }

  async invalidateJurisdictionCaches(jurisdictionId?: number): Promise<void> {
    const patterns = [
      'jurisdictions:*',
      'jurisdiction-stats:*',
      'brand-jurisdictions:*',
      'content-resolution:*'
    ];
    
    if (jurisdictionId) {
      patterns.push(`jurisdiction:${jurisdictionId}:*`);
    }
    
    await Promise.all([
      this.memoryCache.clear(),
      this.redisCache.deleteByPattern(patterns)
    ]);
  }
}
```

### 2. Cache Warming

```typescript
class JurisdictionCacheWarmer {
  async warmCaches(): Promise<void> {
    // Pre-populate common queries
    const commonFilters = [
      { status: 'active' },
      { region: 'Europe', status: 'active' },
      { region: 'North America', status: 'active' }
    ];
    
    await Promise.all(
      commonFilters.map(filters => 
        this.cacheService.getJurisdictions(filters)
      )
    );
    
    // Pre-populate jurisdiction stats
    await this.cacheService.getJurisdictionStats();
  }
}
```

## Data Migration and Seeding

### 1. Initial Data Setup

```typescript
// Database seeding for jurisdictions
const seedJurisdictions = async (db: DrizzleDB) => {
  const jurisdictionsData = [
    {
      code: 'UKGC',
      name: 'UK Gambling Commission',
      description: 'The statutory body responsible for regulating commercial gambling in Great Britain under the Gambling Act 2005.',
      status: 'active',
      region: 'Europe'
    },
    {
      code: 'MGA',
      name: 'Malta Gaming Authority',
      description: 'The single regulator for all gaming activities in Malta, established in 2018.',
      status: 'active',
      region: 'Europe'
    },
    {
      code: 'DGOJ',
      name: 'Dirección General de Ordenación del Juego',
      description: 'Spanish gambling regulator under the Ministry of Finance.',
      status: 'active',
      region: 'Europe'
    },
    {
      code: 'AGCO',
      name: 'Alcohol and Gaming Commission of Ontario',
      description: 'Ontario\'s gambling regulator responsible for the conduct and management of gaming.',
      status: 'active',
      region: 'North America'
    }
  ];
  
  await db.insert(jurisdictions).values(jurisdictionsData).onConflictDoNothing();
};
```

### 2. Data Migration Patterns

```typescript
// Migration for adding new fields
export async function up(db: DrizzleDB) {
  await db.execute(`
    ALTER TABLE jurisdictions 
    ADD COLUMN compliance_level VARCHAR(50),
    ADD COLUMN regulatory_body TEXT,
    ADD COLUMN website_url TEXT
  `);
  
  // Update existing records with default values
  await db.update(jurisdictions)
    .set({
      complianceLevel: 'standard',
      regulatoryBody: 'Gaming Authority'
    })
    .where(isNotNull(jurisdictions.id));
}

export async function down(db: DrizzleDB) {
  await db.execute(`
    ALTER TABLE jurisdictions 
    DROP COLUMN compliance_level,
    DROP COLUMN regulatory_body,
    DROP COLUMN website_url
  `);
}
```

## Monitoring and Analytics

### 1. Business Metrics

```typescript
interface JurisdictionMetrics {
  totalJurisdictions: number;
  activeJurisdictions: number;
  regionBreakdown: Record<string, number>;
  brandCoverage: {
    jurisdictionId: number;
    jurisdictionCode: string;
    brandCount: number;
  }[];
  contentCoverage: {
    jurisdictionId: number;
    translationCount: number;
    completionPercentage: number;
  }[];
}

class JurisdictionAnalytics {
  async generateMetrics(): Promise<JurisdictionMetrics> {
    const [
      totalCount,
      activeCount,
      regionStats,
      brandCoverage,
      contentStats
    ] = await Promise.all([
      this.getTotalJurisdictions(),
      this.getActiveJurisdictions(),
      this.getRegionBreakdown(),
      this.getBrandCoverage(),
      this.getContentCoverage()
    ]);
    
    return {
      totalJurisdictions: totalCount,
      activeJurisdictions: activeCount,
      regionBreakdown: regionStats,
      brandCoverage,
      contentCoverage: contentStats
    };
  }
}
```

### 2. Operational Monitoring

```typescript
// Health checks for jurisdiction data integrity
class JurisdictionHealthChecker {
  async checkDataIntegrity(): Promise<HealthCheckResult> {
    const checks = await Promise.all([
      this.checkDuplicateCodes(),
      this.checkOrphanedBrandJurisdictions(),
      this.checkInvalidReferences(),
      this.checkStatusConsistency()
    ]);
    
    const failed = checks.filter(check => !check.healthy);
    
    return {
      healthy: failed.length === 0,
      checks,
      message: failed.length > 0 
        ? `${failed.length} integrity issues found` 
        : 'All checks passed'
    };
  }
}
```

## Summary

The jurisdictions data model serves as a critical component in the CMS platform's multi-tenant architecture. Its design enables:

- **Regulatory Compliance**: Content can be tailored to meet specific jurisdictional requirements
- **Flexible Content Management**: Supports complex inheritance and override patterns
- **Scalable Architecture**: Efficient queries and caching for large-scale operations
- **Data Integrity**: Comprehensive validation and constraint enforcement
- **Operational Excellence**: Monitoring, analytics, and health checking capabilities

The model's integration with brands, translations, and the broader content hierarchy provides a robust foundation for managing content across diverse regulatory landscapes while maintaining operational efficiency and compliance requirements.