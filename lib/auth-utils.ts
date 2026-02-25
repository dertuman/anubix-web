/**
 * Authentication utilities — email is the primary identifier for all tables.
 */

import { auth, clerkClient } from '@clerk/nextjs/server';

/**
 * Get the authenticated user's email address.
 *
 * @returns The user's primary email address, or null if not authenticated
 */
export async function getAuthEmail(): Promise<string | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const email = user.emailAddresses[0]?.emailAddress;

    if (!email) {
      throw new Error(`User ${userId} has no email addresses`);
    }

    return email;
  } catch (error) {
    console.error('Error getting auth email:', error);
    return null;
  }
}

/**
 * Get the authenticated user's email address, throwing if not authenticated.
 * Use this in API routes where authentication is required.
 */
export async function requireAuthEmail(): Promise<string> {
  const email = await getAuthEmail();
  if (!email) throw new Error('Authentication required');
  return email;
}

/**
 * Get both userId and email for cases where both are needed
 * (e.g. RevenueCat webhook processing).
 */
export async function getAuthContext(): Promise<{ userId: string; email: string } | null> {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const email = user.emailAddresses[0]?.emailAddress;

    if (!email) {
      throw new Error(`User ${userId} has no email addresses`);
    }

    return { userId, email };
  } catch (error) {
    console.error('Error getting auth context:', error);
    return null;
  }
}
