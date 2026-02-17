/**
 * Configuration detection utilities.
 * Used to determine whether the app has been set up with Clerk + Supabase credentials.
 * When unconfigured, the app boots into the /setup wizard instead of crashing.
 */

/** Server-side check — can see all env vars */
export function isAppConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.CLERK_SECRET_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  );
}

/** Client-side check — can only see NEXT_PUBLIC_ vars */
export function isAppConfiguredClient(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  );
}
