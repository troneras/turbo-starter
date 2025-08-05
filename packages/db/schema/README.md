# Database Schema Documentation

This directory contains the Drizzle ORM schema definitions for the database. The schema has been refactored from custom SQL migrations to use Drizzle's schema definition capabilities where possible.

## Schema Files

### Core Schema Files

- **`index.ts`** - Main schema file that exports all tables and types
- **`releases.ts`** - Release management tables and sequences
- **`entities.ts`** - Entity versioning system tables
- **`enums.ts`** - PostgreSQL enum definitions
- **`audit.ts`** - Audit events table
- **`views.ts`** - Database view definitions (partial - complex views remain in SQL)

### What Was Converted to Drizzle Schema

#### ✅ Successfully Converted

1. **Enums** - All PostgreSQL enums are now defined using `pgEnum`:
   - `releaseStatusEnum` - Release status values
   - `entityChangeTypeEnum` - Entity change types
   - `relationActionTypeEnum` - Relation action types
   - `entityTypeEnum` - Common entity types

2. **Tables** - All tables are defined using `pgTable`:
   - `releases` - Release management
   - `entities` - Core entity table
   - `entityVersions` - Entity versioning
   - `relationVersions` - Relationship versioning
   - `auditEvents` - Audit trail

3. **Basic Views** - Simple views using `pgView`:
   - `vEntities` - Basic entity view (simplified)
   - `vActiveTranslations` - Translation convenience view

4. **Indexes** - Basic indexes defined in table schemas

### What Remains as SQL Migrations

#### ❌ Cannot Be Converted to Drizzle

1. **Complex Functions** - All PostgreSQL functions remain in SQL:
   - `get_active_release()` - Session-based release management
   - `set_active_release()` - Session variable management
   - `calculate_release_diff()` - Release comparison logic
   - `check_release_conflicts()` - Conflict detection
   - `validate_release_for_deployment()` - Deployment validation
   - `get_release_stats()` - Release statistics
   - `get_translation()` - Translation retrieval with fallback
   - `get_translation_key_tree()` - Translation key hierarchy
   - `get_translation_stats()` - Translation statistics

2. **Triggers** - All database triggers remain in SQL:
   - `trg_set_entity_name` - Auto-populate entity names
   - `trg_prevent_updates_entity_versions` - Immutability enforcement
   - `trg_audit_entity_versions` - Audit logging
   - `trg_audit_releases` - Release status change logging

3. **Complex Views** - Views with complex logic remain in SQL:
   - `v_entities` - Complex DISTINCT ON logic with joins
   - `v_active_translations` - Complex payload extraction

4. **Advanced Constraints** - Complex check constraints and unique indexes:
   - Partial unique indexes with WHERE clauses
   - JSONB-based constraints
   - Complex foreign key constraints with ON DELETE SET NULL

5. **Performance Indexes** - Advanced indexing strategies:
   - GIN indexes for JSONB
   - Partial indexes with WHERE clauses
   - Composite indexes for specific query patterns

## Migration Files

The following SQL migration files contain the parts that cannot be represented in Drizzle schema files:

- **`001_release_views.sql`** - Complex views and extensions
- **`002_release_functions.sql`** - Core release management functions
- **`003_release_permissions.sql`** - Permissions and basic constraints
- **`004_translation_indexes.sql`** - Translation-specific indexes
- **`005_drizzle_schema_functions.sql`** - Functions extracted from original migrations
- **`006_drizzle_schema_triggers.sql`** - Triggers extracted from original migrations
- **`007_drizzle_schema_constraints.sql`** - Constraints and indexes extracted from original migrations
- **`008_translation_functions.sql`** - Translation-specific functions

## Benefits of This Refactoring

1. **Type Safety** - Drizzle provides full TypeScript type inference
2. **Schema Validation** - Drizzle validates schema definitions at compile time
3. **Migration Generation** - Drizzle can generate migrations from schema changes
4. **Better IDE Support** - Autocomplete and error detection for schema definitions
5. **Consistency** - Standardized schema definition patterns

## Limitations

1. **Complex Logic** - Functions, triggers, and complex views must remain in SQL
2. **Advanced PostgreSQL Features** - Some PostgreSQL-specific features aren't supported by Drizzle
3. **Performance Optimizations** - Complex indexing strategies require SQL
4. **Business Logic** - Application-specific functions remain in SQL

## Usage

```typescript
import { releases, entities, entityVersions } from './schema'

// Use the schema definitions in your Drizzle queries
const result = await db.select().from(releases).where(eq(releases.status, 'OPEN'))
```

## Migration Strategy

When making schema changes:

1. **Simple Changes** - Modify the Drizzle schema files and regenerate migrations
2. **Complex Changes** - Add new SQL migration files for functions, triggers, or complex constraints
3. **Enum Changes** - Update `enums.ts` and regenerate migrations
4. **Table Changes** - Update the appropriate schema file and regenerate migrations

## Notes

- The `views.ts` file contains simplified view definitions that don't fully represent the complex SQL views
- Complex views with DISTINCT ON, complex joins, or window functions remain in SQL migrations
- All functions and triggers are preserved in SQL migrations since Drizzle doesn't support them
- The refactoring maintains backward compatibility while providing better type safety 