import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: 1,
  workers: 1,

  /* Run tests in Chromium (Chrome) ONLY */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Base URL for the running Next.js dev server */
  use: {
    baseURL: 'http://localhost:3000',
    headless: false,          // show browser window while testing
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  /* Automatically start the dev server before running tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true, // won't start a new one if already running
    timeout: 120_000,
  },
});
