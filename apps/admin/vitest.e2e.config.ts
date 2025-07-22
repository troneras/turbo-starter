import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['e2e/**/*.test.ts'],
    testTimeout: 60000,
    hookTimeout: 60000,
    globals: true,
    environment: 'node',
    setupFiles: ['./e2e/setup/global-setup.ts'],
    reporters: ['verbose'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    }
  }
});