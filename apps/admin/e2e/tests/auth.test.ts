import { describe, it, expect, afterEach } from 'vitest';
import type { TestContext } from '../helpers/test-helpers';
import { setupTest, teardownTest, elementExists, getTextContent } from '../helpers/test-helpers';
import { createTestUser, createAdminTestUser, createEditorTestUser, logoutTestUser } from '../setup/auth';

describe('Authentication E2E Tests', () => {
  let context: TestContext;

  afterEach(async () => {
    if (context) {
      await teardownTest(context);
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
    // Setup without authentication
    context = await setupTest(false);
    
    // Should redirect to login page
    await context.page.waitForSelector('button[type="submit"]', { timeout: 5000 });
    const loginButton = await elementExists(context.page, 'button[type="submit"]');
    expect(loginButton).toBe(true);
    
    // Check URL contains login
    expect(context.page.url()).toContain('/login');
  });

  it('should logout successfully', async () => {
    // Setup with authentication
    context = await setupTest(createTestUser());
    
    // Wait for dashboard
    await context.page.waitForSelector('h1', { timeout: 5000 });
    
    // Logout
    await logoutTestUser(context.page);
    
    // Should redirect to login
    await context.page.waitForSelector('button[type="submit"]', { timeout: 5000 });
    expect(context.page.url()).toContain('/login');
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