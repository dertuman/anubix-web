import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { expect, test } from '@playwright/test';

test('authenticated user can access /workspace', async ({ page }) => {
  await setupClerkTestingToken({ page });
  await page.goto('/workspace');
  await expect(page).toHaveURL(/workspace/);
});

test('authenticated user can access /profile', async ({ page }) => {
  await setupClerkTestingToken({ page });
  await page.goto('/profile');
  await expect(page).toHaveURL(/profile/);
});

test('unauthenticated user is redirected from /profile', async ({ browser }) => {
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();
  await setupClerkTestingToken({ page });
  await page.goto('/profile');
  await page.waitForURL((url) => !url.pathname.includes('/profile'));
  expect(page.url()).not.toContain('/profile');
  await context.close();
});
