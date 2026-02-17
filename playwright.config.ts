import { defineConfig } from '@playwright/test';

export default defineConfig({
  timeout: 60_000, // Set global timeout to 3 seconds
  globalSetup: require.resolve('./tests/setup-tests'),
});
