import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { expect, test } from '@playwright/test';

test.describe('Desktop chat', () => {
  test('user 1 can access workspace', async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto('/workspace');
    await expect(page).toHaveURL(/workspace/);
  });

  test('user 2 can access workspace', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: 'playwright/.clerk/user2.json',
    });
    const page = await context.newPage();
    await setupClerkTestingToken({ page });
    await page.goto('/workspace');
    await expect(page).toHaveURL(/workspace/);
    await context.close();
  });
});
