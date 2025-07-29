import type { Page } from 'puppeteer';
import type { TestLanguage } from './languages-page-objects';

/**
 * API utilities for managing test data
 */
export class LanguagesTestAPI {
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:3000/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Create a test language via API
   */
  async createLanguage(language: TestLanguage, jwt: string): Promise<TestLanguage> {
    const response = await fetch(`${this.baseUrl}/languages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`
      },
      body: JSON.stringify({
        code: language.code,
        name: language.name
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create language: ${response.status} ${response.statusText}`);
    }

    const created = await response.json();
    return {
      id: created.id,
      code: created.code,
      name: created.name
    };
  }

  /**
   * Create multiple test languages via API
   */
  async createLanguages(languages: TestLanguage[], jwt: string): Promise<TestLanguage[]> {
    const created: TestLanguage[] = [];
    
    for (const language of languages) {
      try {
        const result = await this.createLanguage(language, jwt);
        created.push(result);
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.warn(`Failed to create language ${language.code}:`, error);
      }
    }
    
    return created;
  }

  /**
   * Delete a language via API
   */
  async deleteLanguage(id: number, jwt: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/languages/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${jwt}`
      }
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete language: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Get all languages via API
   */
  async getLanguages(jwt: string): Promise<TestLanguage[]> {
    const response = await fetch(`${this.baseUrl}/languages`, {
      headers: {
        'Authorization': `Bearer ${jwt}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get languages: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.languages || [];
  }

  /**
   * Clean up test languages (languages with test prefixes)
   */
  async cleanupTestLanguages(jwt: string): Promise<void> {
    try {
      const languages = await this.getLanguages(jwt);
      const testLanguages = languages.filter(lang => 
        lang.code.startsWith('test-') || 
        lang.code.startsWith('t') ||
        lang.name.toLowerCase().includes('test') ||
        lang.name.toLowerCase().includes('bulk') ||
        lang.name.toLowerCase().includes('page')
      );

      for (const language of testLanguages) {
        if (language.id) {
          await this.deleteLanguage(language.id, jwt);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  }
}

/**
 * Test data setup and teardown utilities
 */
export class LanguagesTestDataManager {
  private api: LanguagesTestAPI;
  private createdLanguages: TestLanguage[] = [];

  constructor(baseUrl?: string) {
    this.api = new LanguagesTestAPI(baseUrl);
  }

  /**
   * Set up test languages for a test
   */
  async setupTestLanguages(languages: TestLanguage[], jwt: string): Promise<TestLanguage[]> {
    // Clean up first
    await this.api.cleanupTestLanguages(jwt);
    
    // Create new test languages
    const created = await this.api.createLanguages(languages, jwt);
    this.createdLanguages.push(...created);
    
    return created;
  }

  /**
   * Clean up all created test languages
   */
  async cleanupTestLanguages(jwt: string): Promise<void> {
    for (const language of this.createdLanguages) {
      if (language.id) {
        try {
          await this.api.deleteLanguage(language.id, jwt);
        } catch (error) {
          console.warn(`Failed to cleanup language ${language.code}:`, error);
        }
      }
    }
    
    this.createdLanguages = [];
    
    // Additional cleanup for any remaining test languages
    await this.api.cleanupTestLanguages(jwt);
  }

  /**
   * Get created test languages
   */
  getCreatedLanguages(): TestLanguage[] {
    return [...this.createdLanguages];
  }
}

/**
 * Browser utilities for E2E testing
 */
export class LanguagesBrowserUtils {
  constructor(private page: Page) {}

  /**
   * Set viewport size for responsive testing
   */
  async setViewportSize(width: number, height: number): Promise<void> {
    await this.page.setViewport({ width, height });
  }

  /**
   * Simulate network conditions
   */
  async simulateSlowNetwork(): Promise<void> {
    const client = await this.page.target().createCDPSession();
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 200 * 1024 / 8, // 200kb/s
      uploadThroughput: 200 * 1024 / 8,
      latency: 100
    });
  }

  /**
   * Simulate offline network
   */
  async simulateOfflineNetwork(): Promise<void> {
    await this.page.setOfflineMode(true);
  }

  /**
   * Reset network conditions
   */
  async resetNetworkConditions(): Promise<void> {
    await this.page.setOfflineMode(false);
    const client = await this.page.target().createCDPSession();
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0
    });
  }

  /**
   * Wait for API request to complete
   */
  async waitForAPIRequest(urlPattern: string, timeout = 5000): Promise<void> {
    await this.page.waitForResponse(
      response => response.url().includes(urlPattern),
      { timeout }
    );
  }

  /**
   * Mock API responses for testing error scenarios
   */
  async mockAPIResponse(urlPattern: string, status: number, body: any): Promise<void> {
    await this.page.setRequestInterception(true);
    
    this.page.on('request', request => {
      if (request.url().includes(urlPattern)) {
        request.respond({
          status,
          contentType: 'application/json',
          body: JSON.stringify(body)
        });
      } else {
        request.continue();
      }
    });
  }

  /**
   * Measure page load performance
   */
  async measurePageLoadTime(): Promise<number> {
    const performanceTiming = await this.page.evaluate(() => {
      return JSON.stringify(window.performance.timing);
    });
    
    const timing = JSON.parse(performanceTiming);
    return timing.loadEventEnd - timing.navigationStart;
  }

  /**
   * Take screenshot for debugging
   */
  async takeDebugScreenshot(name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.page.screenshot({
      path: `e2e/screenshots/debug-${name}-${timestamp}.png`,
      fullPage: true
    });
  }

  /**
   * Get console logs and errors
   */
  async getConsoleLogs(): Promise<Array<{ type: string; text: string }>> {
    return await this.page.evaluate(() => {
      // This would need to be implemented with proper console capture
      return [];
    });
  }

  /**
   * Check for JavaScript errors on the page
   */
  async hasJavaScriptErrors(): Promise<boolean> {
    const errors = await this.page.evaluate(() => {
      return window.onerror !== null;
    });
    return errors;
  }

  /**
   * Wait for element to be stable (not moving/changing)
   */
  async waitForElementStable(selector: string, timeout = 5000): Promise<void> {
    let previousBoundingBox: any = null;
    let stableCount = 0;
    const requiredStableChecks = 3;
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const element = await this.page.$(selector);
        if (!element) {
          await this.page.waitForTimeout(100);
          continue;
        }
        
        const boundingBox = await element.boundingBox();
        
        if (previousBoundingBox && 
            JSON.stringify(boundingBox) === JSON.stringify(previousBoundingBox)) {
          stableCount++;
          if (stableCount >= requiredStableChecks) {
            return;
          }
        } else {
          stableCount = 0;
        }
        
        previousBoundingBox = boundingBox;
        await this.page.waitForTimeout(100);
      } catch (error) {
        await this.page.waitForTimeout(100);
      }
    }
    
    throw new Error(`Element ${selector} did not stabilize within ${timeout}ms`);
  }
}

/**
 * Assertion utilities for language tests
 */
export class LanguagesTestAssertions {
  /**
   * Assert that languages are sorted correctly
   */
  static assertLanguagesSorted(
    languages: TestLanguage[], 
    field: 'code' | 'name', 
    direction: 'asc' | 'desc'
  ): void {
    for (let i = 1; i < languages.length; i++) {
      const current = languages[i][field];
      const previous = languages[i - 1][field];
      
      if (direction === 'asc') {
        if (current < previous) {
          throw new Error(
            `Languages not sorted ascending by ${field}: ${previous} should come after ${current}`
          );
        }
      } else {
        if (current > previous) {
          throw new Error(
            `Languages not sorted descending by ${field}: ${previous} should come before ${current}`
          );
        }
      }
    }
  }

  /**
   * Assert that search results contain expected languages
   */
  static assertSearchResults(
    actualLanguages: TestLanguage[],
    searchTerm: string,
    expectedCodes: string[]
  ): void {
    const actualCodes = actualLanguages.map(lang => lang.code);
    
    for (const expectedCode of expectedCodes) {
      if (!actualCodes.includes(expectedCode)) {
        throw new Error(
          `Expected language ${expectedCode} not found in search results for "${searchTerm}"`
        );
      }
    }
    
    // Verify all results match the search term
    for (const language of actualLanguages) {
      const matchesCode = language.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesName = language.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesCode && !matchesName) {
        throw new Error(
          `Language ${language.code} (${language.name}) does not match search term "${searchTerm}"`
        );
      }
    }
  }

  /**
   * Assert language code format is valid
   */
  static assertValidLanguageCode(code: string): void {
    const pattern = /^[a-z]{2}-[A-Z]{2}$/;
    if (!pattern.test(code)) {
      throw new Error(`Invalid language code format: ${code}. Expected format: xx-XX`);
    }
  }
}