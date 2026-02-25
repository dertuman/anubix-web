import { NextResponse } from 'next/server';

import { createSupabaseAdmin } from '@/lib/supabase/server';
import { teardownFlyResources } from '@/lib/fly-machines';

/**
 * GET /api/cloud/cleanup
 *
 * Cron job to clean up stale machines:
 * - Machines stopped for >7 days are destroyed
 * - Machines stuck in 'error' state for >1 hour are cleaned up
 *
 * Add to vercel.json:
 * { "crons": [{ "path": "/api/cloud/cleanup", "schedule": "0 3 * * *" }] }
 *
 * Protected by CRON_SECRET env var (set the same value in Vercel cron config).
 */
export async function GET(req: Request) {
  // Verify this is called by Vercel cron or an admin
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const results = { stoppedCleaned: 0, errorCleaned: 0, errors: [] as string[] };

  // ── Clean up machines stopped for >7 days ──────────────────
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: stoppedMachines } = await supabase
    .from('cloud_machines')
    .select()
    .eq('status', 'stopped')
    .lt('stopped_at', sevenDaysAgo);

  for (const machine of stoppedMachines || []) {
    try {
      await teardownFlyResources(machine.fly_app_name, machine.fly_machine_id);
      await supabase.from('cloud_machines').delete().eq('id', machine.id);
      if (machine.email) {
        await supabase.from('bridge_configs').delete().eq('email', machine.email);
        await supabase.from('claude_connections').delete().eq('email', machine.email);
        await supabase.from('github_connections').delete().eq('email', machine.email);
        await supabase.from('project_env_vars').delete().eq('email', machine.email);
      }
      results.stoppedCleaned++;
    } catch (err) {
      results.errors.push(`stopped ${machine.fly_app_name}: ${err}`);
    }
  }

  // ── Clean up machines stuck in error state >1 hour ─────────
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: errorMachines } = await supabase
    .from('cloud_machines')
    .select()
    .eq('status', 'error')
    .lt('updated_at', oneHourAgo);

  for (const machine of errorMachines || []) {
    try {
      await teardownFlyResources(machine.fly_app_name, machine.fly_machine_id);
      await supabase.from('cloud_machines').delete().eq('id', machine.id);
      if (machine.email) {
        await supabase.from('bridge_configs').delete().eq('email', machine.email);
        await supabase.from('claude_connections').delete().eq('email', machine.email);
        await supabase.from('github_connections').delete().eq('email', machine.email);
        await supabase.from('project_env_vars').delete().eq('email', machine.email);
      }
      results.errorCleaned++;
    } catch (err) {
      results.errors.push(`error ${machine.fly_app_name}: ${err}`);
    }
  }

  return NextResponse.json(results);
}
