import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/verify-access
 * Verifies the access password server-side.
 * Returns 200 if correct, 403 if wrong.
 */
export async function POST(req: NextRequest) {
  const requiredPassword = process.env.ACCESS_PASSWORD;
  if (!requiredPassword) {
    // No password configured — access is open
    return NextResponse.json({ ok: true });
  }

  const body = await req.json();
  const { password } = body as { password?: string };

  if (!password || password !== requiredPassword) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
