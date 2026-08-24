#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const accountList = [
  { email: 'admin@saraswatischool.edu.np', password: 'admin123', name: 'System Admin', role: 'admin', grade: '', className: '' },
  { email: 'anita.s@saraswatischool.edu.np', password: 'student123', name: 'Anita Sharma', role: 'student', grade: '10', className: 'A' },
  { email: 'ram.b@saraswatischool.edu.np', password: 'student123', name: 'Ram Bhandari', role: 'student', grade: '9', className: 'B' },
  { email: 'sita.g@saraswatischool.edu.np', password: 'student123', name: 'Sita Gurung', role: 'student', grade: '10', className: 'A' },
  { email: 'hari.p@saraswatischool.edu.np', password: 'student123', name: 'Hari Poudel', role: 'student', grade: '8', className: 'C' },
  { email: 'maya.s@saraswatischool.edu.np', password: 'student123', name: 'Maya Shrestha', role: 'student', grade: '11', className: 'A' },
  { email: 'rajan.k@saraswatischool.edu.np', password: 'student123', name: 'Rajan Karki', role: 'student', grade: '9', className: 'A' },
  { email: 'priya.t@saraswatischool.edu.np', password: 'student123', name: 'Priya Tamang', role: 'student', grade: '10', className: 'B' },
  { email: 'deepak.r@saraswatischool.edu.np', password: 'student123', name: 'Deepak Rawal', role: 'student', grade: '12', className: 'A' },
  { email: 'laxmi@saraswatischool.edu.np', password: 'librarian123', name: 'Laxmi Devi', role: 'librarian', grade: '', className: '' },
];

async function fix() {
  console.log('Getting user IDs via sign-in...\n');

  const userIds = {};
  for (const u of accountList) {
    const anonClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    const { data, error } = await anonClient.auth.signInWithPassword({ email: u.email, password: u.password });
    if (error) {
      console.log(`  Sign-in failed ${u.email}: ${error.message}`);
    } else {
      userIds[u.email] = data.user.id;
      console.log(`  ${u.email} -> ${data.user.id}`);
    }
  }

  console.log('\nUpserting profiles...');
  for (const u of accountList) {
    const uid = userIds[u.email];
    if (!uid) continue;
    const { error } = await supabase.from('profiles').upsert({
      id: uid,
      name: u.name,
      email: u.email,
      role: u.role,
      grade: u.grade,
      classname: u.className,
      avatar: u.name.split(' ').map(n => n[0]).join(''),
    }, { onConflict: 'id' });
    if (error) console.log(`  Profile error ${u.name}: ${error.message}`);
    else console.log(`  Profile OK: ${u.name}`);
  }

  console.log('\nInserting sample borrow requests...');
  const anitaId = userIds['anita.s@saraswatischool.edu.np'];
  const ramId = userIds['ram.b@saraswatischool.edu.np'];
  const laxmiId = userIds['laxmi@saraswatischool.edu.np'];

  if (anitaId && ramId) {
    const requests = [
      { id: 'BR-20260714-0001', book_id: 160, book_title: 'English Class 10', student_id: ramId, student_name: 'Ram Bhandari', borrow_date: '2026-07-14', expected_return_date: '2026-07-28', status: 'pending' },
      { id: 'BR-20260713-0002', book_id: 148, book_title: 'Science & Technology Class 8', student_id: anitaId, student_name: 'Anita Sharma', borrow_date: '2026-07-13', expected_return_date: '2026-07-27', status: 'borrowed', approved_by: laxmiId, approved_at: '2026-07-13T10:00:00Z' },
      { id: 'BR-20260710-0003', book_id: 156, book_title: 'Mathematics Class 9', student_id: anitaId, student_name: 'Anita Sharma', borrow_date: '2026-07-10', expected_return_date: '2026-07-24', status: 'overdue', approved_by: laxmiId, approved_at: '2026-07-10T10:00:00Z' },
    ];
    const { error } = await supabase.from('borrow_requests').upsert(requests, { onConflict: 'id' });
    if (error) console.log(`  Error: ${error.message}`);
    else console.log(`  Inserted ${requests.length} borrow requests`);
  } else {
    console.log('  Skipped (missing user IDs)');
  }

  console.log('\nDone!');
  console.log('\nCredentials:');
  console.log('  Admin:     admin@saraswatischool.edu.np / admin123');
  console.log('  Student:   anita.s@saraswatischool.edu.np / student123');
  console.log('  Librarian: laxmi@saraswatischool.edu.np / librarian123');
}

fix().catch(e => { console.error(e); process.exit(1); });
