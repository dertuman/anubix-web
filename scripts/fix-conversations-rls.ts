/**
 * Fix conversations table RLS policies
 * This script fixes the mismatch between the email column and RLS policies
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log('🔧 Fixing conversations table RLS policies...\n');

  // Read the migration SQL
  const migrationPath = path.join(__dirname, '../supabase/migrations/007_fix_conversations_email_column.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  try {
    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Migration failed:', error.message);

      // Try running it in parts if exec_sql doesn't exist
      console.log('\n⚠️  Trying alternative approach...');

      // Split by statement and run each one
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--') && !s.startsWith('DO $$'));

      for (const statement of statements) {
        if (statement.includes('SELECT') && !statement.includes('CREATE')) continue;

        try {
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
          if (stmtError) {
            console.error(`❌ Failed to execute: ${statement.substring(0, 50)}...`);
            console.error(`   Error: ${stmtError.message}`);
          }
        } catch (e) {
          console.error(`❌ Exception: ${(e as Error).message}`);
        }
      }
    } else {
      console.log('✅ Migration executed successfully!');
    }

    // Verify the fix
    console.log('\n📊 Verifying schema...');
    const { data: columns, error: verifyError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'conversations')
      .in('column_name', ['email', 'user_email', 'clerk_user_id']);

    if (verifyError) {
      console.error('❌ Could not verify schema:', verifyError.message);
    } else {
      console.log('Columns found:', columns);
    }

    console.log('\n✅ Done! Try creating a conversation now.');
  } catch (error) {
    console.error('❌ Unexpected error:', (error as Error).message);
    process.exit(1);
  }
}

main();
