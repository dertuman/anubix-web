import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_DEFAULT_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(url, key);

const email = 'alex.karslake@gmail.com';

// Check if profile already exists
const { data: existing, error: selectError } = await supabase
  .from('profiles')
  .select('*')
  .eq('email', email)
  .maybeSingle();

if (selectError) {
  console.error('Error checking for profile:', selectError);
  process.exit(1);
}

if (existing) {
  console.log('Profile already exists:', existing);
  console.log('Setting is_admin to true...');

  const { error } = await supabase
    .from('profiles')
    .update({ is_admin: true })
    .eq('email', email);

  if (error) {
    console.error('Error updating profile:', error);
  } else {
    console.log('✅ Profile updated successfully! Admin access granted.');
  }
} else {
  console.log('❌ No profile found for', email);
  console.log('\nYou need to create the profile first. Please provide your Clerk user ID from the dev instance.');
  console.log('You can find it in the Clerk dev dashboard under Users.');
}
