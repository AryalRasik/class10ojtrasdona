#!/usr/bin/env node

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env file');
  console.error('The service key is found in Supabase Dashboard > Settings > API > service_role key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const users = [
  { email: 'admin@saraswatischool.edu.np', password: 'admin123', name: 'System Admin', role: 'admin' },
  { email: 'anita.s@saraswatischool.edu.np', password: 'student123', name: 'Anita Sharma', role: 'student', grade: '10', className: 'A' },
  { email: 'ram.b@saraswatischool.edu.np', password: 'student123', name: 'Ram Bhandari', role: 'student', grade: '9', className: 'B' },
  { email: 'sita.g@saraswatischool.edu.np', password: 'student123', name: 'Sita Gurung', role: 'student', grade: '10', className: 'A' },
  { email: 'hari.p@saraswatischool.edu.np', password: 'student123', name: 'Hari Poudel', role: 'student', grade: '8', className: 'C' },
  { email: 'maya.s@saraswatischool.edu.np', password: 'student123', name: 'Maya Shrestha', role: 'student', grade: '11', className: 'A' },
  { email: 'rajan.k@saraswatischool.edu.np', password: 'student123', name: 'Rajan Karki', role: 'student', grade: '9', className: 'A' },
  { email: 'priya.t@saraswatischool.edu.np', password: 'student123', name: 'Priya Tamang', role: 'student', grade: '10', className: 'B' },
  { email: 'deepak.r@saraswatischool.edu.np', password: 'student123', name: 'Deepak Rawal', role: 'student', grade: '12', className: 'A' },
  { email: 'laxmi@saraswatischool.edu.np', password: 'librarian123', name: 'Laxmi Devi', role: 'librarian' },
];

const categories = [
  { name: 'Nepali', icon: 'book-open', color: '#ef4444', count: 12 },
  { name: 'English', icon: 'languages', color: '#3b82f6', count: 12 },
  { name: 'Mathematics', icon: 'calculator', color: '#f59e0b', count: 12 },
  { name: 'Science & Technology', icon: 'atom', color: '#10b981', count: 10 },
  { name: 'Social Studies', icon: 'globe', color: '#8b5cf6', count: 10 },
  { name: 'Health & Physical Education', icon: 'heart', color: '#14b8a6', count: 6 },
  { name: 'Computer Science', icon: 'cpu', color: '#06b6d4', count: 4 },
  { name: 'Economics', icon: 'landmark', color: '#ec4899', count: 4 },
  { name: 'Natural Sciences', icon: 'flask-conical', color: '#0ea5e9', count: 6 },
  { name: 'Business & Accountancy', icon: 'briefcase', color: '#a855f7', count: 4 },
];

const announcements = [
  { title: 'Library Hours Extended for Board Exam Students', content: 'The library will remain open until 6:00 PM for Grade 10 and 12 students during exam preparation period starting from Chaitra 1.', date: '2026-03-15', priority: 'high', icon: 'clock', active: true },
  { title: 'New Digital Resources Available', content: 'We have added 50 new digital books and reference materials to our online library. Access them through the Digital Library section.', date: '2026-03-10', priority: 'normal', icon: 'download', active: true },
  { title: 'Annual Book Fair 2083', content: 'Saraswati Sec School is organizing its Annual Book Fair from Baisakh 5-7. Special discounts and book exchange opportunities available!', date: '2026-03-08', priority: 'normal', icon: 'calendar', active: true },
];

const events = [
  { title: 'Reading Challenge Kickoff', description: 'Join our 30-day reading challenge! Read at least 20 pages daily and earn achievement badges.', date: '2026-03-20', time: '10:00 AM', location: 'Library Hall', type: 'reading', icon: 'book-open', active: true },
  { title: 'Author Visit: Laxmi Prasad Devkota Memorial Talk', description: 'A special talk on the life and works of Nepal\'s greatest poet, Laxmi Prasad Devkota.', date: '2026-03-25', time: '2:00 PM', location: 'Auditorium', type: 'cultural', icon: 'mic', active: true },
  { title: 'Book Club Meeting', description: 'Monthly book club discussion. This month\'s pick: "Shirishko Phool" by Shivhari Adhikari.', date: '2026-04-01', time: '3:30 PM', location: 'Library Reading Room', type: 'discussion', icon: 'users', active: true },
];

