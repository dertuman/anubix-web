import { login } from '@/tests/helpers/login';
import { test } from '@playwright/test';

test('Login and navigate to home', async ({ page }) => {
  await login(page);
});
