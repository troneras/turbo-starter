# Jurisdictions Troubleshooting Guide

This guide provides solutions to common issues encountered when working with the jurisdictions feature in the CMS platform.

## Common Issues and Solutions

### API Issues

#### 1. Cannot Create Jurisdiction - Code Already Exists

**Error:**
```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Jurisdiction with code \"UKGC\" already exists"
}
```

**Cause:** Jurisdiction codes must be unique across the system.

**Solutions:**
1. Check existing jurisdictions: `GET /api/jurisdictions?search=UKGC`
2. Use a different code or update the existing jurisdiction
3. If updating existing jurisdiction: `PUT /api/jurisdictions/{id}`

**Prevention:**
- Always check for existing jurisdictions before creating new ones
- Use descriptive, unique codes based on official regulator abbreviations

#### 2. Cannot Delete Jurisdiction - Referenced by Other Entities

**Error:**
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Cannot delete jurisdiction that is referenced by other entities (brands, translations, etc.)"
}
```

**Cause:** The jurisdiction is referenced by brands or translations and cannot be deleted due to foreign key constraints.

**Solutions:**
1. **Set status to inactive instead:**
   ```http
   PUT /api/jurisdictions/{id}
   Content-Type: application/json
   
   {
     "status": "inactive"
   }
   ```

2. **Remove references first:**
   - Unassign jurisdiction from all brands
   - Delete or reassign jurisdiction-specific translations
   - Then delete the jurisdiction

3. **Query to find references:**
   ```sql
   -- Find brand references
   SELECT b.name FROM brands b
   JOIN brand_jurisdictions bj ON b.id = bj.brand_id
   WHERE bj.jurisdiction_id = {jurisdiction_id};
   
   -- Find translation references
   SELECT COUNT(*) FROM translations
   WHERE jurisdiction_id = {jurisdiction_id};
   ```

#### 3. Permission Denied for Admin Operations

**Error:**
```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

**Cause:** User lacks admin role required for create/update/delete operations.

**Solutions:**
1. **Verify user roles:**
   ```http
   GET /api/auth/me
   Authorization: Bearer your-jwt-token
   ```

2. **Request admin access from system administrator**

3. **Check JWT token validity:**
   - Token may be expired
   - Token may not include admin role
   - Re-authenticate if necessary

#### 4. Invalid Jurisdiction Code Format

