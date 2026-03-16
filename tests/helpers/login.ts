import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright';
import { Page } from '@playwright/test';

import { API_BASE_URL, TESTING_EMAIL, TESTING_PASSWORD } from '@/lib/constants';

const baseURL = API_BASE_URL || 'http://localhost:3000';

export async function clerkLogin(
  page: Page,
  email: string,
  password: string
) {
  await setupClerkTestingToken({ page });
  await page.goto(baseURL);
  await clerk.signIn({
    page,
    signInParams: {
      strategy: 'password',
      identifier: email,
      password,
    },
  });
}

export async function clerkLogout(page: Page) {
  await clerk.signOut({ page });
}

// Backward-compatible aliases
export async function customLogin(page: Page, email: string, password: string) {
  await clerkLogin(page, email, password);
}

export async function login(page: Page) {
  if (!TESTING_EMAIL || !TESTING_PASSWORD) {
    throw new Error(
      'Missing TESTING_EMAIL or TESTING_PASSWORD environment variables'
    );
  }
  await clerkLogin(page, TESTING_EMAIL, TESTING_PASSWORD);
}
