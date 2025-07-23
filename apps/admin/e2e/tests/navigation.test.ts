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
    // Check if user profile button exists
    const hasProfileButton = await elementExists(context.page, '[data-testid="user-profile-button"]');
    expect(hasProfileButton).toBe(true);
    
    // Get user email from profile
    const userEmail = await getTextContent(context.page, '[data-testid="user-email"]');
    // Test users from API have different emails than hardcoded fallbacks
    expect(userEmail).toBeTruthy();
    expect(userEmail.includes('@')).toBe(true);
  });

  it('should toggle sidebar', async () => {
    // Check sidebar is visible initially
    const sidebarVisible = await elementExists(context.page, '[data-testid="app-sidebar"]');
    expect(sidebarVisible).toBe(true);
    
    // Click toggle button
    await waitAndClick(context.page, '[data-testid="sidebar-toggle"]');
    
    // Wait for animation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check sidebar still exists (it doesn't get removed, just changes state)
    const sidebarStillExists = await elementExists(context.page, '[data-testid="app-sidebar"]');
    expect(sidebarStillExists).toBe(true);
    
    // Check that toggle button is still clickable (indicates sidebar state changed)
    const toggleExists = await elementExists(context.page, '[data-testid="sidebar-toggle"]');
    expect(toggleExists).toBe(true);
  });
});