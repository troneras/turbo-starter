import puppeteer from 'puppeteer';
import type { Browser, Page } from 'puppeteer';
import { puppeteerConfig, testConfig } from '../puppeteer.config';
import { authenticateTestUser, createAdminTestUser } from '../setup/auth';
import type { TestUser } from '../../src/lib/test-users';

export interface TestContext {
  browser: Browser;
  page: Page;
  baseUrl: string;
}

/**
 * Sets up a test context with browser and page
 * @param authenticate - Whether to authenticate a user (defaults to admin)
 * @returns Test context with browser and page
 */
export async function setupTest(authenticate: boolean | TestUser = true): Promise<TestContext> {
  const browser = await puppeteer.launch(puppeteerConfig);
  const page = await browser.newPage();
  
  // Set default timeout
  page.setDefaultTimeout(testConfig.timeout);
  
  // Set up console log capture
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error('Page Error:', msg.text());
    }
  });
  
  // Set up error capture
  page.on('pageerror', (error) => {
    console.error('Page crashed:', error);
  });
  
  // Authenticate if requested
  if (authenticate) {
    const user = typeof authenticate === 'boolean' ? await createAdminTestUser() : authenticate;
    await authenticateTestUser(page, user);
  } else {
    // Just navigate to the base URL
    await page.goto(testConfig.baseUrl);
  }
  
  return {
    browser,
    page,
    baseUrl: testConfig.baseUrl
  };
}

/**
 * Tears down the test context
 * @param context - The test context to tear down
 */
export async function teardownTest(context: TestContext) {
  await context.page.close();
  await context.browser.close();
}

/**
 * Waits for an element and clicks it
 * @param page - The page instance
 * @param selector - The CSS selector
 */
export async function waitAndClick(page: Page, selector: string) {
  await page.waitForSelector(selector, { visible: true });
  await page.click(selector);
}

/**
 * Waits for an element and types into it
 * @param page - The page instance
 * @param selector - The CSS selector
 * @param text - The text to type
 */
export async function waitAndType(page: Page, selector: string, text: string) {
  await page.waitForSelector(selector, { visible: true });
  await page.click(selector);
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.type(selector, text);
}

/**
 * Waits for navigation to complete
 * @param page - The page instance
 * @param action - The action that triggers navigation
 */
export async function waitForNavigation(page: Page, action: () => Promise<void>) {
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    action()
  ]);
}

/**
 * Takes a screenshot for debugging
 * @param page - The page instance
 * @param name - The screenshot name
 */
export async function takeScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `e2e/screenshots/${name}-${timestamp}.png`,
    fullPage: true
  });
}

/**
 * Checks if an element exists on the page
 * @param page - The page instance
 * @param selector - The CSS selector
 * @returns True if element exists
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout: 1000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets text content of an element
 * @param page - The page instance
 * @param selector - The CSS selector
 * @returns The text content
 */
export async function getTextContent(page: Page, selector: string): Promise<string> {
  await page.waitForSelector(selector);
  return await page.$eval(selector, (el) => el.textContent || '');
}