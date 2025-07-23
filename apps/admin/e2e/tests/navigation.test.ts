import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { TestContext } from '../helpers/test-helpers';
import { setupTest, teardownTest, waitAndClick, elementExists, getTextContent } from '../helpers/test-helpers';
import { createAdminTestUser } from '../setup/auth';

describe('Navigation E2E Tests', () => {
  let context: TestContext;

  beforeEach(async () => {
    // All tests start authenticated as admin
    context = await setupTest(await createAdminTestUser());
  });

  afterEach(async () => {
    if (context) {
      await teardownTest(context);
    }
  });

  it('should navigate to users page', async () => {
    // Click on Users link in sidebar
    await waitAndClick(context.page, 'a[href="/users"]');
    
    // Wait for users page to load
    await context.page.waitForSelector('h1', { timeout: 5000 });
    const heading = await getTextContent(context.page, 'h1');
    expect(heading).toContain('Users');
    
    // Check URL
    expect(context.page.url()).toContain('/users');
  });

  it('should navigate to brands page', async () => {
    // Click on Brands link
    await waitAndClick(context.page, 'a[href="/brands"]');
    
    // Wait for brands page
    await context.page.waitForSelector('h1', { timeout: 5000 });
    const heading = await getTextContent(context.page, 'h1');
    expect(heading).toContain('Brands');
    
    // Check URL
    expect(context.page.url()).toContain('/brands');
  });

  it('should show user profile menu', async () => {
    // Click on user avatar/profile button
    await waitAndClick(context.page, '[data-testid="user-profile-button"]');
    
    // Check if dropdown menu appears
    const hasProfileMenu = await elementExists(context.page, '[data-testid="user-profile-menu"]');
    expect(hasProfileMenu).toBe(true);
    
    // Check user info is displayed
    const userEmail = await getTextContent(context.page, '[data-testid="user-email"]');
    expect(userEmail).toBe('admin@example.com');
  });

  it('should toggle sidebar', async () => {
    // Check sidebar is visible initially
    const sidebarVisible = await elementExists(context.page, '[data-testid="app-sidebar"]');
    expect(sidebarVisible).toBe(true);
    
    // Click toggle button
    await waitAndClick(context.page, '[data-testid="sidebar-toggle"]');
    
    // Wait for animation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check sidebar state changed
    const sidebarClass = await context.page.$eval('[data-testid="app-sidebar"]', 
      el => el.className
    );
    expect(sidebarClass).toContain('collapsed');
  });
});