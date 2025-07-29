import type { Page } from 'puppeteer';
import { waitAndClick, waitAndType, elementExists, getTextContent } from './test-helpers';

export interface TestLanguage {
  id?: number;
  code: string;
  name: string;
}

/**
 * Page object for the Languages list page
 */
export class LanguagesPage {
  constructor(private page: Page) {}

  // Navigation
  async navigate() {
    await this.page.goto('http://localhost:3000/languages');
    await this.page.waitForSelector('h1', { timeout: 5000 });
  }

  async getPageTitle(): Promise<string> {
    return await getTextContent(this.page, 'h1');
  }

  // Header and Controls
  async clickAddLanguageButton() {
    await waitAndClick(this.page, 'button:has-text("Add Language")');
  }

  async hasAddLanguageButton(): Promise<boolean> {
    return await elementExists(this.page, 'button:has-text("Add Language")');
  }

  // Search functionality
  async searchLanguages(searchTerm: string) {
    const searchInput = 'input[placeholder*="Search"]';
    await waitAndType(this.page, searchInput, searchTerm);
    // Wait for search results to update
    await this.page.waitForTimeout(500);
  }

  async clearSearch() {
    const searchInput = 'input[placeholder*="Search"]';
    await this.page.click(searchInput);
    await this.page.keyboard.down('Control');
    await this.page.keyboard.press('A');
    await this.page.keyboard.up('Control');
    await this.page.keyboard.press('Delete');
    await this.page.waitForTimeout(500);
  }

  // Table operations
  async getLanguagesInTable(): Promise<TestLanguage[]> {
    const isDesktop = await this.page.evaluate(() => window.innerWidth >= 768);
    
    if (isDesktop) {
      return await this.getLanguagesFromDesktopTable();
    } else {
      return await this.getLanguagesFromMobileCards();
    }
  }

  private async getLanguagesFromDesktopTable(): Promise<TestLanguage[]> {
    const rows = await this.page.$$('table tbody tr');
    const languages: TestLanguage[] = [];
    
    for (const row of rows) {
      const codeElement = await row.$('td:nth-child(2)');
      const nameElement = await row.$('td:nth-child(3)');
      
      if (codeElement && nameElement) {
        const code = await codeElement.evaluate(el => el.textContent?.trim() || '');
        const name = await nameElement.evaluate(el => el.textContent?.trim() || '');
        
        if (code && name) {
          languages.push({ code, name });
        }
      }
    }
    
    return languages;
  }

  private async getLanguagesFromMobileCards(): Promise<TestLanguage[]> {
    // Implementation for mobile card layout
    const cards = await this.page.$$('.md\\:hidden [class*="border"]');
    const languages: TestLanguage[] = [];
    
    for (const card of cards) {
      const codeElement = await card.$('[class*="font-mono"]');
      const nameElement = await card.$('h3, [class*="font-medium"]');
      
      if (codeElement && nameElement) {
        const code = await codeElement.evaluate(el => el.textContent?.trim() || '');
        const name = await nameElement.evaluate(el => el.textContent?.trim() || '');
        
        if (code && name) {
          languages.push({ code, name });
        }
      }
    }
    
    return languages;
  }

  async getLanguageCount(): Promise<number> {
    const languages = await this.getLanguagesInTable();
    return languages.length;
  }

  async hasLanguage(code: string): Promise<boolean> {
    const languages = await this.getLanguagesInTable();
    return languages.some(lang => lang.code === code);
  }

  // Table sorting
  async sortByCode() {
    await waitAndClick(this.page, 'th:has-text("Code") button');
  }

  async sortByName() {
    await waitAndClick(this.page, 'th:has-text("Name") button');
  }

  async getSortDirection(column: 'code' | 'name'): Promise<'asc' | 'desc' | 'none'> {
    const columnHeader = column === 'code' ? 'th:has-text("Code")' : 'th:has-text("Name")';
    const button = await this.page.$(`${columnHeader} button`);
    
    if (!button) return 'none';
    
    const arrowUp = await button.$('svg[data-lucide="arrow-up"]');
    const arrowDown = await button.$('svg[data-lucide="arrow-down"]');
    
    if (arrowUp) return 'asc';
    if (arrowDown) return 'desc';
    return 'none';
  }

