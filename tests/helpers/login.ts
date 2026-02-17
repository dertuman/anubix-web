import { expect, Page } from '@playwright/test';

import { API_BASE_URL, TESTING_EMAIL, TESTING_PASSWORD } from '@/lib/constants';

export async function customLogin(page: Page, email: string, password: string) {
  if (!email || !password) {
    throw new Error('Missing email or password for login');
  }

  // Navigate to the login page
  await page.goto(`${API_BASE_URL}/en/login`);

  // Fill in the email and password
  await page.fill('input#email', email);
  await page.fill('input#password', password);

  // Click the login button
  await page.click('button[type="submit"]');

  // Wait for navigation to the home page
  await page.waitForURL(`${API_BASE_URL}/en`);
  expect(page.url()).toBe(`${API_BASE_URL}/en`);
}

export async function login(page: Page) {
  if (!TESTING_EMAIL || !TESTING_PASSWORD) {
    throw new Error(
      'Missing TESTING_EMAIL or TESTING_PASSWORD environment variables'
    );
  }
  await customLogin(page, TESTING_EMAIL, TESTING_PASSWORD);
}

export async function mobileLogin(page: Page, email: string, password: string) {
  if (!email || !password) {
    throw new Error('Missing email or password for login');
  }

  // Navigate to the login page
  await page.goto(`${API_BASE_URL}/en`);

  await page
    .locator('div')
    .filter({ hasText: /^Burger button$/ })
    .click();
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByPlaceholder('Enter your email').click();
  await page.getByPlaceholder('Enter your email').fill(email);
  await page.getByPlaceholder('Enter your email').press('Tab');
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByPlaceholder('Enter your password').press('Enter');
}
