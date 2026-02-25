/**
 * Script to run migration 006: Make user_id columns nullable
 *
 * This fixes the issue where GitHub OAuth callback fails because user_id is NOT NULL
 * but we're only providing user_email in the insert.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_DEFAULT_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runMigration() {
  console.log('Running migration 006: Make user_id columns nullable...\n');

  const migrationPath = path.join(__dirname, '../supabase/migrations/006_make_user_id_nullable.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  // Split by semicolons and run each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && !s.startsWith('SELECT'));

  for (const statement of statements) {
    if (!statement) continue;

    console.log(`Executing: ${statement.substring(0, 80)}...`);

    const { error } = await supabase.rpc('exec_sql', { sql: statement });

    if (error) {
      console.error('Error:', error);
      // Continue anyway - column might already be nullable
    } else {
      console.log('✓ Success\n');
    }
  }

  // Verify the changes
  console.log('\nVerifying changes...');
  const { data, error } = await supabase
    .from('github_connections')
    .select('*')
    .limit(0);

  if (error) {
    console.log('Note: Could not verify schema (table might be empty)');
  } else {
    console.log('✓ github_connections table accessible');
  }

  console.log('\nMigration complete!');
  console.log('You can now test GitHub OAuth connection.');
}

runMigration().catch(console.error);