  // Selection operations
  async selectAllLanguages() {
    await waitAndClick(this.page, 'thead input[type="checkbox"]');
  }

  async selectLanguageByCode(code: string) {
    const rows = await this.page.$$('table tbody tr');
    
    for (const row of rows) {
      const codeElement = await row.$('td:nth-child(2)');
      if (codeElement) {
        const rowCode = await codeElement.evaluate(el => el.textContent?.trim() || '');
        if (rowCode.includes(code)) {
          const checkbox = await row.$('input[type="checkbox"]');
          if (checkbox) {
            await checkbox.click();
            break;
          }
        }
      }
    }
  }

  async getSelectedLanguagesCount(): Promise<number> {
    const checkboxes = await this.page.$$('tbody input[type="checkbox"]:checked');
    return checkboxes.length;
  }

  async clearSelection() {
    const clearButton = await this.page.$('button:has-text("Clear Selection")');
    if (clearButton) {
      await clearButton.click();
    }
  }

  // Bulk operations
  async clickBulkDelete() {
    await waitAndClick(this.page, 'button:has-text("Delete Selected")');
  }

  async hasBulkActions(): Promise<boolean> {
    return await elementExists(this.page, 'button:has-text("Delete Selected")');
  }

  // Single language operations
  async editLanguage(code: string) {
    await this.clickLanguageAction(code, 'Edit');
  }

  async deleteLanguage(code: string) {
    await this.clickLanguageAction(code, 'Delete');
  }

  private async clickLanguageAction(code: string, action: 'Edit' | 'Delete') {
    const rows = await this.page.$$('table tbody tr');
    
    for (const row of rows) {
      const codeElement = await row.$('td:nth-child(2)');
      if (codeElement) {
        const rowCode = await codeElement.evaluate(el => el.textContent?.trim() || '');
        if (rowCode.includes(code)) {
          const actionButton = await row.$(`button[title="${action}"], button:has-text("${action}")`);
          if (actionButton) {
            await actionButton.click();
            break;
          }
        }
      }
    }
  }

  // Pagination
  async hasNextPage(): Promise<boolean> {
    return await elementExists(this.page, 'button:has-text("Next"):not([disabled])');
  }

  async hasPreviousPage(): Promise<boolean> {
    return await elementExists(this.page, 'button:has-text("Previous"):not([disabled])');
  }

  async goToNextPage() {
    await waitAndClick(this.page, 'button:has-text("Next")');
    await this.page.waitForTimeout(500); // Wait for page to load
  }

  async goToPreviousPage() {
    await waitAndClick(this.page, 'button:has-text("Previous")');
    await this.page.waitForTimeout(500); // Wait for page to load
  }

  async getPaginationInfo(): Promise<string> {
    const paginationText = await this.page.$('p:has-text("Showing")');
    if (paginationText) {
      return await paginationText.evaluate(el => el.textContent?.trim() || '');
    }
    return '';
  }

  // Loading and empty states
  async isLoading(): Promise<boolean> {
    return await elementExists(this.page, 'text="Loading languages..."');
  }

  async isEmpty(): Promise<boolean> {
    return await elementExists(this.page, 'text="No languages found"');
  }

  // Error states
  async hasError(): Promise<boolean> {
    return await elementExists(this.page, 'h1:has-text("Error Loading Languages")');
  }

  async getErrorMessage(): Promise<string> {
    const errorElement = await this.page.$('h1:has-text("Error Loading Languages") + p');
    if (errorElement) {
      return await errorElement.evaluate(el => el.textContent?.trim() || '');
    }
    return '';
  }
}

/**
 * Page object for the Language Form Dialog (Create/Edit)
 */
export class LanguageFormDialog {
  constructor(private page: Page) {}

  async isOpen(): Promise<boolean> {
    return await elementExists(this.page, '[role="dialog"]');
  }

