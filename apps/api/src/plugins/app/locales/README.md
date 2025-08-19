# Locales Service

This service provides CRUD operations for managing locales in the CMS platform.

## Features

- List locales with pagination, search, and sorting
- Get all locales without pagination
- Get locale by ID or code
- Create new locales
- Update existing locales
- Delete locales
- Check locale usage and get statistics

## Usage

The locales service is automatically registered as a Fastify plugin and available as `fastify.locales`.

### Basic Operations

```typescript
// Get all locales
const allLocales = await fastify.locales.getAllLocales();

// Get locale by ID
const locale = await fastify.locales.getLocaleById(1);

// Get locale by code
const locale = await fastify.locales.getLocaleByCode("en-US");

// Create new locale
const newLocale = await fastify.locales.createLocale({
  code: "fr-CA",
  name: "French (Canada)",
});

// Update locale
const updatedLocale = await fastify.locales.updateLocale(1, {
  name: "English (United States) - Updated",
});

// Delete locale
await fastify.locales.deleteLocale(1);
```

### List with Pagination and Filtering

```typescript
// List with pagination and search
const result = await fastify.locales.listLocales(1, 20, {
  search: "English",
  sortBy: "name",
  sortDirection: "asc",
});

console.log(result.locales); // Array of locales
console.log(result.total); // Total count
console.log(result.page); // Current page
console.log(result.pageSize); // Page size
```

### Usage Statistics

```typescript
// Check if locale is in use
const inUse = await fastify.locales.isLocaleInUse(1);

// Get usage statistics
const stats = await fastify.locales.getLocaleStats(1);
console.log(stats.translationCount); // Number of translations using this locale
```

## Integration

The locales service is now integrated with the translations service. The `getLocales()` method in the translations repository now uses this service instead of hardcoded data.

## Dependencies

- `db` plugin (for database access)

## Database Schema

The service works with the `locales` table:

```sql
CREATE TABLE locales (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name TEXT NOT NULL
);
```