const books = [
  { id: 101, title: 'Nepali Class 1', author: 'CDC Nepal', publisher: 'CDC, MoEST', grade: '1', subject: 'Nepali', language: 'Nepali', pages: 56, year: 2076, description: 'Official Nepali textbook for Grade 1 students.', isbn: '978-9937-0-XXXXX-101', category: 'Nepali', total_copies: 50, available_copies: 42, borrow_count: 156, rating: 4.3, status: 'available', shelf: 'CDC-G1', rack: 1 },
  { id: 102, title: 'English Class 1', author: 'CDC Nepal', publisher: 'CDC, MoEST', grade: '1', subject: 'English', language: 'English', pages: 64, year: 2076, description: 'Official English textbook for Grade 1 students.', isbn: '978-9937-0-XXXXX-102', category: 'English', total_copies: 50, available_copies: 44, borrow_count: 132, rating: 4.2, status: 'available', shelf: 'CDC-G1', rack: 1 },
  { id: 103, title: 'Mathematics Class 1', author: 'CDC Nepal', publisher: 'CDC, MoEST', grade: '1', subject: 'Mathematics', language: 'Nepali', pages: 52, year: 2076, description: 'Mathematics textbook for Grade 1.', isbn: '978-9937-0-XXXXX-103', category: 'Mathematics', total_copies: 50, available_copies: 45, borrow_count: 120, rating: 4.1, status: 'available', shelf: 'CDC-G1', rack: 1 },
  { id: 137, title: 'Nepali Class 7', author: 'CDC Nepal', publisher: 'CDC, MoEST', grade: '7', subject: 'Nepali', language: 'Nepali', pages: 120, year: 2079, description: 'Advanced Nepali literature for Grade 7.', isbn: '978-9937-0-XXXXX-137', category: 'Nepali', total_copies: 50, available_copies: 36, borrow_count: 195, rating: 4.5, status: 'available', shelf: 'CDC-G7', rack: 7 },
  { id: 138, title: 'English Class 7', author: 'CDC Nepal', publisher: 'CDC, MoEST', grade: '7', subject: 'English', language: 'English', pages: 120, year: 2079, description: 'English textbook for Grade 7.', isbn: '978-9937-0-XXXXX-138', category: 'English', total_copies: 50, available_copies: 38, borrow_count: 175, rating: 4.3, status: 'available', shelf: 'CDC-G7', rack: 7 },
  { id: 139, title: 'Mathematics Class 7', author: 'CDC Nepal', publisher: 'CDC, MoEST', grade: '7', subject: 'Mathematics', language: 'Nepali', pages: 116, year: 2079, description: 'Mathematics textbook for Grade 7.', isbn: '978-9937-0-XXXXX-139', category: 'Mathematics', total_copies: 50, available_copies: 40, borrow_count: 158, rating: 4.2, status: 'available', shelf: 'CDC-G7', rack: 7 },
  { id: 140, title: 'Science Class 7', author: 'CDC Nepal', publisher: 'CDC, MoEST', grade: '7', subject: 'Science', language: 'Nepali', pages: 120, year: 2079, description: 'Science textbook for Grade 7.', isbn: '978-9937-0-XXXXX-140', category: 'Science & Technology', total_copies: 50, available_copies: 37, borrow_count: 188, rating: 4.4, status: 'available', shelf: 'CDC-G7', rack: 7 },
  { id: 145, title: 'Nepali Class 8', author: 'CDC Nepal', publisher: 'CDC, MoEST', grade: '8', subject: 'Nepali', language: 'Nepali', pages: 128, year: 2079, description: 'Comprehensive Nepali textbook for Grade 8.', isbn: '978-9937-0-XXXXX-145', category: 'Nepali', total_copies: 50, available_copies: 35, borrow_count: 202, rating: 4.5, status: 'available', shelf: 'CDC-G8', rack: 8 },
  { id: 146, title: 'English Class 8', author: 'CDC Nepal', publisher: 'CDC, MoEST', grade: '8', subject: 'English', language: 'English', pages: 136, year: 2079, description: 'English textbook for Grade 8.', isbn: '978-9937-0-XXXXX-146', category: 'English', total_copies: 50, available_copies: 37, borrow_count: 182, rating: 4.3, status: 'available', shelf: 'CDC-G8', rack: 8 },
  { id: 147, title: 'Mathematics Class 8', author: 'CDC Nepal', publisher: 'CDC, MoEST', grade: '8', subject: 'Mathematics', language: 'Nepali', pages: 144, year: 2079, description: 'Mathematics textbook for Grade 8.', isbn: '978-9937-0-XXXXX-147', category: 'Mathematics', total_copies: 50, available_copies: 39, borrow_count: 165, rating: 4.2, status: 'available', shelf: 'CDC-G8', rack: 8 },
  { id: 148, title: 'Science & Technology Class 8', author: 'CDC Nepal', publisher: 'CDC, MoEST', grade: '8', subject: 'Science & Technology', language: 'Nepali', pages: 152, year: 2079, description: 'Science & Technology textbook for Grade 8.', isbn: '978-9937-0-XXXXX-148', category: 'Science & Technology', total_copies: 50, available_copies: 36, borrow_count: 192, rating: 4.4, status: 'available', shelf: 'CDC-G8', rack: 8 },
  { id: 152, title: 'Nepali Class 9', author: 'CDC Nepal', publisher: 'CDC, MoEST', grade: '9', subject: 'Nepali', language: 'Nepali', pages: 140, year: 2080, description: 'Nepali textbook for Grade 9 with comprehensive literature.', isbn: '978-9937-0-XXXXX-152', category: 'Nepali', total_copies: 50, available_copies: 33, borrow_count: 210, rating: 4.6, status: 'available', shelf: 'CDC-G9', rack: 9 },
  { id: 156, title: 'Mathematics Class 9', author: 'CDC Nepal', publisher: 'CDC, MoEST', grade: '9', subject: 'Mathematics', language: 'Nepali', pages: 150, year: 2080, description: 'Mathematics textbook for Grade 9.', isbn: '978-9937-0-XXXXX-156', category: 'Mathematics', total_copies: 50, available_copies: 38, borrow_count: 175, rating: 4.3, status: 'available', shelf: 'CDC-G9', rack: 9 },
  { id: 160, title: 'English Class 10', author: 'CDC Nepal', publisher: 'CDC, MoEST', grade: '10', subject: 'English', language: 'English', pages: 160, year: 2080, description: 'English textbook for Grade 10 BLE preparation.', isbn: '978-9937-0-XXXXX-160', category: 'English', total_copies: 50, available_copies: 34, borrow_count: 215, rating: 4.6, status: 'available', shelf: 'CDC-G10', rack: 10 },
];