  async getTitle(): Promise<string> {
    return await getTextContent(this.page, '[role="dialog"] h2');
  }

  async fillCode(code: string) {
    await waitAndType(this.page, 'input[name="code"]', code);
  }

  async fillName(name: string) {
    await waitAndType(this.page, 'input[name="name"]', name);
  }

  async getCodeValue(): Promise<string> {
    return await this.page.$eval('input[name="code"]', el => (el as HTMLInputElement).value);
  }

  async getNameValue(): Promise<string> {
    return await this.page.$eval('input[name="name"]', el => (el as HTMLInputElement).value);
  }

  async submit() {
    await waitAndClick(this.page, '[role="dialog"] button[type="submit"]');
  }

  async cancel() {
    await waitAndClick(this.page, '[role="dialog"] button:has-text("Cancel")');
  }

  async close() {
    // Click the X button or press escape
    const closeButton = await this.page.$('[role="dialog"] button[aria-label="Close"]');
    if (closeButton) {
      await closeButton.click();
    } else {
      await this.page.keyboard.press('Escape');
    }
  }

  // Validation errors
  async hasCodeError(): Promise<boolean> {
    return await elementExists(this.page, 'input[name="code"] + * [role="alert"], [data-field="code"] [role="alert"]');
  }

  async hasNameError(): Promise<boolean> {
    return await elementExists(this.page, 'input[name="name"] + * [role="alert"], [data-field="name"] [role="alert"]');
  }

  async getCodeError(): Promise<string> {
    const errorElement = await this.page.$('input[name="code"] + * [role="alert"], [data-field="code"] [role="alert"]');
    return errorElement ? await errorElement.evaluate(el => el.textContent?.trim() || '') : '';
  }

  async getNameError(): Promise<string> {
    const errorElement = await this.page.$('input[name="name"] + * [role="alert"], [data-field="name"] [role="alert"]');
    return errorElement ? await errorElement.evaluate(el => el.textContent?.trim() || '') : '';
  }

  async hasSubmitButton(): Promise<boolean> {
    return await elementExists(this.page, '[role="dialog"] button[type="submit"]');
  }

  async isSubmitDisabled(): Promise<boolean> {
    const submitButton = await this.page.$('[role="dialog"] button[type="submit"]');
    if (!submitButton) return true;
    return await submitButton.evaluate(el => (el as HTMLButtonElement).disabled);
  }
}

/**
 * Page object for Delete Language Dialog
 */
export class DeleteLanguageDialog {
  constructor(private page: Page) {}

  async isOpen(): Promise<boolean> {
    return await elementExists(this.page, '[role="dialog"]:has-text("Delete Language")');
  }

  async getLanguageName(): Promise<string> {
    const contentElement = await this.page.$('[role="dialog"] p:has-text("delete")');
    return contentElement ? await contentElement.evaluate(el => el.textContent?.trim() || '') : '';
  }

  async confirm() {
    await waitAndClick(this.page, '[role="dialog"] button:has-text("Delete")');
  }

  async cancel() {
    await waitAndClick(this.page, '[role="dialog"] button:has-text("Cancel")');
  }
}

/**
 * Page object for Bulk Delete Languages Dialog
 */
export class BulkDeleteLanguagesDialog {
  constructor(private page: Page) {}

  async isOpen(): Promise<boolean> {
    return await elementExists(this.page, '[role="dialog"]:has-text("Delete Languages")');
  }

  async getLanguageCount(): Promise<number> {
    const contentElement = await this.page.$('[role="dialog"] p:has-text("languages")');
    if (contentElement) {
      const text = await contentElement.evaluate(el => el.textContent?.trim() || '');
      const match = text.match(/(\d+)\s+languages?/);
      return match ? parseInt(match[1], 10) : 0;
    }
    return 0;
  }

  async confirm() {
    await waitAndClick(this.page, '[role="dialog"] button:has-text("Delete")');
  }

  async cancel() {
    await waitAndClick(this.page, '[role="dialog"] button:has-text("Cancel")');
  }
}