import type { TestLanguage } from './languages-page-objects';

/**
 * Test language fixtures for E2E testing
 */
export const TEST_LANGUAGES: Record<string, TestLanguage> = {
  english: {
    code: 'en-US',
    name: 'English (United States)'
  },
  french: {
    code: 'fr-FR',
    name: 'French (France)'
  },
  spanish: {
    code: 'es-ES',
    name: 'Spanish (Spain)'
  },
  german: {
    code: 'de-DE',
    name: 'German (Germany)'
  },
  japanese: {
    code: 'ja-JP',
    name: 'Japanese (Japan)'
  },
  portuguese: {
    code: 'pt-BR',
    name: 'Portuguese (Brazil)'
  },
  italian: {
    code: 'it-IT',
    name: 'Italian (Italy)'
  },
  dutch: {
    code: 'nl-NL',
    name: 'Dutch (Netherlands)'
  },
  korean: {
    code: 'ko-KR',
    name: 'Korean (South Korea)'
  },
  chinese: {
    code: 'zh-CN',
    name: 'Chinese (Simplified)'
  }
};

/**
 * Generate a unique test language for testing
 */
export function generateTestLanguage(prefix = 'test'): TestLanguage {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  
  return {
    code: `${prefix.substring(0, 2).toLowerCase()}-${randomSuffix.substring(0, 2).toUpperCase()}`,
    name: `${prefix} Language ${timestamp}`
  };
}

/**
 * Generate multiple unique test languages
 */
export function generateTestLanguages(count: number, prefix = 'test'): TestLanguage[] {
  const languages: TestLanguage[] = [];
  
  for (let i = 0; i < count; i++) {
    const timestamp = Date.now() + i;
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    
    languages.push({
      code: `t${i}-${randomSuffix.substring(0, 2).toUpperCase()}`,
      name: `${prefix} Language ${i + 1} (${timestamp})`
    });
  }
  
  return languages;
}

/**
 * Test data for form validation testing
 */
export const VALIDATION_TEST_DATA = {
  invalidCodes: [
    { code: '', name: 'Empty Code', expectedError: 'Code is required' },
    { code: 'en', name: 'Short Code', expectedError: 'Code must be in format xx-XX' },
    { code: 'en-us', name: 'Lowercase Country', expectedError: 'Code must be in format xx-XX' },
    { code: 'EN-US', name: 'Uppercase Language', expectedError: 'Code must be in format xx-XX' },
    { code: 'eng-US', name: 'Long Language Code', expectedError: 'Code must be in format xx-XX' },
    { code: 'en-USA', name: 'Long Country Code', expectedError: 'Code must be in format xx-XX' },
    { code: 'en_US', name: 'Underscore Separator', expectedError: 'Code must be in format xx-XX' },
    { code: 'en US', name: 'Space Separator', expectedError: 'Code must be in format xx-XX' },
    { code: '12-34', name: 'Numeric Code', expectedError: 'Code must be in format xx-XX' },
    { code: 'e1-U2', name: 'Mixed Alphanumeric', expectedError: 'Code must be in format xx-XX' }
  ],
  invalidNames: [
    { code: 'te-ST', name: '', expectedError: 'Name is required' },
    { code: 'te-ST', name: '   ', expectedError: 'Name is required' },
    { code: 'te-ST', name: 'a'.repeat(256), expectedError: 'Name is too long' }
  ],
  duplicateCodes: [
    { code: 'en-US', name: 'Duplicate English' },
    { code: 'fr-FR', name: 'Duplicate French' }
  ]
};

/**
 * Test scenarios for search functionality
 */