**Error:**
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Code must match pattern ^[A-Z0-9_-]+$"
}
```

**Cause:** Jurisdiction codes must follow specific format rules.

**Valid formats:**
- `UKGC` ✅
- `MGA` ✅
- `DGOJ_ES` ✅
- `TEST-123` ✅

**Invalid formats:**
- `ukgc` ❌ (lowercase)
- `test@code` ❌ (special characters)
- `test code` ❌ (spaces)
- `123!` ❌ (exclamation mark)

**Solution:** Update the code to match the required pattern (uppercase alphanumeric with underscores and hyphens only).

### UI Issues

#### 5. Search Not Returning Expected Results

**Symptoms:**
- Search returns no results for known jurisdictions
- Partial matches don't work
- Search seems slow or unresponsive

**Solutions:**

1. **Check search term format:**
   - Search is case-insensitive
   - Use partial matches (e.g., "gamb" for "gambling")
   - Search across code, name, and region fields

2. **Verify network connectivity:**
   ```javascript
   // Check browser network tab for failed requests
   // Look for 500 errors or network timeouts
   ```

3. **Clear browser cache:**
   - Hard refresh (Ctrl+F5 or Cmd+Shift+R)
   - Clear application cache
   - Check for service worker issues

4. **Check API response:**
   ```bash
   curl -X GET "http://localhost:3000/api/jurisdictions?search=test" \
     -H "Authorization: Bearer your-jwt-token"
   ```

#### 6. Bulk Actions Not Working

**Symptoms:**
- Bulk delete button is disabled
- Selection state is lost
- Bulk operations fail silently

**Solutions:**

1. **Verify selections:**
   - Ensure items are actually selected (checkboxes checked)
   - Check browser console for JavaScript errors
   - Verify admin permissions for bulk operations

2. **Check selection persistence:**
   ```javascript
   // Browser console - check selection state
   console.log('Selected jurisdictions:', 
     document.querySelectorAll('input[type="checkbox"]:checked').length
   );
   ```

3. **Review network requests:**
   - Check for failed bulk delete API calls
   - Verify proper request payload format
   - Look for authentication issues

#### 7. Form Validation Issues

**Symptoms:**
- Form won't submit despite appearing valid
- Validation errors don't clear
- Fields show incorrect validation state

**Solutions:**

1. **Check required fields:**
   - Code: Required, unique, uppercase format
   - Name: Required, minimum 1 character
   - Description: Optional
   - Status: Defaults to "active"
   - Region: Optional

2. **Clear form state:**
   - Close and reopen the dialog
   - Refresh the page
   - Clear browser storage if persistent

3. **Validate input format:**
   ```javascript
   // Test code format
   const codePattern = /^[A-Z0-9_-]+$/;
   console.log(codePattern.test('YOUR_CODE')); // Should be true
   ```

### Data Integrity Issues

#### 8. Duplicate Jurisdiction Codes After Import

**Symptoms:**
- Database constraints prevent operations
- Duplicate codes exist in different cases
- Import processes fail

**Solutions:**

1. **Find duplicates:**
   ```sql
   SELECT code, COUNT(*) as count
   FROM jurisdictions
   GROUP BY UPPER(code)
   HAVING COUNT(*) > 1;
   ```

2. **Resolve duplicates:**
   ```sql
   -- Update duplicate codes with suffixes
   UPDATE jurisdictions 
   SET code = code || '_' || id::text
   WHERE id IN (
     SELECT id FROM jurisdictions j1
     WHERE EXISTS (
       SELECT 1 FROM jurisdictions j2 
       WHERE j1.id != j2.id AND UPPER(j1.code) = UPPER(j2.code)
     )
   );
   ```

3. **Prevent future duplicates:**
   - Add case-insensitive unique constraint
   - Implement pre-import validation
   - Use database triggers for enforcement

#### 9. Orphaned Brand-Jurisdiction Relationships

**Symptoms:**
- References to non-existent jurisdictions
- Brands show invalid jurisdiction associations
- Content resolution fails

**Solutions:**

1. **Find orphaned relationships:**
   ```sql
   SELECT bj.* FROM brand_jurisdictions bj
   LEFT JOIN jurisdictions j ON bj.jurisdiction_id = j.id
   WHERE j.id IS NULL;
   ```

2. **Clean up orphaned records:**
   ```sql
   DELETE FROM brand_jurisdictions
   WHERE jurisdiction_id NOT IN (SELECT id FROM jurisdictions);
   ```

3. **Prevent orphaned relationships:**
   - Use proper foreign key constraints with CASCADE options
   - Implement referential integrity checks
   - Add database-level constraints

### Performance Issues

#### 10. Slow Jurisdiction Queries

**Symptoms:**
- List operations take excessive time
- Search queries timeout
- UI becomes unresponsive during operations

**Solutions:**

1. **Check database indexes:**
   ```sql
   -- Verify indexes exist
   SELECT indexname, indexdef FROM pg_indexes 
   WHERE tablename = 'jurisdictions';
   
   -- Add missing indexes if needed
   CREATE INDEX idx_jurisdictions_code ON jurisdictions(code);
   CREATE INDEX idx_jurisdictions_status ON jurisdictions(status);
   CREATE INDEX idx_jurisdictions_region ON jurisdictions(region);
   ```

2. **Optimize queries:**
   ```sql
   -- Use EXPLAIN ANALYZE to identify slow queries
   EXPLAIN ANALYZE SELECT * FROM jurisdictions 
   WHERE status = 'active' AND region LIKE '%Europe%';
   ```

3. **Implement pagination:**
   - Ensure proper page size limits (max 100)
   - Use offset/limit for large datasets
   - Consider cursor-based pagination for very large sets

4. **Enable caching:**
   - Verify Redis is running and configured
   - Check cache hit rates
   - Implement cache warming for common queries

#### 11. Memory Issues with Large Jurisdiction Lists

**Symptoms:**
- Browser becomes slow or crashes
- High memory usage in client
- Pagination not working properly

**Solutions:**

1. **Reduce page size:**
   ```http
   GET /api/jurisdictions?pageSize=20&page=1
   ```

2. **Implement virtual scrolling:**
   ```javascript
   // Use react-window or similar for large lists
   import { FixedSizeList } from 'react-window';
   ```

3. **Optimize component rendering:**
   ```javascript
   // Use React.memo for expensive components
   const JurisdictionRow = React.memo(({ jurisdiction }) => {
     // Component implementation
   });
   ```

## Debugging Techniques

### 1. API Debugging

**Enable Debug Logging:**
```bash
# Set environment variable
export LOG_LEVEL=debug

