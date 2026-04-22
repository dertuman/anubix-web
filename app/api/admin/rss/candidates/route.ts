import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/admin-gate';
import { fetchAllCandidates } from '@/lib/news/rss';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const all = await fetchAllCandidates();

  const { data: used } = await gate.supabase
    .from('blogs')
    .select('source_url')
    .not('source_url', 'is', null);
  const usedSet = new Set((used ?? []).map((r) => r.source_url).filter(Boolean));

  const fresh = all.filter((c) => !usedSet.has(c.link));
  return NextResponse.json({ candidates: fresh.slice(0, 80) });
}
