import { defineConfig, devices } from '@playwright/test';

import * as dotenv from 'dotenv';

dotenv.config();

const baseURL = process.env.API_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: 'html',
  globalSetup: require.resolve('./tests/global-setup'),

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'authenticated',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.clerk/user1.json',
      },
      testIgnore: /auth\.setup\.ts/,
    },
    {
      name: 'mobile',
      dependencies: ['setup'],
      use: {
        ...devices['Pixel 7'],
        storageState: 'playwright/.clerk/user1.json',
      },
      testMatch: /mobile/,
    },
  ],
});
