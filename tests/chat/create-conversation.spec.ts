import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { expect, test } from '@playwright/test';

test.describe('Create conversation', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto('/workspace');
  });

  test('chat input is visible and accepts text', async ({ page }) => {
    const input = page.getByPlaceholder('Message Anubix...');
    await expect(input).toBeVisible();
    await input.fill('Hello, this is a test message');
    await expect(input).toHaveValue('Hello, this is a test message');
  });

  test('new chat button creates a conversation', async ({ page }) => {
    const newChatButton = page.getByRole('button', { name: /new chat/i });
    await expect(newChatButton).toBeVisible();
    await newChatButton.click();
    const input = page.getByPlaceholder('Message Anubix...');
    await expect(input).toBeVisible();
  });

  test('user can send a message', async ({ page }) => {
    const input = page.getByPlaceholder('Message Anubix...');
    await input.fill('Hello from Playwright test');
    await page.keyboard.press('Enter');
    await expect(
      page.getByText('Hello from Playwright test').first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
