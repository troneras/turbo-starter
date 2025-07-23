import { describe, it, expect, afterEach } from 'vitest';
import type { TestContext } from '../helpers/test-helpers';
import { setupTest, teardownTest, elementExists, getTextContent } from '../helpers/test-helpers';
import { createTestUser, createAdminTestUser, createEditorTestUser, logoutTestUser } from '../setup/auth';

describe('Authentication E2E Tests', () => {
  let context: TestContext;

  afterEach(async () => {
    if (context) {
      try {
        await teardownTest(context);
      } catch (error) {
        // Ignore teardown errors for manual browser contexts
        console.warn('Teardown failed:', error);
      }
    }
  });

  it('should authenticate as admin user', async () => {
    // Setup with admin authentication
    context = await setupTest(await createAdminTestUser());
    
    // Check if we're on the dashboard (authenticated)
    await context.page.waitForSelector('h1', { timeout: 5000 });
    const heading = await getTextContent(context.page, 'h1');
    expect(heading).toContain('Dashboard');
    
    // Check for admin-specific elements
    const hasAdminMenu = await elementExists(context.page, '[data-testid="admin-menu"]');
    expect(hasAdminMenu).toBe(true);
  });

  it('should authenticate as editor user', async () => {
    // Setup with editor authentication
    context = await setupTest(await createEditorTestUser());
    
    // Check if we're on the dashboard
    await context.page.waitForSelector('h1', { timeout: 5000 });
    const heading = await getTextContent(context.page, 'h1');
    expect(heading).toContain('Dashboard');
    
    // Check that admin menu is not visible for editor
    const hasAdminMenu = await elementExists(context.page, '[data-testid="admin-menu"]');
    expect(hasAdminMenu).toBe(false);
  });

  it('should redirect to login when not authenticated', async () => {
    // Don't set context for this test to avoid teardown issues
    const puppeteer = await import('puppeteer');
    const { puppeteerConfig } = await import('../puppeteer.config');
    const browser = await puppeteer.default.launch(puppeteerConfig);
    const page = await browser.newPage();
    
    try {
      // Navigate to protected route without authentication
      await page.goto('http://localhost:3000/dashboard');
      
      // Wait for navigation to complete
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 }).catch(() => {});
      
      // Check URL - should be redirected to login or home
      const currentUrl = page.url();
      expect(currentUrl.includes('/login') || currentUrl === 'http://localhost:3000/' || currentUrl === 'http://localhost:3000').toBe(true);
    } finally {
      await page.close();
      await browser.close();
      // Don't set context since we handled cleanup manually
      context = null as any;
    }
  });

  it('should logout successfully', async () => {
    // Setup with authentication
    context = await setupTest(await createAdminTestUser());
    
    // Wait for dashboard
    await context.page.waitForSelector('h1', { timeout: 5000 });
    
    // Click logout button
    await context.page.click('[data-testid="logout-button"]');
    
    // Wait for logout to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Should redirect to login or home
    const currentUrl = context.page.url();
    expect(currentUrl.includes('/login') || currentUrl === 'http://localhost:3000/' || currentUrl === 'http://localhost:3000').toBe(true);
  });

  it('should persist authentication across page reloads', async () => {
    // Setup with authentication
    context = await setupTest(await createAdminTestUser());
    
    // Verify authenticated
    await context.page.waitForSelector('h1', { timeout: 5000 });
    const initialHeading = await getTextContent(context.page, 'h1');
    expect(initialHeading).toContain('Dashboard');
    
    // Reload page
    await context.page.reload();
    
    // Should still be authenticated
    await context.page.waitForSelector('h1', { timeout: 5000 });
    const reloadedHeading = await getTextContent(context.page, 'h1');
    expect(reloadedHeading).toContain('Dashboard');
  });
});