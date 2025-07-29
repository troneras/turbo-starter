# Languages Feature E2E Tests

This directory contains comprehensive end-to-end tests for the Languages management feature in the admin interface.

## Test Structure

### Core Test Files

- **`languages.test.ts`** - Main comprehensive test suite covering all basic functionality
- **`languages-advanced.test.ts`** - Advanced scenarios, edge cases, and complex user workflows

### Helper Files

- **`e2e/helpers/languages-page-objects.ts`** - Page object classes for interacting with language management UI
- **`e2e/helpers/languages-fixtures.ts`** - Test data fixtures and validation scenarios
- **`e2e/helpers/languages-test-utils.ts`** - Utility classes for API interactions, browser control, and test assertions

## Test Coverage

### ✅ Core Functionality Covered

**Navigation & Access Control**
- Admin user access to languages page
- Editor/Translator user access restrictions (view-only)
- Sidebar navigation integration
- URL routing and state management

**Languages List Management**
- Display languages in table format
- Search functionality (by code and name)
- Case-insensitive search
- Real-time search filtering
- Pagination with large datasets
- Table sorting (by code and name, ascending/descending)
- Loading states during API calls
- Empty states when no languages exist
- Error states for API failures

**Language Creation (Admin Only)**
- Create language dialog functionality
- Form validation (required fields, code format)
- Language code format validation (xx-XX pattern)
- Duplicate language code prevention
- Successful language creation and list refresh
- Form reset after creation
- Cancel operation without saving

**Language Editing (Admin Only)**
- Edit dialog with pre-populated data
- Partial updates (code only, name only, both)
- Validation during editing process
- Successful updates with list refresh
- Cancel editing without saving changes

**Language Deletion (Admin Only)**
- Single language deletion with confirmation dialog
- Bulk language selection and deletion
- Confirmation dialogs for destructive operations
- Error handling for deletion conflicts
- List refresh after successful deletion

**Bulk Operations (Admin Only)**
- Multiple language selection (individual and select-all)
- Selection state management across operations
- Bulk delete with confirmation
- Clear selection functionality
- Selection persistence during UI operations

### ✅ Advanced Scenarios Covered

**Form Validation Edge Cases**
- All invalid language code formats (empty, wrong pattern, special characters)
- Name field validation (empty, too long, special characters)
- Real-time validation feedback
- Duplicate code detection and handling
- Special characters in language names

**Pagination Edge Cases**
- Large datasets requiring multiple pages
- Search results spanning multiple pages
- Deleting last item on a page
- Navigation between pages with maintained state

**Bulk Operations Edge Cases**
- Selection across multiple pages
- Mixed success/failure in bulk operations
- Selection state after individual operations
- Concurrent user modifications

**Error Handling & Recovery**
- Network connectivity issues
- API server errors (500, 401, 403, 400)
- Malformed API responses
- Browser refresh during operations
- JavaScript errors and recovery
- Timeout handling

**Performance & Reliability**
- Page load time validation
- Search response time measurement
- Rapid operation handling
- Data consistency during concurrent operations

**Accessibility & Usability**
- Keyboard navigation support
- ARIA labels and roles
- Tab order and focus management
- Dialog keyboard shortcuts (ESC to close)

**Responsive Design**
- Desktop table layout (1024px+)
- Mobile card layout (375px)
- Tablet breakpoint behavior (768px)
- Viewport size handling

**Browser State Management**
- URL parameter persistence (search terms)
- Browser back/forward navigation
- Page refresh state recovery
- Deep linking to filtered views

## Running the Tests

### Prerequisites

1. **Development Environment Setup**
   ```bash
   # Start the development server
   bun run dev
   
   # Ensure API server is running on port 3000
   # Ensure admin UI is accessible at http://localhost:3000
   ```

2. **Test Mode Configuration**
   ```bash
   # Enable test mode (bypasses MSAL authentication)
   export VITE_TEST_MODE=true
   ```

### Running All Languages Tests

```bash
# Run all languages e2e tests
bun run test:e2e languages

# Run with visible browser (for debugging)
HEADLESS=false bun run test:e2e languages

# Run specific test file
bun run test:e2e languages.test.ts
bun run test:e2e languages-advanced.test.ts
```

### Running Specific Test Suites

