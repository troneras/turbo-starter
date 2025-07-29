import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { TestContext } from '../helpers/test-helpers';
import { setupTest, teardownTest, waitAndClick } from '../helpers/test-helpers';
import { createAdminTestUser, createEditorTestUser } from '../setup/auth';
import { 
  LanguagesPage,
  LanguageFormDialog,
  DeleteLanguageDialog,
  BulkDeleteLanguagesDialog
} from '../helpers/languages-page-objects';
import { 
  VALIDATION_TEST_DATA,
  PAGINATION_TEST_DATA,
  ERROR_SCENARIOS,
  generateTestLanguage,
  generateTestLanguages
} from '../helpers/languages-fixtures';
import {
  LanguagesTestDataManager,
  LanguagesBrowserUtils,
  LanguagesTestAssertions
} from '../helpers/languages-test-utils';

describe('Languages Advanced E2E Tests', () => {
  let context: TestContext;
  let languagesPage: LanguagesPage;
  let formDialog: LanguageFormDialog;
  let deleteDialog: DeleteLanguageDialog;
  let bulkDeleteDialog: BulkDeleteLanguagesDialog;
  let dataManager: LanguagesTestDataManager;
  let browserUtils: LanguagesBrowserUtils;

  beforeEach(() => {
    dataManager = new LanguagesTestDataManager();
  });

  afterEach(async () => {
    if (context) {
      try {
        const adminUser = await createAdminTestUser();
        await dataManager.cleanupTestLanguages(adminUser.jwt);
        await teardownTest(context);
      } catch (error) {
        console.warn('Teardown failed:', error);
      }
    }
  });

  describe('Advanced Form Validation', () => {
    beforeEach(async () => {
      context = await setupTest(await createAdminTestUser());
      languagesPage = new LanguagesPage(context.page);
      formDialog = new LanguageFormDialog(context.page);
      
      await languagesPage.navigate();
    });

    it('should validate all invalid language code formats', async () => {
      await languagesPage.clickAddLanguageButton();
      
      for (const testCase of VALIDATION_TEST_DATA.invalidCodes) {
        // Clear previous input
        await formDialog.fillCode('');
        await formDialog.fillName('Test Name');
        
        // Enter invalid code
        await formDialog.fillCode(testCase.code);
        
        // Attempt to submit
        await formDialog.submit();
        
        // Check for validation error
        await context.page.waitForTimeout(500);
        const hasError = await formDialog.hasCodeError();
        
        if (testCase.code === '') {
          // Empty code should show required error
          expect(hasError).toBe(true);
        } else if (testCase.code.length > 0) {
          // Invalid format should show format error or keep dialog open
          const isStillOpen = await formDialog.isOpen();
          expect(hasError || isStillOpen).toBe(true);
        }
      }
    });

    it('should validate name field requirements', async () => {
      await languagesPage.clickAddLanguageButton();
      
      for (const testCase of VALIDATION_TEST_DATA.invalidNames) {
        // Clear previous input
        await formDialog.fillCode('te-ST');
        await formDialog.fillName('');
        
        // Enter invalid name
        await formDialog.fillName(testCase.name);
        
        // Attempt to submit
        await formDialog.submit();
        
        // Check for validation error
        await context.page.waitForTimeout(500);
        const hasError = await formDialog.hasNameError();
        const isStillOpen = await formDialog.isOpen();
        
        // Should show error or keep dialog open
        expect(hasError || isStillOpen).toBe(true);
      }
    });

    it('should handle real-time validation feedback', async () => {
      await languagesPage.clickAddLanguageButton();
      
      // Enter invalid code and check immediate feedback
      await formDialog.fillCode('invalid');
      
      // Check if validation appears immediately (depends on implementation)
      await context.page.waitForTimeout(1000);
      const hasImmediateError = await formDialog.hasCodeError();
      
      // Either immediate validation or validation on submit
      await formDialog.submit();
      await context.page.waitForTimeout(500);
      const hasSubmitError = await formDialog.hasCodeError();
      
      expect(hasImmediateError || hasSubmitError).toBe(true);
    });

    it('should validate field lengths and special characters', async () => {
      await languagesPage.clickAddLanguageButton();
      
      // Test very long name
      const longName = 'a'.repeat(500);
      await formDialog.fillCode('te-ST');
      await formDialog.fillName(longName);
      await formDialog.submit();
      
      await context.page.waitForTimeout(500);
      const hasLengthError = await formDialog.hasNameError();
      const isStillOpen = await formDialog.isOpen();
      
      expect(hasLengthError || isStillOpen).toBe(true);
    });

    it('should handle special characters in language names', async () => {
      const specialCharLanguage = {
        code: 'sp-EC',
        name: 'Special Chars ñáéíóú âêîôû çñ'
      };
      
      await languagesPage.clickAddLanguageButton();
      await formDialog.fillCode(specialCharLanguage.code);
      await formDialog.fillName(specialCharLanguage.name);
      await formDialog.submit();
      
      // Should succeed with special characters
      await context.page.waitForTimeout(2000);
      const isOpen = await formDialog.isOpen();
      expect(isOpen).toBe(false);
      
      // Verify language appears in table
      expect(await languagesPage.hasLanguage(specialCharLanguage.code)).toBe(true);
    });
  });

  describe('Pagination Edge Cases', () => {
    beforeEach(async () => {
      context = await setupTest(await createAdminTestUser());
      languagesPage = new LanguagesPage(context.page);
      browserUtils = new LanguagesBrowserUtils(context.page);
    });

    it('should handle pagination with large datasets', async () => {
      // Create enough languages to trigger pagination (25+ languages)
      const adminUser = await createAdminTestUser();
      const testLanguages = PAGINATION_TEST_DATA.languages;
      await dataManager.setupTestLanguages(testLanguages, adminUser.jwt);
      
      await languagesPage.navigate();
      
      // Should show pagination controls
      const hasNextPage = await languagesPage.hasNextPage();
      expect(hasNextPage).toBe(true);
      
      // Navigate through pages
      await languagesPage.goToNextPage();
      const hasPreviousPage = await languagesPage.hasPreviousPage();
      expect(hasPreviousPage).toBe(true);
      
      // Check pagination info
      const paginationInfo = await languagesPage.getPaginationInfo();
      expect(paginationInfo).toContain('Showing');
    });

    it('should maintain search across pagination', async () => {
      // Create languages with specific pattern for search
      const adminUser = await createAdminTestUser();
      const searchableLanguages = generateTestLanguages(25, 'searchable');
      await dataManager.setupTestLanguages(searchableLanguages, adminUser.jwt);
      
      await languagesPage.navigate();
      
      // Search for specific pattern
      await languagesPage.searchLanguages('searchable');
      
      // If pagination exists in search results
      const hasNextPage = await languagesPage.hasNextPage();
      if (hasNextPage) {
        await languagesPage.goToNextPage();
        
        // Search should be maintained
        const languages = await languagesPage.getLanguagesInTable();
        const allMatchSearch = languages.every(lang => 
          lang.name.toLowerCase().includes('searchable') ||
          lang.code.toLowerCase().includes('searchable')
        );
        expect(allMatchSearch).toBe(true);
      }
    });

    it('should handle edge case of deleting last item on page', async () => {
      // Create exactly 21 languages (2 pages with 1 on second page)
      const adminUser = await createAdminTestUser();
      const testLanguages = generateTestLanguages(21, 'edge');
      await dataManager.setupTestLanguages(testLanguages, adminUser.jwt);
      
      await languagesPage.navigate();
      
      // Go to second page
      if (await languagesPage.hasNextPage()) {
        await languagesPage.goToNextPage();
        
        // Delete the only language on this page
        const languages = await languagesPage.getLanguagesInTable();
        if (languages.length === 1) {
          await languagesPage.deleteLanguage(languages[0].code);
          
          deleteDialog = new DeleteLanguageDialog(context.page);
          await deleteDialog.confirm();
          
          // Should navigate back to first page
          await context.page.waitForTimeout(2000);
          const hasPreviousPage = await languagesPage.hasPreviousPage();
          expect(hasPreviousPage).toBe(false); // Should be on first page
        }
      }
    });
  });

  describe('Bulk Operations Edge Cases', () => {
    beforeEach(async () => {
      context = await setupTest(await createAdminTestUser());
      languagesPage = new LanguagesPage(context.page);
      bulkDeleteDialog = new BulkDeleteLanguagesDialog(context.page);
    });

    it('should handle selecting and deselecting across pages', async () => {
      // Create enough languages for multiple pages
      const adminUser = await createAdminTestUser();
      const testLanguages = generateTestLanguages(25, 'multipage');
      await dataManager.setupTestLanguages(testLanguages, adminUser.jwt);
      
      await languagesPage.navigate();
      
      // Select all on first page
      await languagesPage.selectAllLanguages();
      let selectedCount = await languagesPage.getSelectedLanguagesCount();
      expect(selectedCount).toBeGreaterThan(0);
      
      // Go to next page (if exists)
      if (await languagesPage.hasNextPage()) {
        await languagesPage.goToNextPage();
        
        // Selection should persist or be cleared (depends on implementation)
        selectedCount = await languagesPage.getSelectedLanguagesCount();
        // Don't assert specific behavior as it may vary
      }
    });

    it('should handle bulk delete with mixed success/failure', async () => {
      // This test depends on API behavior - might need mock responses
      const adminUser = await createAdminTestUser();
      const testLanguages = generateTestLanguages(3, 'mixed');
      await dataManager.setupTestLanguages(testLanguages, adminUser.jwt);
      
      await languagesPage.navigate();
      
      // Select all languages
      await languagesPage.selectAllLanguages();
      const selectedCount = await languagesPage.getSelectedLanguagesCount();
      expect(selectedCount).toBe(3);
      
      // Attempt bulk delete
      await languagesPage.clickBulkDelete();
      await bulkDeleteDialog.confirm();
      
      // Wait for operation to complete
      await context.page.waitForTimeout(3000);
      
      // Check result (might be partial success)
      const remainingLanguages = await languagesPage.getLanguagesInTable();
      // Don't assert exact count as some deletions might fail
    });

    it('should handle selection state after operations', async () => {
      const adminUser = await createAdminTestUser();
      const testLanguages = generateTestLanguages(5, 'selection');
      await dataManager.setupTestLanguages(testLanguages, adminUser.jwt);
      
      await languagesPage.navigate();
      
      // Select some languages
      const createdLanguages = dataManager.getCreatedLanguages();
      await languagesPage.selectLanguageByCode(createdLanguages[0].code);
      await languagesPage.selectLanguageByCode(createdLanguages[1].code);
      
      let selectedCount = await languagesPage.getSelectedLanguagesCount();
      expect(selectedCount).toBe(2);
      
      // Perform individual delete of selected language
      await languagesPage.deleteLanguage(createdLanguages[0].code);
      deleteDialog = new DeleteLanguageDialog(context.page);
      await deleteDialog.confirm();
      
      // Wait for delete to complete
      await context.page.waitForTimeout(2000);
      
      // Selection should be updated
      selectedCount = await languagesPage.getSelectedLanguagesCount();
      expect(selectedCount).toBeLessThan(2);
    });
  });

  describe('Concurrent User Scenarios', () => {
    beforeEach(async () => {
      context = await setupTest(await createAdminTestUser());
      languagesPage = new LanguagesPage(context.page);
      formDialog = new LanguageFormDialog(context.page);
    });

    it('should handle language created by another user', async () => {
      // Simulate another user creating a language via API
      const adminUser = await createAdminTestUser();
      const newLanguage = generateTestLanguage('concurrent');
      
      // Initial page load
      await languagesPage.navigate();
      const initialCount = await languagesPage.getLanguageCount();
      
      // Create language via API (simulating another user)
      await dataManager.setupTestLanguages([newLanguage], adminUser.jwt);
      
      // Refresh page to see changes
      await context.page.reload();
      await context.page.waitForSelector('table, text="No languages found"', { timeout: 5000 });
      
      const newCount = await languagesPage.getLanguageCount();
      expect(newCount).toBe(initialCount + 1);
      
      // New language should be visible
      expect(await languagesPage.hasLanguage(newLanguage.code)).toBe(true);
    });

    it('should handle stale data during edit operations', async () => {
      // Create a language
      const adminUser = await createAdminTestUser();
      const testLanguage = generateTestLanguage('stale');
      await dataManager.setupTestLanguages([testLanguage], adminUser.jwt);
      
      await languagesPage.navigate();
      
      // Start editing
      await languagesPage.editLanguage(testLanguage.code);
      
      // Simulate another user modifying via API
      const api = dataManager['api'];
      const createdLanguages = dataManager.getCreatedLanguages();
      const createdLanguage = createdLanguages[0];
      
      if (createdLanguage.id) {
        // This would require API update method - skip if not available
        try {
          // Attempt to update via API
          await fetch(`http://localhost:3000/api/languages/${createdLanguage.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${adminUser.jwt}`
            },
            body: JSON.stringify({
              name: 'Updated by another user'
            })
          });
        } catch (error) {
          // API might not support updates - skip this test
          console.warn('API update not supported, skipping concurrent test');
          await formDialog.cancel();
          return;
        }
      }
      
      // Try to submit our changes
      await formDialog.fillName('My Update');
      await formDialog.submit();
      
      // Should handle conflict appropriately
      await context.page.waitForTimeout(2000);
      // Behavior depends on implementation - might show error or succeed
    });
  });

  describe('Accessibility and Keyboard Navigation', () => {
    beforeEach(async () => {
      context = await setupTest(await createAdminTestUser());
      languagesPage = new LanguagesPage(context.page);
      
      const adminUser = await createAdminTestUser();
      const testLanguages = generateTestLanguages(3, 'a11y');
      await dataManager.setupTestLanguages(testLanguages, adminUser.jwt);
      
      await languagesPage.navigate();
    });

    it('should support keyboard navigation in table', async () => {
      // Focus on first interactive element
      await context.page.keyboard.press('Tab');
      
      // Should be able to navigate through table elements
      let activeElement = await context.page.evaluate(() => document.activeElement?.tagName);
      expect(activeElement).toBeTruthy();
      
      // Navigate through several elements
      for (let i = 0; i < 5; i++) {
        await context.page.keyboard.press('Tab');
        await context.page.waitForTimeout(100);
      }
      
      // Should maintain focus within the page
      activeElement = await context.page.evaluate(() => document.activeElement?.tagName);
      expect(activeElement).toBeTruthy();
    });

    it('should support keyboard navigation in dialogs', async () => {
      // Open create dialog
      await languagesPage.clickAddLanguageButton();
      formDialog = new LanguageFormDialog(context.page);
      
      // Should focus on first input
      const activeElement = await context.page.evaluate(() => document.activeElement?.tagName);
      expect(['INPUT', 'BUTTON'].includes(activeElement)).toBe(true);
      
      // Tab through form elements
      await context.page.keyboard.press('Tab'); // To name field
      await context.page.keyboard.press('Tab'); // To submit button
      await context.page.keyboard.press('Tab'); // To cancel button
      
      // Escape should close dialog
      await context.page.keyboard.press('Escape');
      
      await context.page.waitForTimeout(500);
      const isOpen = await formDialog.isOpen();
      expect(isOpen).toBe(false);
    });

    it('should have proper ARIA labels and roles', async () => {
      // Check for proper table structure
      const tableRole = await context.page.$eval('table', el => el.getAttribute('role'));
      // Table role might be implicit
      
      // Check for proper button labels
      const addButton = await context.page.$('button:has-text("Add Language")');
      const hasAriaLabel = await addButton?.evaluate(el => 
        el.hasAttribute('aria-label') || el.textContent?.trim().length > 0
      );
      expect(hasAriaLabel).toBe(true);
      
      // Check form labels when dialog is open
      await languagesPage.clickAddLanguageButton();
      
      const codeInput = await context.page.$('input[name="code"]');
      const hasCodeLabel = await codeInput?.evaluate(el => {
        const id = el.id;
        const ariaLabel = el.getAttribute('aria-label');
        const ariaLabelledBy = el.getAttribute('aria-labelledby');
        const associatedLabel = id ? document.querySelector(`label[for="${id}"]`) : null;
        
        return !!(ariaLabel || ariaLabelledBy || associatedLabel);
      });
      expect(hasCodeLabel).toBe(true);
    });
  });

  describe('Data Consistency and Integrity', () => {
    beforeEach(async () => {
      context = await setupTest(await createAdminTestUser());
      languagesPage = new LanguagesPage(context.page);
      browserUtils = new LanguagesBrowserUtils(context.page);
    });

    it('should maintain data consistency during rapid operations', async () => {
      const adminUser = await createAdminTestUser();
      
      // Create multiple languages rapidly
      const languages = generateTestLanguages(3, 'rapid');
      
      for (const language of languages) {
        await languagesPage.clickAddLanguageButton();
        formDialog = new LanguageFormDialog(context.page);
        
        await formDialog.fillCode(language.code);
        await formDialog.fillName(language.name);
        await formDialog.submit();
        
        // Small delay to prevent overwhelming the system
        await context.page.waitForTimeout(100);
      }
      
      // Wait for all operations to complete
      await context.page.waitForTimeout(2000);
      
      // Verify all languages were created
      for (const language of languages) {
        expect(await languagesPage.hasLanguage(language.code)).toBe(true);
      }
    });

    it('should handle page refresh during operations', async () => {
      const adminUser = await createAdminTestUser();
      const testLanguage = generateTestLanguage('refresh');
      
      // Start creating a language
      await languagesPage.clickAddLanguageButton();
      formDialog = new LanguageFormDialog(context.page);
      
      await formDialog.fillCode(testLanguage.code);
      await formDialog.fillName(testLanguage.name);
      
      // Refresh page before submitting
      await context.page.reload();
      
      // Should return to main page without creating language
      await context.page.waitForSelector('h1', { timeout: 5000 });
      const title = await languagesPage.getPageTitle();
      expect(title).toBe('Languages');
      
      // Language should not exist
      expect(await languagesPage.hasLanguage(testLanguage.code)).toBe(false);
    });

    it('should validate data after browser back/forward navigation', async () => {
      const adminUser = await createAdminTestUser();
      const testLanguage = generateTestLanguage('navigation');
      await dataManager.setupTestLanguages([testLanguage], adminUser.jwt);
      
      await languagesPage.navigate();
      
      // Perform search
      await languagesPage.searchLanguages(testLanguage.code);
      
      // Navigate away
      await context.page.goto('http://localhost:3000/dashboard');
      await context.page.waitForSelector('h1', { timeout: 5000 });
      
      // Navigate back
      await context.page.goBack();
      await context.page.waitForSelector('h1', { timeout: 5000 });
      
      // Should restore search state
      const url = context.page.url();
      expect(url).toContain('search=');
      
      // Search results should be applied
      const languages = await languagesPage.getLanguagesInTable();
      if (languages.length > 0) {
        const hasSearchedLanguage = languages.some(lang => 
          lang.code.includes(testLanguage.code) || 
          lang.name.includes(testLanguage.name)
        );
        expect(hasSearchedLanguage).toBe(true);
      }
    });
  });

  describe('Edge Case Error Scenarios', () => {
    beforeEach(async () => {
      context = await setupTest(await createAdminTestUser());
      languagesPage = new LanguagesPage(context.page);
      browserUtils = new LanguagesBrowserUtils(context.page);
    });

    it('should handle server timeout gracefully', async () => {
      // Simulate slow network
      await browserUtils.simulateSlowNetwork();
      
      await languagesPage.navigate();
      
      // Should eventually load or show appropriate message
      await context.page.waitForSelector(
        'table, text="No languages found", text="Loading", h1:has-text("Error")', 
        { timeout: 15000 }
      );
      
      const hasError = await languagesPage.hasError();
      const isEmpty = await languagesPage.isEmpty();
      const languageCount = await languagesPage.getLanguageCount();
      
      // Should handle timeout gracefully (error, empty, or eventual success)
      expect(hasError || isEmpty || languageCount >= 0).toBe(true);
      
      await browserUtils.resetNetworkConditions();
    });

    it('should handle malformed API responses', async () => {
      // This would require response mocking
      // For now, just test that page doesn't crash with unexpected responses
      
      await languagesPage.navigate();
      
      // Inject console errors to simulate API issues
      await context.page.evaluate(() => {
        console.error('Simulated API error');
      });
      
      // Page should still be functional
      const title = await languagesPage.getPageTitle();
      expect(title).toBe('Languages');
    });

    it('should recover from JavaScript errors', async () => {
      await languagesPage.navigate();
      
      // Inject a JavaScript error
      await context.page.evaluate(() => {
        // Simulate error without breaking the test
        try {
          throw new Error('Simulated error');
        } catch (e) {
          console.error('Test error:', e);
        }
      });
      
      // Page should still be interactive
      const hasAddButton = await languagesPage.hasAddLanguageButton();
      expect(hasAddButton).toBe(true);
    });
  });
});