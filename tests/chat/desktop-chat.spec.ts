import { customLogin } from '@/tests/helpers/login';
import { expect, test } from '@playwright/test';

import {
  TESTING_EMAIL,
  TESTING_EMAIL_2,
  TESTING_PASSWORD,
  TESTING_PASSWORD_2,
} from '@/lib/constants';

// NOTE: Must have two accounts to test this

// Helper function to add random delay to simulate human typing
function randomDelay(min = 1000, max = 3000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

test('Chat between two users in two desktop windows', async ({ browser }) => {
  // Open two browser contexts, one for each user
  const context1 = await browser.newContext();
  const page1 = await context1.newPage();
  await customLogin(page1, TESTING_EMAIL, TESTING_PASSWORD);

  const context2 = await browser.newContext();
  const page2 = await context2.newPage();
  await customLogin(page2, TESTING_EMAIL_2, TESTING_PASSWORD_2);

  // Navigate both users to the chat
  await page1.getByRole('link', { name: 'Chat' }).click();
  await page1.getByText(TESTING_EMAIL_2).click();
  await page2.getByRole('link', { name: 'Chat' }).click();
  await page2.getByText(TESTING_EMAIL).click();

  await page1.waitForTimeout(randomDelay());
  await page2.waitForTimeout(randomDelay());

  // Begin conversation - 10 messages each
  const conversation = [
    { sender: page1, message: 'Hey! Are we still on for tomorrow?' },
    { sender: page2, message: 'Yes, I’m excited for the pet walk!' },
    { sender: page1, message: 'Great! What time works for you?' },
    { sender: page2, message: 'How about 10 AM at the park entrance?' },
    { sender: page1, message: 'Perfect, see you there!' },
    { sender: page2, message: 'Don’t forget the treats!' },
    { sender: page1, message: 'Of course, I’ll bring extra snacks.' },
    { sender: page2, message: 'Can’t wait to see the dogs running around.' },
    { sender: page1, message: 'Same here, they’re going to have so much fun!' },
    { sender: page2, message: 'Looking forward to it! See you tomorrow!' },
  ];

  // Iterate through the conversation and have each user send their message
  for (const { sender, message } of conversation) {
    await sender.getByPlaceholder('Type a message').fill(message);
    await sender.keyboard.press('Enter');
    await sender.waitForTimeout(randomDelay());
  }

  // Verify last message is visible for both users
  await expect(
    page1
      .getByText('Looking forward to it! See you tomorrow!', { exact: true })
      .last()
  ).toBeVisible();
  await expect(
    page2
      .getByText('Looking forward to it! See you tomorrow!', { exact: true })
      .last()
  ).toBeVisible();

  // Close both contexts after conversation
  await context1.close();
  await context2.close();
});
