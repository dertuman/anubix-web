import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright';
import { test as setup } from '@playwright/test';

import {
  API_BASE_URL,
  TESTING_EMAIL,
  TESTING_EMAIL_2,
  TESTING_PASSWORD,
  TESTING_PASSWORD_2,
} from '@/lib/constants';

const baseURL = API_BASE_URL || 'http://localhost:3000';

setup('authenticate user 1', async ({ page }) => {
  await setupClerkTestingToken({ page });
  await page.goto(baseURL);
  await clerk.signIn({
    page,
    signInParams: {
      strategy: 'password',
      identifier: TESTING_EMAIL,
      password: TESTING_PASSWORD,
    },
  });
  await page.context().storageState({ path: 'playwright/.clerk/user1.json' });
});

setup('authenticate user 2', async ({ page }) => {
  await setupClerkTestingToken({ page });
  await page.goto(baseURL);
  await clerk.signIn({
    page,
    signInParams: {
      strategy: 'password',
      identifier: TESTING_EMAIL_2,
      password: TESTING_PASSWORD_2,
    },
  });
  await page.context().storageState({ path: 'playwright/.clerk/user2.json' });
});
