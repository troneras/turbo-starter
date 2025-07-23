import { describe, it, expect } from 'vitest';
import { getTextContent } from '../helpers/test-helpers';
import { authenticateWithQueryParams } from '../setup/auth';
import puppeteer from 'puppeteer';
import { puppeteerConfig } from '../puppeteer.config';

describe('Query Parameter Authentication E2E Tests', () => {

  it('should auto-login as admin with query parameters', async () => {
    const browser = await puppeteer.launch(puppeteerConfig);
    const page = await browser.newPage();
    
    // Navigate with test mode and admin profile
    await page.goto('http://localhost:3000?testMode=true&testProfile=admin');
    
    // Wait for authentication and redirect
    await page.waitForSelector('h1', { timeout: 5000 });
    
    // Verify we're authenticated as admin
    const heading = await getTextContent(page, 'h1');
    expect(heading).toContain('Dashboard');
    
    // Check user info
    const userEmail = await page.evaluate(() => {
      return localStorage.getItem('test_user');
    });
    
    expect(userEmail).toBeTruthy();
    const userData = JSON.parse(userEmail!);
    expect(userData.email).toBeTruthy();
    expect(userData.email.includes('@')).toBe(true);
    expect(userData.roles).toContain('admin');
    
    // Verify URL is cleaned up (query params removed)
    expect(page.url()).not.toContain('testMode');
    expect(page.url()).not.toContain('testProfile');
    
    await page.close();
    await browser.close();
  });

  it('should auto-login as editor with query parameters', async () => {
    const browser = await puppeteer.launch(puppeteerConfig);
    const page = await browser.newPage();
    
    await authenticateWithQueryParams(page, 'editor');
    
    // Verify authentication
    const userData = await page.evaluate(() => {
      const data = localStorage.getItem('test_user');
      return data ? JSON.parse(data) : null;
    });
    
    expect(userData).toBeTruthy();
    expect(userData.email).toBeTruthy();
    expect(userData.email.includes('@')).toBe(true);
    expect(userData.roles).toContain('editor');
    expect(userData.roles).not.toContain('admin');
    
    await page.close();
    await browser.close();
  });

  it('should handle invalid test profile gracefully', async () => {
    const browser = await puppeteer.launch(puppeteerConfig);
    const page = await browser.newPage();
    
    // Set up console listener to capture warnings
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'warn') {
        consoleMessages.push(msg.text());
      }
    });
    
    // Navigate with invalid profile
    await page.goto('http://localhost:3000?testMode=true&testProfile=invalid');
    
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check for warning message
    const hasWarning = consoleMessages.some(msg => 
      msg.includes('Unknown test profile: invalid')
    );
    expect(hasWarning).toBe(true);
    
    // Verify not authenticated
    const jwt = await page.evaluate(() => localStorage.getItem('auth_jwt'));
    expect(jwt).toBeNull();
    
    await page.close();
    await browser.close();
  });

  it('should work with deep links and authentication', async () => {
    const browser = await puppeteer.launch(puppeteerConfig);
    const page = await browser.newPage();
    
    // Navigate directly to a protected route with authentication
    await page.goto('http://localhost:3000/users?testMode=true&testProfile=admin');
    
    // Should be authenticated and on the users page
    await page.waitForSelector('h1', { timeout: 5000 });
    const heading = await getTextContent(page, 'h1');
    expect(heading).toContain('Users');
    
    // Verify authentication
    const jwt = await page.evaluate(() => localStorage.getItem('auth_jwt'));
    expect(jwt).toBeTruthy();
    
    await page.close();
    await browser.close();
  });
});