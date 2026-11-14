import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  reporter: 'list',
  outputDir: '/tmp/pulsewatch-playwright-results',
  globalSetup: './e2e/global-setup.cjs',
  use: {
    baseURL: 'http://127.0.0.1:3010',
    browserName: 'chromium',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx next dev --hostname 127.0.0.1 --port 3010',
    url: 'http://127.0.0.1:3010',
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      NEXT_PUBLIC_API_URL: 'http://127.0.0.1:5010/api',
    },
  },
});
