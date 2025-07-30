
We have implemented a cms release system based on the requirements in this file: @ai/specs/releases.md

The following is the current state of development:

  Main database changes were done in the following files:
    @packages/db/schema/entities.ts
    @packages/db/schema/releases.ts  
    @packages/db/schema/views.ts
    @packages/db/custom-migrations/migrations/001_release_views.sql
    @packages/db/custom-migrations/migrations/002_release_functions.sql
    @packages/db/custom-migrations/migrations/003_release_permissions.sql

  In the api part, new routes, repository and request context was added for release management:
    @apps/api/src/plugins/app/releases/index.ts
    @apps/api/src/plugins/app/releases/releases-repository.ts
    @apps/api/src/plugins/app/releases/release-context.ts
    @apps/api/src/routes/api/releases/index.ts


 In the admin panel, a release feature was added as well:
    @apps/admin/src/app/providers/release-provider.tsx
    @apps/admin/src/app/routes/releases.tsx
    @apps/admin/src/features/releases/components/release-switcher.tsx
    @apps/admin/src/features/releases/pages/releases-page.tsx


After that we continued with implementing translations with the specs in this file:

    @ai/specs/translations.md

what resulted in the implementation of the translation system as seen here:

## DATABASE
@packages/db/custom-migrations/migrations/004_translation_indexes.sql

## API
@apps/api/src/plugins/app/translations/index.ts
@apps/api/src/plugins/app/translations/translations-repository.ts

@apps/api/src/routes/api/translations/keys/index.ts
@apps/api/src/routes/api/translations/stats/index.ts
@apps/api/src/routes/api/translations/variants/index.ts
(I believe there should exist one here but is not existing, perhaps fastify routing is not used properly @apps/api/src/routes/api/translations/index.ts)


## FRONTEND
@apps/admin/src/features/translations/pages/translations-page.tsx

- Developer Summary
```
  Database Implementation

  - Created a custom SQL migration (004_translation_indexes.sql) that:
    - Adds indexes for translation keys and variants
    - Implements unique constraints for generic and brand-specific translations
    - Provides database functions for translation lookup with brand fallback
    - Includes tree navigation functions for hierarchical key display

  API Implementation

  - Created translation repository with full CRUD operations
  - Added REST endpoints under /api/translations/:
    - /keys - Manage translation keys
    - /variants - Manage translation variants
    - /stats - Get translation statistics
  - Integrated with the existing release-aware entity system
  - Added proper authentication and permission checks

  UI Implementation

  - Created a complete translations management page with:
    - Resizable panels for tree navigation and variant management
    - Translation key tree with lazy loading
    - Translation variant management with locale/brand support
    - Status workflow (draft/pending/approved)
    - Create/edit/delete functionality for both keys and variants
    - Translation statistics display

  Type Safety

  - Extended the contracts package with translation schemas
  - Full TypeScript type safety across the stack
  - Shared types between API and UI

  The system now supports:
  - Translation keys using dotted notation (e.g., checkout.button.confirm)
  - Translation variants per locale with optional brand-specific overrides
  - Release-aware translations that integrate with the existing release management system
  - Hierarchical navigation through the translation key tree
  - Status workflow for translation approval process    
```