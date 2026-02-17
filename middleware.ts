import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';

import { isAppConfigured } from '@/lib/setup/config';

export default async function middleware(
  req: NextRequest,
  evt: NextFetchEvent
) {
  const configured = isAppConfigured();

  if (!configured) {
    const { pathname } = req.nextUrl;

    // Allow setup routes, setup API, and static assets through
    if (
      pathname.startsWith('/setup') ||
      pathname.startsWith('/api/setup')
    ) {
      return NextResponse.next();
    }

    // Redirect everything else to /setup
    return NextResponse.redirect(new URL('/setup', req.url));
  }

  // App is configured — use Clerk middleware
  // Dynamic import to avoid assertKey() crash when keys are missing
  const { clerkMiddleware, createRouteMatcher } = await import(
    '@clerk/nextjs/server'
  );

  const isProtectedRoute = createRouteMatcher(['/profile(.*)']);

  const handler = clerkMiddleware(async (auth, request) => {
    if (isProtectedRoute(request)) {
      await auth.protect();
    }

    // Block /setup when already configured
    if (request.nextUrl.pathname.startsWith('/setup')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  });

  return handler(req, evt);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
