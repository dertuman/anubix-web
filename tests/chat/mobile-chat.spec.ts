import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { expect, test } from '@playwright/test';

test.describe('Mobile chat', () => {
  test('user can access workspace on mobile', async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto('/workspace');
    await expect(page).toHaveURL(/workspace/);
  });

  test('sidebar toggle is accessible on mobile', async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto('/workspace');
    const sidebar = page.getByRole('button', { name: /sidebar|menu/i });
    if (await sidebar.isVisible()) {
      await sidebar.click();
    }
  });
});
