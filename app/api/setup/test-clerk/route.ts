import { NextRequest, NextResponse } from 'next/server';

import { isAppConfigured } from '@/lib/setup/config';

export async function POST(req: NextRequest) {
  // Block this endpoint when app is already configured
  if (isAppConfigured()) {
    return NextResponse.json(
      { error: 'App is already configured' },
      { status: 403 }
    );
  }

  try {
    const { publishableKey, secretKey } = await req.json();

    if (!publishableKey || !secretKey) {
      return NextResponse.json(
        { error: 'Both publishableKey and secretKey are required' },
        { status: 400 }
      );
    }

    // Validate key format
    if (!publishableKey.startsWith('pk_')) {
      return NextResponse.json(
        { error: 'Publishable key must start with pk_' },
        { status: 400 }
      );
    }

    if (!secretKey.startsWith('sk_')) {
      return NextResponse.json(
        { error: 'Secret key must start with sk_' },
        { status: 400 }
      );
    }

    // Test the secret key by calling Clerk's users endpoint
    const response = await fetch(
      'https://api.clerk.com/v1/users?limit=1',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${secretKey}`,
        },
      }
    );

    if (response.ok) {
      return NextResponse.json({ success: true });
    }

    if (response.status === 401 || response.status === 403) {
      return NextResponse.json(
        { error: 'Invalid secret key. Please double-check it.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: `Clerk API returned status ${response.status}` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error testing Clerk connection:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to test connection' },
      { status: 500 }
    );
  }
}
