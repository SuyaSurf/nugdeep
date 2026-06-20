import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  testMatch: '**/*.spec.mjs',
  timeout: 60000,
  use: {
    headless: true,
    viewport: { width: 480, height: 900 }
  },
  reporter: [['list']]
});
