import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    const { url, publishableKey, secretKey } = await req.json();

    if (!url || !publishableKey || !secretKey) {
      return NextResponse.json(
        { error: 'URL, publishable key, and secret key are all required' },
        { status: 400 }
      );
    }

    // Test connection with the secret key (most privileges)
    const supabase = createClient(url, secretKey);

    // Try a simple query — this will succeed even if no tables exist,
    // because we're just testing the connection to the Supabase instance
    const { error } = await supabase.auth.getSession();

    // getSession() should work on any Supabase project
    // A network error or invalid URL will throw
    if (error) {
      // Some auth errors are OK — the connection still works
      // Only fail on network-level errors
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        return NextResponse.json(
          { error: 'Could not connect to Supabase. Check your Project URL.' },
          { status: 400 }
        );
      }
    }

    // Also verify the publishable key works
    const supabasePublic = createClient(url, publishableKey);
    const { error: pubError } = await supabasePublic.auth.getSession();

    if (pubError) {
      if (pubError.message?.includes('fetch') || pubError.message?.includes('network')) {
        return NextResponse.json(
          { error: 'Could not connect with the publishable key. Check your keys.' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error testing Supabase connection:', error);

    // Handle common errors
    if (error.message?.includes('Invalid URL')) {
      return NextResponse.json(
        { error: 'Invalid Supabase URL format' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to test connection' },
      { status: 500 }
    );
  }
}
