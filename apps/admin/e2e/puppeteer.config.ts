import type { LaunchOptions } from 'puppeteer';

export const puppeteerConfig: LaunchOptions = {
  headless: process.env.HEADLESS !== 'false',
  slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
  devtools: process.env.DEVTOOLS === 'true',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process'
  ],
  defaultViewport: {
    width: 1280,
    height: 720
  }
};

export const testConfig = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0
};