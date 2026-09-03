#!/usr/bin/env node
// Create (or reset) a real librarian auth account + approved profile in Supabase.
// Usage: node supabase/add-librarian.js
// Uses the service_role key from .env (bypasses RLS).

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env file');
  console.error('The service key is found in Supabase Dashboard > Settings > API > service_role key');
  process.exit(1);
}

const LIBRARIAN = {
  email: 'laxmi@saraswatischool.edu.np',
  password: 'librarian123',
  name: 'Laxmi Devi',
  role: 'librarian',
  department: 'Library',
  avatar: 'LD'
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  // 1. Find the auth user id from an existing profile, or via auth lookup
  let userId = null;
  const { data: profMatch } = await supabase.from('profiles').select('id').eq('email', LIBRARIAN.email).maybeSingle();
  if (profMatch && profMatch.id) userId = profMatch.id;

  if (!userId) {
    try {
      const { data: lu } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const found = (lu && lu.users || []).find(u => u.email === LIBRARIAN.email);
      if (found) userId = found.id;
    } catch (e) {
      console.warn('listUsers lookup failed, will assume account needs creating:', e.message);
    }
  }

  if (userId) {
    console.log(`Auth user exists: ${LIBRARIAN.email} (${userId})`);
    console.log('  Setting/updating password to: ' + LIBRARIAN.password);
    const { error: pwErr } = await supabase.auth.admin.updateUserById(userId, { password: LIBRARIAN.password, email_confirm: true });
    if (pwErr) console.log(`  Password update error: ${pwErr.message}`);
    else console.log('  Password updated & email confirmed');
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: LIBRARIAN.email,
      password: LIBRARIAN.password,
      email_confirm: true,
      user_metadata: { name: LIBRARIAN.name, role: LIBRARIAN.role }
    });
    if (error) {
      console.error(`Failed to create auth user: ${error.message}`);
      process.exit(1);
    }
    userId = data.user.id;
    console.log(`Auth user created: ${LIBRARIAN.email} (${userId})`);
  }

  // 2. Upsert the approved profile
  const profile = {
    id: userId,
    name: LIBRARIAN.name,
    email: LIBRARIAN.email,
    role: LIBRARIAN.role,
    avatar: LIBRARIAN.avatar,
    approved: true
  };
  if (LIBRARIAN.department) profile.department = LIBRARIAN.department;

  const { error: profErr } = await supabase.from('profiles').upsert(profile, { onConflict: 'id' });

  if (profErr) {
    console.error(`Profile upsert error: ${profErr.message}`);
    process.exit(1);
  }

  console.log(`Profile upserted for: ${LIBRARIAN.name}`);
  console.log('\nDone. Librarian can now sign in at /librarian:');
  console.log(`  Email:    ${LIBRARIAN.email}`);
  console.log(`  Password: ${LIBRARIAN.password}`);
}

main().catch(e => { console.error(e); process.exit(1); });
