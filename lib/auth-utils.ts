/**
 * Authentication utilities for email-based auth
 *
 * This module provides helper functions for working with Clerk authentication
 * using email as the primary identifier instead of user_id.
 *
 * This enables cross-environment authentication (localhost, preview, production)
 * with different Clerk instances but the same email.
 */

import { auth, clerkClient } from '@clerk/nextjs/server';

/**
 * Get the authenticated user's email address
 *
 * @returns The user's primary email address, or null if not authenticated
 * @throws Error if Clerk user is found but has no email addresses
 */
export async function getAuthEmail(): Promise<string | null> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return null;
    }

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
 * Get the authenticated user's email address, throwing if not authenticated
 *
 * Use this in API routes where authentication is required
 *
 * @returns The user's primary email address
 * @throws Error if not authenticated or email not found
 */
export async function requireAuthEmail(): Promise<string> {
  const email = await getAuthEmail();

  if (!email) {
    throw new Error('Authentication required');
  }

  return email;
}

/**
 * Get both userId (for backward compatibility) and email
 *
 * Use this during the migration period when you need both values
 *
 * @returns Object with userId and email, or null if not authenticated
 */
export async function getAuthContext(): Promise<{ userId: string; email: string } | null> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return null;
    }

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