export const SEARCH_TEST_SCENARIOS = [
  {
    description: 'Search by language code',
    searchTerm: 'en-US',
    expectedResults: ['en-US']
  },
  {
    description: 'Search by partial code',
    searchTerm: 'en',
    expectedResults: ['en-US', 'en-GB'] // Would match both if they exist
  },
  {
    description: 'Search by language name',
    searchTerm: 'English',
    expectedResults: ['en-US', 'en-GB'] // All English variants
  },
  {
    description: 'Search by partial name',
    searchTerm: 'Eng',
    expectedResults: ['en-US', 'en-GB']
  },
  {
    description: 'Case insensitive search',
    searchTerm: 'english',
    expectedResults: ['en-US', 'en-GB']
  },
  {
    description: 'Search with no results',
    searchTerm: 'xyz-ZY',
    expectedResults: []
  },
  {
    description: 'Search with special characters',
    searchTerm: 'Français',
    expectedResults: ['fr-FR']
  }
];

/**
 * Test data for bulk operations
 */
export const BULK_OPERATION_TEST_DATA = {
  smallBatch: generateTestLanguages(3, 'bulk'),
  mediumBatch: generateTestLanguages(10, 'bulk'),
  largeBatch: generateTestLanguages(25, 'bulk')
};

/**
 * Test data for pagination testing
 */
export const PAGINATION_TEST_DATA = {
  languages: generateTestLanguages(45, 'page'), // More than 2 pages (20 per page)
  expectedPages: 3,
  pageSize: 20
};

/**
 * Test user permissions for different roles
 */
export const ROLE_PERMISSIONS = {
  admin: {
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canBulkDelete: true,
    canView: true
  },
  editor: {
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canBulkDelete: false,
    canView: true
  },
  translator: {
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canBulkDelete: false,
    canView: true
  }
};

/**
 * Error scenarios for testing
 */
export const ERROR_SCENARIOS = {
  networkError: {
    description: 'Network connection failed',
    mockResponse: null,
    expectedMessage: 'Failed to load languages'
  },
  serverError: {
    description: 'Internal server error',
    mockResponse: { status: 500, body: { error: 'Internal server error' } },
    expectedMessage: 'Failed to load languages'
  },
  unauthorized: {
    description: 'Unauthorized access',
    mockResponse: { status: 401, body: { error: 'Unauthorized' } },
    expectedMessage: 'Unauthorized'
  },
  forbidden: {
    description: 'Forbidden operation',
    mockResponse: { status: 403, body: { error: 'Forbidden' } },
    expectedMessage: 'Forbidden'
  },
  validationError: {
    description: 'Validation failed',
    mockResponse: { 
      status: 400, 
      body: { 
        error: 'Validation failed',
        details: [
          { field: 'code', message: 'Code already exists' }
        ]
      }
    },
    expectedMessage: 'Code already exists'
  }
};

/**
 * Response time expectations for performance testing
 */
export const PERFORMANCE_EXPECTATIONS = {
  pageLoad: 3000, // 3 seconds
  searchResponse: 1000, // 1 second
  formSubmission: 2000, // 2 seconds
  bulkOperation: 5000 // 5 seconds
};

/**
 * Responsive design breakpoints
 */
export const RESPONSIVE_BREAKPOINTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1024, height: 768 },
  largeDesktop: { width: 1440, height: 900 }
};

/**
 * Common selectors used across tests
 */
export const SELECTORS = {
  pageTitle: 'h1',
  searchInput: 'input[placeholder*="Search"]',
  addButton: 'button:has-text("Add Language")',
  table: 'table',
  mobileCards: '.md\\:hidden [class*="border"]',
  loadingState: 'text="Loading languages..."',
  emptyState: 'text="No languages found"',
  errorState: 'h1:has-text("Error Loading Languages")',
  
  // Form selectors
  dialog: '[role="dialog"]',
  codeInput: 'input[name="code"]',
  nameInput: 'input[name="name"]',
  submitButton: '[role="dialog"] button[type="submit"]',
  cancelButton: '[role="dialog"] button:has-text("Cancel")',
  
  // Bulk operations
  selectAllCheckbox: 'thead input[type="checkbox"]',
  rowCheckbox: 'tbody input[type="checkbox"]',
  bulkDeleteButton: 'button:has-text("Delete Selected")',
  clearSelectionButton: 'button:has-text("Clear Selection")',
  
  // Pagination
  nextButton: 'button:has-text("Next")',
  previousButton: 'button:has-text("Previous")',
  paginationInfo: 'p:has-text("Showing")'
};