const settings = [
  { key: 'library_name', value: { name: 'Saraswati Sec School Library' } },
  { key: 'borrow_duration', value: { days: 14 } },
  { key: 'max_books_per_student', value: { max: 3 } },
  { key: 'fine_per_day', value: { amount: 5 } },
  { key: 'max_renewals', value: { count: 1 } },
];

async function seed() {
  console.log('Starting database seed...\n');

  console.log('1. Creating auth users...');
  const userIds = {};
  for (const u of users) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { name: u.name, role: u.role }
    });
    if (error) {
      if (error.message.includes('already registered')) {
        const { data: existing } = await supabase.auth.admin.listUsers();
        const found = existing.users.find(e => e.email === u.email);
        if (found) {
          userIds[u.email] = found.id;
          console.log(`  User exists: ${u.email}`);
        }
      } else {
        console.log(`  Error creating ${u.email}: ${error.message}`);
      }
    } else {
      userIds[u.email] = data.user.id;
      console.log(`  Created: ${u.email} (${u.role})`);
    }
  }

  console.log('\n2. Updating profiles...');
  for (const u of users) {
    const uid = userIds[u.email];
    if (!uid) continue;
    const { error } = await supabase.from('profiles').upsert({
      id: uid,
      name: u.name,
      email: u.email,
      role: u.role,
      grade: u.grade || '',
      className: u.className || '',
      avatar: u.name.split(' ').map(n => n[0]).join(''),
    }, { onConflict: 'id' });
    if (error) console.log(`  Profile error for ${u.email}: ${error.message}`);
    else console.log(`  Profile updated: ${u.name}`);
  }

  console.log('\n3. Inserting categories...');
  const { error: catErr } = await supabase.from('categories').upsert(categories, { onConflict: 'name' });
  if (catErr) console.log(`  Error: ${catErr.message}`);
  else console.log(`  Inserted ${categories.length} categories`);

  console.log('\n4. Inserting books...');
  const { error: bookErr } = await supabase.from('books').upsert(books, { onConflict: 'id' });
  if (bookErr) console.log(`  Error: ${bookErr.message}`);
  else console.log(`  Inserted ${books.length} books`);

  console.log('\n5. Inserting announcements...');
  const { error: annErr } = await supabase.from('announcements').insert(announcements);
  if (annErr) console.log(`  Error: ${annErr.message}`);
  else console.log(`  Inserted ${announcements.length} announcements`);

  console.log('\n6. Inserting events...');
  const { error: evtErr } = await supabase.from('events').insert(events);
  if (evtErr) console.log(`  Error: ${evtErr.message}`);
  else console.log(`  Inserted ${events.length} events`);

  console.log('\n7. Inserting settings...');
  for (const s of settings) {
    const { error } = await supabase.from('settings').upsert(s, { onConflict: 'key' });
    if (error) console.log(`  Settings error: ${error.message}`);
  }
  console.log(`  Inserted ${settings.length} settings`);

  console.log('\n8. Creating sample borrow requests...');
  const anitaId = userIds['anita.s@saraswatischool.edu.np'];
  const ramId = userIds['ram.b@saraswatischool.edu.np'];
  if (anitaId && ramId) {
    const sampleRequests = [
      { id: 'BR-20260714-0001', book_id: 160, book_title: 'English Class 10', student_id: ramId, student_name: 'Ram Bhandari', borrow_date: '2026-07-14', expected_return_date: '2026-07-28', status: 'pending' },
      { id: 'BR-20260713-0002', book_id: 148, book_title: 'Science & Technology Class 8', student_id: anitaId, student_name: 'Anita Sharma', borrow_date: '2026-07-13', expected_return_date: '2026-07-27', status: 'borrowed', approved_by: 'Laxmi Devi', approved_at: '2026-07-13T10:00:00Z' },
      { id: 'BR-20260710-0003', book_id: 156, book_title: 'Mathematics Class 9', student_id: anitaId, student_name: 'Anita Sharma', borrow_date: '2026-07-10', expected_return_date: '2026-07-24', status: 'overdue', approved_by: 'Laxmi Devi', approved_at: '2026-07-10T10:00:00Z' },
    ];
    const { error: brErr } = await supabase.from('borrow_requests').upsert(sampleRequests, { onConflict: 'id' });
    if (brErr) console.log(`  Error: ${brErr.message}`);
    else console.log(`  Inserted ${sampleRequests.length} sample borrow requests`);
  }

  console.log('\nSeed complete!');
  console.log('\nDemo credentials:');
  console.log('  Admin:    admin@saraswatischool.edu.np / admin123');
  console.log('  Student:  anita.s@saraswatischool.edu.np / student123');
  console.log('  Librarian: laxmi@saraswatischool.edu.np / librarian123');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
