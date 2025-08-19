# Languages API Refactor Summary

## Overview

The languages API (`/apps/api/src/routes/api/languages/index.ts`) has been successfully refactored to use the new locales service instead of directly querying the database. This improves separation of concerns, code reusability, and maintainability.

## Changes Made

### Before Refactor

- Direct database queries using Drizzle ORM
- Manual implementation of search, pagination, and error handling
- Duplicate code for common operations
- Import dependencies: `eq`, `like`, `or` from drizzle-orm and `locales` from schema

### After Refactor

- Uses the centralized locales service (`fastify.locales`)
- Leverages service-layer business logic and error handling
- Cleaner, more maintainable code
- Removed direct database dependencies

## Endpoint Changes

### 1. GET `/` (List Languages)

**Before:**

```typescript
// Manual pagination and search logic
const offset = (page - 1) * pageSize;
let allLanguages;
if (query.search) {
  const searchTerm = `%${query.search}%`;
  allLanguages = await fastify.db
    .select()
    .from(locales)
    .where(or(like(locales.code, searchTerm), like(locales.name, searchTerm)))
    .limit(pageSize)
    .offset(offset);
} else {
  allLanguages = await fastify.db
    .select()
    .from(locales)
    .limit(pageSize)
    .offset(offset);
}
```

**After:**

```typescript
// Clean service call with pagination and search
const result = await fastify.locales.listLocales(page, pageSize, {
  search: query.search,
  sortBy: "name",
  sortDirection: "asc",
});
return result.locales;
```

### 2. GET `/:id` (Get Language by ID)

**Before:**

```typescript
const language = await fastify.db
  .select()
  .from(locales)
  .where(eq(locales.id, id))
  .limit(1);
if (language.length === 0) {
  return reply.notFound(`Language with ID ${id} not found`);
}
return language[0];
```

**After:**

```typescript
const language = await fastify.locales.getLocaleById(id);
if (!language) {
  return reply.notFound(`Language with ID ${id} not found`);
}
return language;
```

### 3. POST `/` (Create Language)

**Before:**

```typescript
const [language] = await fastify.db.insert(locales).values(data).returning();
// Manual error handling for unique constraints
```

**After:**

```typescript
const language = await fastify.locales.createLocale(data);
// Service handles validation and error messages
```

### 4. PUT `/:id` (Update Language)

**Before:**

```typescript
// Manual existence check
const existing = await fastify.db
  .select()
  .from(locales)
  .where(eq(locales.id, id))
  .limit(1);
if (existing.length === 0) {
  return reply.notFound(`Language with ID ${id} not found`);
}
// Manual field updates and constraint handling
```

**After:**

```typescript
const language = await fastify.locales.updateLocale(id, data);
// Service handles all validation and business logic
```

### 5. DELETE `/:id` (Delete Language)

**Before:**

```typescript
// Manual existence check and deletion
const existing = await fastify.db
  .select()
  .from(locales)
  .where(eq(locales.id, id))
  .limit(1);
if (existing.length === 0) {
  return reply.notFound(`Language with ID ${id} not found`);
}
await fastify.db.delete(locales).where(eq(locales.id, id));
```

**After:**

```typescript
await fastify.locales.deleteLocale(id);
// Service handles existence check and deletion
```

## Benefits

### 1. **Separation of Concerns**

- API routes focus on HTTP handling and validation
- Business logic is centralized in the locales service
- Database operations are encapsulated

### 2. **Code Reusability**

- Locales service can be used by other parts of the application
- Common operations are implemented once
- Consistent error handling across all usage

### 3. **Maintainability**

- Easier to modify business logic in one place
- Reduced code duplication
- Cleaner, more readable route handlers

### 4. **Consistency**

- Follows the same pattern as other services (users, roles, translations)
- Uniform error messages and handling
- Consistent API behavior

### 5. **Testing**

- Service layer can be tested independently
- Routes can be tested with mocked services
- Better separation of unit and integration tests

## Integration with Existing Services

The refactored languages API now works seamlessly with the locales service, which is also used by:

- **Translations Service**: Uses `fastify.locales.getAllLocales()` for locale data
- **Future Services**: Any service needing locale information can use the centralized service

## Error Handling Improvements

The refactored API now benefits from:

- Consistent error messages from the service layer
- Proper exception handling and re-throwing
- Service-level validation and business rule enforcement

## Performance Considerations

- Same database performance (service uses the same queries)
- Potential for service-level caching in the future
- Better query optimization opportunities at the service layer

## Migration Notes

- **No Breaking Changes**: API contract remains the same
- **Backwards Compatible**: All existing functionality preserved
- **Enhanced**: Better error handling and code organization

This refactor successfully modernizes the languages API while maintaining full backward compatibility and improving the overall architecture of the CMS platform.
