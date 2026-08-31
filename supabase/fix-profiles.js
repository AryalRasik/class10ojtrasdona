require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const anon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const svc = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const users = [
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

async function main() {
  let ok = 0, fail = 0;
  for (const u of users) {
    let uid = null;
    const { data: si, error: siErr } = await anon.auth.signInWithPassword({
      email: u.email, password: u.password
    });
    if (!siErr && si.user) {
      uid = si.user.id;
    } else {
      // maybe login with email not confirmed; try admin createUser lookup via metadata instead
      console.log(`  SIGNIN FAIL ${u.email}: ${siErr ? siErr.message : 'no user'}`);
      fail++;
      continue;
    }
    const { error } = await svc.from('profiles').upsert({
      id: uid,
      name: u.name,
      email: u.email,
      role: u.role,
      grade: u.grade || '',
      classname: u.className || '',
      avatar: u.name.split(' ').map(n => n[0]).join(''),
      approved: u.role === 'admin' || u.role === 'librarian',
    }, { onConflict: 'id' });
    if (error) { console.log(`  ERROR ${u.email}: ${error.message}`); fail++; }
    else { console.log(`  OK ${u.email} (${u.role})`); ok++; }
    await anon.auth.signOut();
  }
  console.log(`\nDone. ok=${ok} fail=${fail}`);
}

main();
