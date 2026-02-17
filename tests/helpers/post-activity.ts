import { expect, Page } from '@playwright/test';

import { API_BASE_URL } from '@/lib/constants';

export async function postActivity(
  page: Page,
  activityData: {
    title: string;
    description: string;
    size: string;
    address: string;
    priceType: string;
    price: string;
    date: { monthsAhead: number; day: number };
  } = {
    title: 'Testing Activity',
    description: 'Testing Activity description',
    size: 'Small',
    address: 'LondonUK',
    priceType: 'HourlyPer Activity',
    price: '100',
    date: { monthsAhead: 1, day: 1 },
  }
) {
  await page.goto(`${API_BASE_URL}/activities`);
  await page.getByRole('button', { name: 'Post' }).click();

  // title
  await page.getByPlaceholder('Title').nth(2).fill(activityData.title);

  // description
  await page
    .getByPlaceholder('Tell us more about this')
    .nth(1)
    .fill(activityData.description);

  // size
  await page.getByText(activityData.size).nth(2).click();

  // address
  await page
    .locator('div')
    .filter({ hasText: /^Meeting Point$/ })
    .nth(1)
    .click();
  await page
    .getByPlaceholder('Autocomplete your address!')
    .nth(2)
    .fill(activityData.address);
  await page.getByText(activityData.address).nth(1).click();

  // price type
  await page.getByText(activityData.priceType).nth(2).click();

  // price
  await page.getByPlaceholder('Enter amount').nth(1).fill(activityData.price);

  // date
  await page.getByLabel('Date').nth(1).click();
  for (let i = 0; i < activityData.date.monthsAhead; i++) {
    await page.getByLabel('Go to next month').click();
  }
  await page
    .getByRole('gridcell', {
      name: activityData.date.day.toString(),
      exact: true,
    })
    .first()
    .click();

  // post activity
  await page.getByLabel('Post Activity').nth(1).click();

  // check if activity was posted
  await expect(
    page.locator('text=Activity posted, ya cheeky bugger').first()
  ).toBeVisible();
}