# Check logs
tail -f logs/api.log | grep jurisdiction
```

**Test API Endpoints:**
```bash
# Health check
curl http://localhost:3000/health

# Test authentication
curl -X GET http://localhost:3000/api/jurisdictions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -v

# Test specific endpoint
curl -X GET http://localhost:3000/api/jurisdictions/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### 2. Database Debugging

**Check Connection:**
```sql
SELECT current_database(), current_user, version();
```

**Verify Table Structure:**
```sql
\d jurisdictions
```

**Check Data Integrity:**
```sql
-- Verify no null required fields
SELECT COUNT(*) FROM jurisdictions WHERE code IS NULL OR name IS NULL;

-- Check status values
SELECT status, COUNT(*) FROM jurisdictions GROUP BY status;

-- Verify unique codes
SELECT code, COUNT(*) FROM jurisdictions GROUP BY code HAVING COUNT(*) > 1;
```

### 3. UI Debugging

**Browser Console:**
```javascript
// Check authentication state
console.log('Auth token:', localStorage.getItem('auth_token'));

// Check component state
console.log('Current filters:', JSON.stringify(filters));

// Test API calls
fetch('/api/jurisdictions', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(console.log);
```

**React DevTools:**
- Install React Developer Tools browser extension
- Inspect component state and props
- Monitor re-renders and performance

**Network Tab:**
- Monitor API requests and responses
- Check for failed requests or slow responses
- Verify request/response formats

## Best Practices for Prevention

### 1. Code Quality

**API Development:**
- Always validate input data with TypeBox schemas
- Implement comprehensive error handling
- Use transaction rollbacks for data consistency
- Add proper logging for debugging

**UI Development:**
- Implement proper loading states
- Handle edge cases (empty lists, network errors)
- Use TypeScript for type safety
- Test components in isolation

### 2. Testing

**Unit Tests:**
```javascript
// Test API endpoints
describe('Jurisdictions API', () => {
  it('should validate jurisdiction code format', () => {
    // Test implementation
  });
});

// Test React components
describe('JurisdictionForm', () => {
  it('should show validation errors', () => {
    // Test implementation
  });
});
```

**Integration Tests:**
```javascript
// Test full workflow
it('should create, update, and delete jurisdiction', async () => {
  // End-to-end test implementation
});
```

### 3. Monitoring

**Set Up Alerts:**
- API response time monitoring
- Error rate tracking
- Database performance metrics
- User experience monitoring

**Health Checks:**
```javascript
// Automated health checks
const healthCheck = async () => {
  try {
    const response = await fetch('/api/jurisdictions?pageSize=1');
    return response.ok;
  } catch (error) {
    return false;
  }
};
```

## Getting Help

### 1. Check Documentation
- [API Reference](/api/jurisdictions)
- [Development Guide](/guide/jurisdictions-development)
- [Data Model Documentation](/architecture/jurisdictions-data-model)

### 2. Review Logs
- API server logs: `logs/api.log`
- Database logs: Check PostgreSQL logs
- Browser console: Developer Tools > Console

### 3. Use Development Tools
- OpenAPI documentation: `http://localhost:3000/documentation`
- Database admin tools: pgAdmin, DBeaver
- API testing tools: Postman, Insomnia

### 4. Common Debug Commands

```bash
# Check API health
curl http://localhost:3000/health

# Test database connection
psql -h localhost -U postgres -d cms_platform -c "SELECT 1"

# Check Redis connection
redis-cli ping

# View recent logs
tail -n 100 logs/api.log

# Check jurisdiction data
psql -h localhost -U postgres -d cms_platform \
  -c "SELECT id, code, name, status FROM jurisdictions LIMIT 10"
```

By following this troubleshooting guide, most common issues with the jurisdictions feature can be quickly identified and resolved. For persistent issues, consider reaching out to the development team with specific error messages and reproduction steps.