```bash
# Run only navigation and access control tests
bun run test:e2e languages.test.ts -t "Navigation and Access Control"

# Run only CRUD operation tests
bun run test:e2e languages.test.ts -t "Language Creation"

# Run only advanced validation tests
bun run test:e2e languages-advanced.test.ts -t "Advanced Form Validation"
```

### Debugging Test Failures

```bash
# Run with debugging options
HEADLESS=false SLOW_MO=500 DEVTOOLS=true bun run test:e2e languages.test.ts

# Take screenshots on failure
DEBUG_SCREENSHOTS=true bun run test:e2e languages
```

## Test Data Management

### Automatic Cleanup
- Tests automatically clean up created test languages after each test
- Test languages are identified by naming patterns (`test-*`, `bulk-*`, `page-*`)
- Cleanup runs in `afterEach` hooks to prevent data pollution

### Test Language Patterns
- **Creation Tests**: `test-create-*`
- **Editing Tests**: `test-edit-*`
- **Bulk Tests**: `bulk-*`
- **Pagination Tests**: `page-*`
- **Search Tests**: `searchable-*`

### Manual Cleanup
If tests fail and leave test data behind:

```bash
# Clean up via API (requires admin JWT)
curl -X GET http://localhost:3000/api/languages \
  -H "Authorization: Bearer <admin-jwt>" | \
  jq '.languages[] | select(.name | contains("test")) | .id' | \
  xargs -I {} curl -X DELETE http://localhost:3000/api/languages/{} \
  -H "Authorization: Bearer <admin-jwt>"
```

## Test Authentication

Tests use the project's test authentication system:

- **Admin User**: Full access to all language management features
- **Editor User**: Read-only access, no create/edit/delete capabilities
- **Translator User**: Read-only access, same as editor

Test users are automatically created with proper roles and permissions.

## Common Issues & Troubleshooting

### Test Timeouts
```bash
# Increase timeout for slow operations
TIMEOUT=30000 bun run test:e2e languages
```

### Network Issues
```bash
# Check if API server is running
curl http://localhost:3000/api/health

# Check if admin UI is accessible
curl http://localhost:3000
```

### Authentication Failures
```bash
# Verify test mode is enabled
echo $VITE_TEST_MODE

# Check test users endpoint
curl http://localhost:3000/api/test-users
```

### Page Object Failures
- Ensure UI components have stable selectors
- Check for timing issues with dynamic content
- Verify element visibility states

## Test Metrics & Expectations

### Performance Benchmarks
- **Page Load**: < 5 seconds
- **Search Response**: < 2 seconds
- **Form Submission**: < 2 seconds
- **Bulk Operations**: < 5 seconds

### Reliability Targets
- **Test Pass Rate**: > 95%
- **False Positive Rate**: < 2%
- **Test Execution Time**: < 10 minutes for full suite

### Coverage Goals
- **UI Interactions**: 100% of user-facing features
- **Error Scenarios**: All major error paths
- **Edge Cases**: Common edge cases and boundary conditions
- **Browser Support**: Desktop Chrome (primary), responsive design validation

## Contributing to Language Tests

### Adding New Tests

1. **Basic Tests**: Add to `languages.test.ts`
2. **Complex Scenarios**: Add to `languages-advanced.test.ts`
3. **New Page Objects**: Extend classes in `languages-page-objects.ts`
4. **Test Data**: Add fixtures to `languages-fixtures.ts`

### Test Naming Conventions

```typescript
describe('Feature Area', () => {
  it('should perform specific action under specific conditions', async () => {
    // Test implementation
  });
});
```

### Best Practices

1. **Data Isolation**: Each test should clean up its own data
2. **Stable Selectors**: Use semantic selectors over CSS classes
3. **Wait Strategies**: Always wait for elements to be ready
4. **Error Handling**: Include proper error handling and timeouts
5. **Documentation**: Comment complex test logic

## Integration with CI/CD

These tests are designed to run in continuous integration environments:

- **Headless Mode**: Default for CI environments
- **Parallel Execution**: Tests can run in parallel with proper data isolation
- **Retry Logic**: Built-in retry for flaky network operations
- **Report Generation**: Compatible with standard test reporting tools

## Future Enhancements

### Planned Improvements
- Visual regression testing for UI components
- API contract testing integration
- Multi-browser compatibility testing
- Performance regression detection
- Accessibility audit automation

### Monitoring & Analytics
- Test execution metrics tracking
- Failure pattern analysis
- Performance trend monitoring
- User journey completion rates