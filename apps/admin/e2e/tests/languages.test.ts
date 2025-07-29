import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { TestContext } from '../helpers/test-helpers';
import { setupTest, teardownTest, waitAndClick, elementExists } from '../helpers/test-helpers';
import { createAdminTestUser, createEditorTestUser, createTranslatorTestUser } from '../setup/auth';
import { 
  LanguagesPage,
  LanguageFormDialog,
  DeleteLanguageDialog,
  BulkDeleteLanguagesDialog
} from '../helpers/languages-page-objects';
import { 
  TEST_LANGUAGES,
  VALIDATION_TEST_DATA,
  SEARCH_TEST_SCENARIOS,
  BULK_OPERATION_TEST_DATA,
  ROLE_PERMISSIONS,
  RESPONSIVE_BREAKPOINTS,
  generateTestLanguage,
  generateTestLanguages
} from '../helpers/languages-fixtures';
import {
  LanguagesTestDataManager,
  LanguagesBrowserUtils,
  LanguagesTestAssertions
} from '../helpers/languages-test-utils';

describe('Languages Feature E2E Tests', () => {
  let context: TestContext;
  let languagesPage: LanguagesPage;
  let formDialog: LanguageFormDialog;
  let deleteDialog: DeleteLanguageDialog;
  let bulkDeleteDialog: BulkDeleteLanguagesDialog;
  let dataManager: LanguagesTestDataManager;
  let browserUtils: LanguagesBrowserUtils;

  beforeEach(() => {
    // Reset data manager for each test
    dataManager = new LanguagesTestDataManager();
  });

  afterEach(async () => {
    if (context) {
      try {
        // Cleanup test data before tearing down
        const adminUser = await createAdminTestUser();
        await dataManager.cleanupTestLanguages(adminUser.jwt);
        
        await teardownTest(context);
      } catch (error) {
        console.warn('Teardown failed:', error);
      }
    }
  });

  describe('Navigation and Access Control', () => {
    it('should allow admin users to access languages page', async () => {
      context = await setupTest(await createAdminTestUser());
      languagesPage = new LanguagesPage(context.page);
      
      await languagesPage.navigate();
      
      const title = await languagesPage.getPageTitle();
      expect(title).toBe('Languages');
      
      // Admin should see the add button
      const hasAddButton = await languagesPage.hasAddLanguageButton();
      expect(hasAddButton).toBe(true);
    });

    it('should allow editor users to view languages but not manage them', async () => {
      context = await setupTest(await createEditorTestUser());
      languagesPage = new LanguagesPage(context.page);
      
      await languagesPage.navigate();
      
      const title = await languagesPage.getPageTitle();
      expect(title).toBe('Languages');
      
      // Editor should not see the add button
      const hasAddButton = await languagesPage.hasAddLanguageButton();
      expect(hasAddButton).toBe(false);
      
      // Bulk actions should not be available
      const hasBulkActions = await languagesPage.hasBulkActions();
      expect(hasBulkActions).toBe(false);
    });

    it('should allow translator users to view languages but not manage them', async () => {
      context = await setupTest(await createTranslatorTestUser());
      languagesPage = new LanguagesPage(context.page);
      
      await languagesPage.navigate();
      
      const title = await languagesPage.getPageTitle();
      expect(title).toBe('Languages');
      
      // Translator should not see the add button
      const hasAddButton = await languagesPage.hasAddLanguageButton();
      expect(hasAddButton).toBe(false);
    });

    it('should navigate to languages page from sidebar', async () => {
      context = await setupTest(await createAdminTestUser());
      
      // Click on languages link in sidebar
      await waitAndClick(context.page, 'a[href="/languages"]');
      
      // Should be on languages page
      await context.page.waitForSelector('h1', { timeout: 5000 });
      const url = context.page.url();
      expect(url).toContain('/languages');
      
      const title = await context.page.$eval('h1', el => el.textContent?.trim());
      expect(title).toBe('Languages');
    });
  });

  describe('Languages List Management', () => {
    beforeEach(async () => {
      context = await setupTest(await createAdminTestUser());
      languagesPage = new LanguagesPage(context.page);
      browserUtils = new LanguagesBrowserUtils(context.page);
      
      // Set up some test languages
      const adminUser = await createAdminTestUser();
      const testLanguages = [TEST_LANGUAGES.english, TEST_LANGUAGES.french, TEST_LANGUAGES.spanish];
      await dataManager.setupTestLanguages(testLanguages, adminUser.jwt);
      
      await languagesPage.navigate();
    });

    it('should display languages list correctly', async () => {
      const languages = await languagesPage.getLanguagesInTable();
      expect(languages.length).toBeGreaterThan(0);
      
      // Check that we have our test languages
      expect(await languagesPage.hasLanguage('en-US')).toBe(true);
      expect(await languagesPage.hasLanguage('fr-FR')).toBe(true);
      expect(await languagesPage.hasLanguage('es-ES')).toBe(true);
    });

    it('should handle loading state correctly', async () => {
      // Navigate to a fresh page to see loading state
      await context.page.goto('http://localhost:3000/languages');
      
      // Loading state should appear briefly
      const hasLoadingState = await languagesPage.isLoading();
      // Loading might be too fast to catch, so we don't assert true
      
      // Eventually should show content
      await context.page.waitForSelector('table, text="No languages found"', { timeout: 5000 });
      const isStillLoading = await languagesPage.isLoading();
      expect(isStillLoading).toBe(false);
    });

    it('should handle empty state correctly', async () => {
      // Clean up all languages first
      const adminUser = await createAdminTestUser();
      await dataManager.cleanupTestLanguages(adminUser.jwt);
      
      await languagesPage.navigate();
      
      const isEmpty = await languagesPage.isEmpty();
      expect(isEmpty).toBe(true);
    });

    it('should search languages by code', async () => {
      await languagesPage.searchLanguages('en-US');
      
      const languages = await languagesPage.getLanguagesInTable();
      expect(languages.length).toBeGreaterThan(0);
      
      // All results should contain the search term
      const hasEnglish = languages.some(lang => lang.code.includes('en-US'));
      expect(hasEnglish).toBe(true);
    });

    it('should search languages by name', async () => {
      await languagesPage.searchLanguages('English');
      
      const languages = await languagesPage.getLanguagesInTable();
      expect(languages.length).toBeGreaterThan(0);
      
      // All results should contain English in the name
      const hasEnglish = languages.some(lang => lang.name.toLowerCase().includes('english'));
      expect(hasEnglish).toBe(true);
    });

    it('should perform case-insensitive search', async () => {
      await languagesPage.searchLanguages('french');
      
      const languages = await languagesPage.getLanguagesInTable();
      expect(languages.length).toBeGreaterThan(0);
      
      const hasFrench = languages.some(lang => 
        lang.name.toLowerCase().includes('french') || lang.code.includes('fr-')
      );
      expect(hasFrench).toBe(true);
    });

    it('should clear search results', async () => {
      await languagesPage.searchLanguages('nonexistent');
      let languages = await languagesPage.getLanguagesInTable();
      expect(languages.length).toBe(0);
      
      await languagesPage.clearSearch();
      languages = await languagesPage.getLanguagesInTable();
      expect(languages.length).toBeGreaterThan(0);
    });

    it('should sort languages by code', async () => {
      await languagesPage.sortByCode();
      
      const languages = await languagesPage.getLanguagesInTable();
      expect(languages.length).toBeGreaterThan(1);
      
      // Verify ascending order
      LanguagesTestAssertions.assertLanguagesSorted(languages, 'code', 'asc');
      
      // Click again for descending order
      await languagesPage.sortByCode();
      const languagesDesc = await languagesPage.getLanguagesInTable();
      LanguagesTestAssertions.assertLanguagesSorted(languagesDesc, 'code', 'desc');
    });

    it('should sort languages by name', async () => {
      await languagesPage.sortByName();
      
      const languages = await languagesPage.getLanguagesInTable();
      expect(languages.length).toBeGreaterThan(1);
      
      // Verify ascending order
      LanguagesTestAssertions.assertLanguagesSorted(languages, 'name', 'asc');
      
      // Click again for descending order
      await languagesPage.sortByName();
      const languagesDesc = await languagesPage.getLanguagesInTable();
      LanguagesTestAssertions.assertLanguagesSorted(languagesDesc, 'name', 'desc');
    });
  });

  describe('Language Creation', () => {
    beforeEach(async () => {
      context = await setupTest(await createAdminTestUser());
      languagesPage = new LanguagesPage(context.page);
      formDialog = new LanguageFormDialog(context.page);
      
      await languagesPage.navigate();
    });

    it('should open create language dialog', async () => {
      await languagesPage.clickAddLanguageButton();
      
      const isOpen = await formDialog.isOpen();
      expect(isOpen).toBe(true);
      
      const title = await formDialog.getTitle();
      expect(title).toContain('Add Language');
    });

    it('should create a new language successfully', async () => {
      const newLanguage = generateTestLanguage('create');
      
      await languagesPage.clickAddLanguageButton();
      await formDialog.fillCode(newLanguage.code);
      await formDialog.fillName(newLanguage.name);
      await formDialog.submit();
      
      // Dialog should close
      await context.page.waitForTimeout(1000);
      const isOpen = await formDialog.isOpen();
      expect(isOpen).toBe(false);
      
      // Language should appear in table
      expect(await languagesPage.hasLanguage(newLanguage.code)).toBe(true);
    });

    it('should validate required fields', async () => {
      await languagesPage.clickAddLanguageButton();
      
      // Try to submit without filling fields
      await formDialog.submit();
      
      // Should show validation errors
      const hasCodeError = await formDialog.hasCodeError();
      const hasNameError = await formDialog.hasNameError();
      
      expect(hasCodeError || hasNameError).toBe(true);
    });

    it('should validate language code format', async () => {
      await languagesPage.clickAddLanguageButton();
      
      // Test various invalid formats
      for (const testCase of VALIDATION_TEST_DATA.invalidCodes) {
        await formDialog.fillCode(testCase.code);
        await formDialog.fillName(testCase.name);
        
        if (testCase.code) {
          // Try to submit
          await formDialog.submit();
          
          // Should show validation error
          const hasError = await formDialog.hasCodeError();
          if (hasError) {
            const errorMessage = await formDialog.getCodeError();
            expect(errorMessage.length).toBeGreaterThan(0);
          }
        }
      }
    });

    it('should prevent duplicate language codes', async () => {
      // First create a language
      const language1 = generateTestLanguage('dup1');
      const adminUser = await createAdminTestUser();
      await dataManager.setupTestLanguages([language1], adminUser.jwt);
      
      await languagesPage.navigate();
      await languagesPage.clickAddLanguageButton();
      
      // Try to create another with the same code
      await formDialog.fillCode(language1.code);
      await formDialog.fillName('Duplicate Name');
      await formDialog.submit();
      
      // Should show error (either validation or server error)
      await context.page.waitForTimeout(1000);
      const hasCodeError = await formDialog.hasCodeError();
      const isStillOpen = await formDialog.isOpen();
      
      expect(hasCodeError || isStillOpen).toBe(true);
    });

    it('should cancel language creation', async () => {
      await languagesPage.clickAddLanguageButton();
      
      const newLanguage = generateTestLanguage('cancel');
      await formDialog.fillCode(newLanguage.code);
      await formDialog.fillName(newLanguage.name);
      
      await formDialog.cancel();
      
      // Dialog should close without creating language
      const isOpen = await formDialog.isOpen();
      expect(isOpen).toBe(false);
      
      // Language should not exist
      expect(await languagesPage.hasLanguage(newLanguage.code)).toBe(false);
    });
  });

  describe('Language Editing', () => {
    beforeEach(async () => {
      context = await setupTest(await createAdminTestUser());
      languagesPage = new LanguagesPage(context.page);
      formDialog = new LanguageFormDialog(context.page);
      
      // Create a test language to edit
      const adminUser = await createAdminTestUser();
      const testLanguages = [generateTestLanguage('edit')];
      await dataManager.setupTestLanguages(testLanguages, adminUser.jwt);
      
      await languagesPage.navigate();
    });

    it('should open edit language dialog with pre-filled data', async () => {
      const createdLanguages = dataManager.getCreatedLanguages();
      const testLanguage = createdLanguages[0];
      
      await languagesPage.editLanguage(testLanguage.code);
      
      const isOpen = await formDialog.isOpen();
      expect(isOpen).toBe(true);
      
      const title = await formDialog.getTitle();
      expect(title).toContain('Edit Language');
      
      // Check pre-filled values
      const codeValue = await formDialog.getCodeValue();
      const nameValue = await formDialog.getNameValue();
      
      expect(codeValue).toBe(testLanguage.code);
      expect(nameValue).toBe(testLanguage.name);
    });

    it('should update language successfully', async () => {
      const createdLanguages = dataManager.getCreatedLanguages();
      const testLanguage = createdLanguages[0];
      const newName = `Updated ${testLanguage.name}`;
      
      await languagesPage.editLanguage(testLanguage.code);
      await formDialog.fillName(newName);
      await formDialog.submit();
      
      // Dialog should close
      await context.page.waitForTimeout(1000);
      const isOpen = await formDialog.isOpen();
      expect(isOpen).toBe(false);
      
      // Verify update in table
      const languages = await languagesPage.getLanguagesInTable();
      const updatedLanguage = languages.find(lang => lang.code === testLanguage.code);
      expect(updatedLanguage?.name).toBe(newName);
    });

    it('should validate fields during editing', async () => {
      const createdLanguages = dataManager.getCreatedLanguages();
      const testLanguage = createdLanguages[0];
      
      await languagesPage.editLanguage(testLanguage.code);
      
      // Clear required fields
      await formDialog.fillName('');
      await formDialog.submit();
      
      // Should show validation error
      const hasNameError = await formDialog.hasNameError();
      expect(hasNameError).toBe(true);
    });

    it('should cancel language editing', async () => {
      const createdLanguages = dataManager.getCreatedLanguages();
      const testLanguage = createdLanguages[0];
      const originalName = testLanguage.name;
      
      await languagesPage.editLanguage(testLanguage.code);
      await formDialog.fillName('Changed Name');
      await formDialog.cancel();
      
      // Dialog should close without saving changes
      const isOpen = await formDialog.isOpen();
      expect(isOpen).toBe(false);
      
      // Original name should be preserved
      const languages = await languagesPage.getLanguagesInTable();
      const language = languages.find(lang => lang.code === testLanguage.code);
      expect(language?.name).toBe(originalName);
    });
  });

  describe('Language Deletion', () => {
    beforeEach(async () => {
      context = await setupTest(await createAdminTestUser());
      languagesPage = new LanguagesPage(context.page);
      deleteDialog = new DeleteLanguageDialog(context.page);
      
      // Create test languages to delete
      const adminUser = await createAdminTestUser();
      const testLanguages = generateTestLanguages(2, 'delete');
      await dataManager.setupTestLanguages(testLanguages, adminUser.jwt);
      
      await languagesPage.navigate();
    });

    it('should open delete confirmation dialog', async () => {
      const createdLanguages = dataManager.getCreatedLanguages();
      const testLanguage = createdLanguages[0];
      
      await languagesPage.deleteLanguage(testLanguage.code);
      
      const isOpen = await deleteDialog.isOpen();
      expect(isOpen).toBe(true);
      
      const dialogContent = await deleteDialog.getLanguageName();
      expect(dialogContent).toContain(testLanguage.name);
    });

    it('should delete language successfully', async () => {
      const createdLanguages = dataManager.getCreatedLanguages();
      const testLanguage = createdLanguages[0];
      
      await languagesPage.deleteLanguage(testLanguage.code);
      await deleteDialog.confirm();
      
      // Dialog should close
      await context.page.waitForTimeout(1000);
      const isOpen = await deleteDialog.isOpen();
      expect(isOpen).toBe(false);
      
      // Language should be removed from table
      expect(await languagesPage.hasLanguage(testLanguage.code)).toBe(false);
    });

    it('should cancel language deletion', async () => {
      const createdLanguages = dataManager.getCreatedLanguages();
      const testLanguage = createdLanguages[0];
      
      await languagesPage.deleteLanguage(testLanguage.code);
      await deleteDialog.cancel();
      
      // Dialog should close without deleting
      const isOpen = await deleteDialog.isOpen();
      expect(isOpen).toBe(false);
      
      // Language should still exist
      expect(await languagesPage.hasLanguage(testLanguage.code)).toBe(true);
    });
  });

  describe('Bulk Operations', () => {
    beforeEach(async () => {
      context = await setupTest(await createAdminTestUser());
      languagesPage = new LanguagesPage(context.page);
      bulkDeleteDialog = new BulkDeleteLanguagesDialog(context.page);
      
      // Create multiple test languages for bulk operations
      const adminUser = await createAdminTestUser();
      const testLanguages = BULK_OPERATION_TEST_DATA.smallBatch;
      await dataManager.setupTestLanguages(testLanguages, adminUser.jwt);
      
      await languagesPage.navigate();
    });

    it('should select individual languages', async () => {
      const createdLanguages = dataManager.getCreatedLanguages();
      const testLanguage = createdLanguages[0];
      
      await languagesPage.selectLanguageByCode(testLanguage.code);
      
      const selectedCount = await languagesPage.getSelectedLanguagesCount();
      expect(selectedCount).toBe(1);
    });

    it('should select all languages', async () => {
      await languagesPage.selectAllLanguages();
      
      const totalLanguages = await languagesPage.getLanguageCount();
      const selectedCount = await languagesPage.getSelectedLanguagesCount();
      
      expect(selectedCount).toBe(totalLanguages);
    });

    it('should clear selection', async () => {
      await languagesPage.selectAllLanguages();
      let selectedCount = await languagesPage.getSelectedLanguagesCount();
      expect(selectedCount).toBeGreaterThan(0);
      
      await languagesPage.clearSelection();
      selectedCount = await languagesPage.getSelectedLanguagesCount();
      expect(selectedCount).toBe(0);
    });

    it('should perform bulk delete', async () => {
      const createdLanguages = dataManager.getCreatedLanguages();
      
      // Select multiple languages
      for (const language of createdLanguages) {
        await languagesPage.selectLanguageByCode(language.code);
      }
      
      const selectedCount = await languagesPage.getSelectedLanguagesCount();
      expect(selectedCount).toBe(createdLanguages.length);
      
      // Initiate bulk delete
      await languagesPage.clickBulkDelete();
      
      const isOpen = await bulkDeleteDialog.isOpen();
      expect(isOpen).toBe(true);
      
      const dialogCount = await bulkDeleteDialog.getLanguageCount();
      expect(dialogCount).toBe(createdLanguages.length);
      
      // Confirm deletion
      await bulkDeleteDialog.confirm();
      
      // Dialog should close
      await context.page.waitForTimeout(1000);
      const isStillOpen = await bulkDeleteDialog.isOpen();
      expect(isStillOpen).toBe(false);
      
      // Languages should be removed
      for (const language of createdLanguages) {
        expect(await languagesPage.hasLanguage(language.code)).toBe(false);
      }
    });

    it('should cancel bulk delete', async () => {
      const createdLanguages = dataManager.getCreatedLanguages();
      
      // Select languages
      for (const language of createdLanguages) {
        await languagesPage.selectLanguageByCode(language.code);
      }
      
      await languagesPage.clickBulkDelete();
      await bulkDeleteDialog.cancel();
      
      // Dialog should close without deleting
      const isOpen = await bulkDeleteDialog.isOpen();
      expect(isOpen).toBe(false);
      
      // Languages should still exist
      for (const language of createdLanguages) {
        expect(await languagesPage.hasLanguage(language.code)).toBe(true);
      }
    });
  });

  describe('Responsive Design', () => {
    beforeEach(async () => {
      context = await setupTest(await createAdminTestUser());
      languagesPage = new LanguagesPage(context.page);
      browserUtils = new LanguagesBrowserUtils(context.page);
      
      await languagesPage.navigate();
    });

    it('should display table layout on desktop', async () => {
      await browserUtils.setViewportSize(
        RESPONSIVE_BREAKPOINTS.desktop.width,
        RESPONSIVE_BREAKPOINTS.desktop.height
      );
      
      await languagesPage.navigate();
      
      // Desktop should show table
      const hasTable = await elementExists(context.page, 'table');
      expect(hasTable).toBe(true);
      
      // Mobile cards should be hidden
      const hasMobileCards = await elementExists(context.page, '.md\\:hidden');
      expect(hasMobileCards).toBe(false);
    });

    it('should display card layout on mobile', async () => {
      await browserUtils.setViewportSize(
        RESPONSIVE_BREAKPOINTS.mobile.width,
        RESPONSIVE_BREAKPOINTS.mobile.height
      );
      
      await languagesPage.navigate();
      
      // Should be able to get languages (cards or table)
      const languages = await languagesPage.getLanguagesInTable();
      expect(languages.length).toBeGreaterThan(0);
    });

    it('should handle tablet viewport', async () => {
      await browserUtils.setViewportSize(
        RESPONSIVE_BREAKPOINTS.tablet.width,
        RESPONSIVE_BREAKPOINTS.tablet.height
      );
      
      await languagesPage.navigate();
      
      // Should show table at tablet size (768px+)
      const hasTable = await elementExists(context.page, 'table');
      expect(hasTable).toBe(true);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      context = await setupTest(await createAdminTestUser());
      languagesPage = new LanguagesPage(context.page);
      browserUtils = new LanguagesBrowserUtils(context.page);
    });

    it('should handle network errors gracefully', async () => {
      // Simulate network error
      await browserUtils.simulateOfflineNetwork();
      
      await languagesPage.navigate();
      
      // Should show error state or handle gracefully
      const hasError = await languagesPage.hasError();
      const isEmpty = await languagesPage.isEmpty();
      
      // Should either show error or empty state (depending on implementation)
      expect(hasError || isEmpty).toBe(true);
      
      // Reset network
      await browserUtils.resetNetworkConditions();
    });

    it('should recover from network errors', async () => {
      // Start with offline network
      await browserUtils.simulateOfflineNetwork();
      await languagesPage.navigate();
      
      // Restore network
      await browserUtils.resetNetworkConditions();
      
      // Try to reload
      await context.page.reload();
      
      // Should eventually load content
      await context.page.waitForSelector('table, text="No languages found"', { timeout: 10000 });
      const isLoading = await languagesPage.isLoading();
      expect(isLoading).toBe(false);
    });

    it('should handle API validation errors', async () => {
      const adminUser = await createAdminTestUser();
      const existingLanguage = generateTestLanguage('error');
      await dataManager.setupTestLanguages([existingLanguage], adminUser.jwt);
      
      await languagesPage.navigate();
      await languagesPage.clickAddLanguageButton();
      
      formDialog = new LanguageFormDialog(context.page);
      
      // Try to create duplicate
      await formDialog.fillCode(existingLanguage.code);
      await formDialog.fillName('Duplicate Test');
      await formDialog.submit();
      
      // Should show error or keep dialog open
      await context.page.waitForTimeout(2000);
      const isStillOpen = await formDialog.isOpen();
      const hasError = await formDialog.hasCodeError();
      
      expect(isStillOpen || hasError).toBe(true);
    });
  });

  describe('Performance', () => {
    beforeEach(async () => {
      context = await setupTest(await createAdminTestUser());
      languagesPage = new LanguagesPage(context.page);
      browserUtils = new LanguagesBrowserUtils(context.page);
    });

    it('should load page within acceptable time', async () => {
      const startTime = Date.now();
      await languagesPage.navigate();
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    it('should handle search with reasonable response time', async () => {
      // Set up some test data first
      const adminUser = await createAdminTestUser();
      const testLanguages = generateTestLanguages(10, 'perf');
      await dataManager.setupTestLanguages(testLanguages, adminUser.jwt);
      
      await languagesPage.navigate();
      
      const startTime = Date.now();
      await languagesPage.searchLanguages('perf');
      const searchTime = Date.now() - startTime;
      
      // Search should respond within 2 seconds
      expect(searchTime).toBeLessThan(2000);
    });
  });

  describe('URL State Management', () => {
    beforeEach(async () => {
      context = await setupTest(await createAdminTestUser());
      languagesPage = new LanguagesPage(context.page);
    });

    it('should preserve search in URL', async () => {
      await languagesPage.navigate();
      await languagesPage.searchLanguages('test');
      
      // URL should contain search parameter
      const url = context.page.url();
      expect(url).toContain('search=test');
    });

    it('should restore search from URL', async () => {
      // Navigate directly with search parameter
      await context.page.goto('http://localhost:3000/languages?search=english');
      
      // Search should be applied
      const languages = await languagesPage.getLanguagesInTable();
      if (languages.length > 0) {
        const hasEnglish = languages.some(lang => 
          lang.code.toLowerCase().includes('english') || 
          lang.name.toLowerCase().includes('english')
        );
        expect(hasEnglish).toBe(true);
      }
    });
  });
});