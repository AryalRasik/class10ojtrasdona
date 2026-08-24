#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function excelDateToISO(serial) {
  if (!serial || typeof serial !== 'number') return null;
  const d = new Date((serial - 25569) * 86400000);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

function excelDateToBS(serial) {
  if (!serial || typeof serial !== 'number') return '';
  const d = new Date((serial - 25569) * 86400000);
  if (isNaN(d.getTime())) return String(serial);
  return d.toISOString().split('T')[0];
}

function cleanStr(s) {
  if (!s) return '';
  return String(s).replace(/[\r\n]+/g, ' ').trim();
}

function parsePricePages(s) {
  if (!s) return { price: '', pages: 0 };
  const str = String(s);
  const pageMatch = str.match(/(\d+)\s*(पृ|page|pg)/i);
  const pages = pageMatch ? parseInt(pageMatch[1]) : 0;
  const priceMatch = str.match(/(?:रु\.?\s*|US\$\s*)([\d,\.]+)/);
  const price = priceMatch ? priceMatch[1].replace(/,/g, '') : '';
  return { price, pages };
}

function parseISBN(s) {
  if (!s) return '';
  const str = String(s).trim();
  if (str === '—' || str === '-' || str.includes('अस्पष्ट')) return '';
  const cleaned = str.replace(/[^\d\-]/g, '');
  if (cleaned.length >= 10) return cleaned;
  return str.replace(/[\r\n]+/g, '').trim();
}

const nextBookId = 200;

async function main() {
  console.log('=== Excel Data Import ===\n');

  const allBooks = [];
  const allBorrowRecords = [];

  // ── EXCEL 1: excelofmyproject.xlsx ──
  console.log('1. Reading excelofmyproject.xlsx...');
  const wb1 = XLSX.readFile('C:\\Users\\Acer\\Documents\\excelofmyproject.xlsx');
  const ws1 = wb1.Sheets[wb1.SheetNames[0]];
  const d1 = XLSX.utils.sheet_to_json(ws1, { header: 1 });

  // Section 1: Class 11 borrow records (rows 1-4)
  for (let i = 1; i <= 4; i++) {
    const r = d1[i];
    if (!r || !r[1]) continue;
    allBorrowRecords.push({
      student_name: cleanStr(r[1]),
      grade: String(r[2] || '11'),
      subjects: cleanStr(r[3]),
      borrow_date: excelDateToISO(r[4]),
      return_date: excelDateToISO(r[5]),
      section: 'Class 11'
    });
  }

  // Section 2: Class 12 borrow records (rows 6-10)
  for (let i = 6; i <= 10; i++) {
    const r = d1[i];
    if (!r || !r[1]) continue;
    allBorrowRecords.push({
      student_name: cleanStr(r[1]),
      grade: String(r[2] || '12'),
      subjects: cleanStr(r[3]),
      borrow_date: excelDateToISO(r[4]),
      return_date: excelDateToISO(r[5]),
      section: 'Class 12'
    });
  }

  // Section 3: Book catalog (rows 12-21, corrected version rows 23-32)
  // Use corrected version (rows 23-32) as primary
  for (let i = 23; i <= 32; i++) {
    const r = d1[i];
    if (!r || !r[0] || typeof r[0] !== 'number') continue;
    const { price, pages } = parsePricePages(r[7]);
    allBooks.push({
      title: cleanStr(r[4]),
      author: cleanStr(r[5]),
      publisher: cleanStr(r[6]),
      isbn: parseISBN(r[3]),
      reg_no: cleanStr(r[1]),
      price: price,
      pages: pages || 0,
      date_received: excelDateToISO(r[2]),
      source: 'excel1_catalog'
    });
  }

  // Section 4: Additional books (rows 34-43)
  for (let i = 34; i <= 43; i++) {
    const r = d1[i];
    if (!r || !r[0] || typeof r[0] !== 'number') continue;
    allBooks.push({
      title: cleanStr(r[3]),
      author: '',
      publisher: '',
      isbn: '',
      reg_no: cleanStr(r[1]),
      price: '',
      pages: 0,
      date_received: excelDateToISO(r[2]),
      source: 'excel1_additional'
    });
  }

  console.log(`  Found ${allBorrowRecords.length} borrow records, ${allBooks.length} books so far`);

  // ── EXCEL 2: Book3.xlsx ──
  console.log('2. Reading Book3.xlsx...');
  const wb2 = XLSX.readFile('C:\\Users\\Acer\\Documents\\Book3.xlsx');
  const ws2 = wb2.Sheets[wb2.SheetNames[0]];
  const d2 = XLSX.utils.sheet_to_json(ws2, { header: 1 });

  for (let i = 8; i <= 10; i++) {
    const r = d2[i];
    if (!r || !r[0] || typeof r[0] !== 'number') continue;
    const { price, pages } = parsePricePages(r[7]);
    allBooks.push({
      title: cleanStr(r[4]),
      author: cleanStr(r[5]),
      publisher: cleanStr(r[6]),
      isbn: parseISBN(r[3]),
      reg_no: cleanStr(r[1]),
      price: price,
      pages: pages || 0,
      date_received: excelDateToISO(r[2]),
      source: 'book3'
    });
  }

  console.log(`  Found 3 more books (${allBooks.length} total)`);

  // ── EXCEL 3: Book4.xlsx ──
  console.log('3. Reading Book4.xlsx...');
  const wb3 = XLSX.readFile('C:\\Users\\Acer\\Documents\\Book4.xlsx');
  const ws3 = wb3.Sheets[wb3.SheetNames[0]];
  const d3 = XLSX.utils.sheet_to_json(ws3, { header: 1 });

  // Books (rows 1-9)
  for (let i = 1; i <= 9; i++) {
    const r = d3[i];
    if (!r || !r[0] || typeof r[0] !== 'number') continue;
    const titleAuthor = cleanStr(r[3]);
    const parts = titleAuthor.split('/');
    const title = cleanStr(parts[0]);
    const author = parts.length > 1 ? cleanStr(parts.slice(1).join('/')) : '';
    const pubYear = cleanStr(r[4]);
    const { price, pages } = parsePricePages(r[6]);
    allBooks.push({
      title: title,
      author: author,
      publisher: pubYear,
      isbn: parseISBN(r[5]),
      reg_no: cleanStr(r[1]),
      price: price,
      pages: pages || 0,
      date_received: excelDateToISO(r[2]),
      source: 'excel3'
    });
  }

  // Student borrow records from Book4 (rows 16-60)
  let currentStudent = null;
  for (let i = 16; i <= 60; i++) {
    const r = d3[i];
    if (!r) continue;

    if (r[0] && typeof r[0] === 'number' && r[1]) {
      currentStudent = {
        serial: r[0],
        student_name: cleanStr(r[1]),
        grade: '12',
        borrow_date: excelDateToBS(r[4]),
        subjects: []
      };
    }

    if (currentStudent && r[2]) {
      const subject = cleanStr(r[2]);
      if (subject && !['Physics', 'Chemistry', 'English', 'Maths', 'Math', 'सामाजिक अध्ययन'].includes(subject) === false || subject) {
        currentStudent.subjects.push(subject);
      }
    }

    if (r[0] && typeof r[0] === 'number' && r[1] && currentStudent && currentStudent.subjects.length > 0) {
      // If we hit a new student, save the previous one
    }
  }

  // Re-parse student borrow records more carefully
  const studentRecords = [];
  let cur = null;
  for (let i = 16; i <= 60; i++) {
    const r = d3[i];
    if (!r) continue;
    if (r[0] && typeof r[0] === 'number' && r[1] && String(r[1]).trim()) {
      if (cur) studentRecords.push(cur);
      cur = {
        student_name: cleanStr(r[1]),
        grade: '12',
        subjects: [],
        borrow_date: excelDateToBS(r[4])
      };
    }
    if (cur && r[2] && String(r[2]).trim()) {
      cur.subjects.push(cleanStr(r[2]));
    }
  }
  if (cur) studentRecords.push(cur);

  // Also parse rows 44-60 section (borrow with return dates)
  for (let i = 45; i <= 60; i++) {
    const r = d3[i];
    if (!r) continue;
    if (r[0] && typeof r[0] === 'number' && r[1] && String(r[1]).trim()) {
      const existing = studentRecords.find(s => s.student_name === cleanStr(r[1]));
      if (!existing) {
        studentRecords.push({
          student_name: cleanStr(r[1]),
          grade: '12',
          subjects: [],
          borrow_date: excelDateToBS(r[4])
        });
      }
    }
  }

  console.log(`  Found ${studentRecords.length} more student records`);

  // ── DEDUPLICATE BOOKS ──
  const seen = new Set();
  const uniqueBooks = [];
  for (const b of allBooks) {
    const key = (b.title + b.author).toLowerCase().replace(/\s+/g, '');
    if (!seen.has(key) && b.title) {
      seen.add(key);
      uniqueBooks.push(b);
    }
  }

  console.log(`\n  Total unique books: ${uniqueBooks.length}`);
  console.log(`  Total borrow records: ${allBorrowRecords.length + studentRecords.length}\n`);

  // ── CATEGORIZE BOOKS ──
  function categorize(title, author) {
    const t = (title + ' ' + author).toLowerCase();
    if (t.includes('nepali') || t.includes('नेपाली') || t.includes('व्याकरण') || t.includes('गाईड')) return 'Nepali';
    if (t.includes('english') || t.includes('grammar') || t.includes('dictionary') || t.includes('oxford')) return 'English';
    if (t.includes('math') || t.includes('गणित')) return 'Mathematics';
    if (t.includes('chemistry') || t.includes('रसायन')) return 'Science & Technology';
    if (t.includes('physics') || t.includes('भौतिक')) return 'Science & Technology';
    if (t.includes('science') || t.includes('विज्ञान')) return 'Science & Technology';
    if (t.includes('computer') || t.includes('कम्प्युटर') || t.includes('java') || t.includes('wmad') || t.includes('csa') || t.includes('os')) return 'Computer Science';
    if (t.includes('knowledge') || t.includes('ज्ञान') || t.includes('gk') || t.includes('iq')) return 'Social Studies';
    if (t.includes('social') || t.includes('सामाजिक')) return 'Social Studies';
    if (t.includes('economy') || t.includes('account')) return 'Economics';
    if (t.includes('health') || t.includes('शारीरिक')) return 'Health & Physical Education';
    return 'English';
  }

  // ── INSERT BOOKS ──
  console.log('4. Inserting books into Supabase...');
  let bookCount = 0;
  for (let i = 0; i < uniqueBooks.length; i++) {
    const b = uniqueBooks[i];
    const bookId = nextBookId + i;
    const category = categorize(b.title, b.author);

    const { error } = await supabase.from('books').upsert({
      id: bookId,
      title: b.title,
      author: b.author || 'Unknown',
      publisher: b.publisher || '',
      grade: '',
      subject: category,
      language: /^[\x00-\x7F]*$/.test(b.title) ? 'English' : 'Nepali',
      pages: b.pages || 0,
      year: 2082,
      description: `Imported from library records. Reg: ${b.reg_no || 'N/A'}`,
      isbn: b.isbn || '',
      category: category,
      total_copies: 1,
      available_copies: 1,
      borrow_count: 0,
      rating: 0,
      status: 'available',
      shelf: '',
      rack: 0
    }, { onConflict: 'id' });

    if (error) {
      console.log(`  Error book ${i + 1}: ${error.message}`);
    } else {
      bookCount++;
    }
  }
  console.log(`  Inserted ${bookCount} books`);

  // ── INSERT BORROW RECORDS ──
  console.log('\n5. Creating borrow request records...');

  // Get anita's user ID for attaching records
  const anonClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data: loginData } = await anonClient.auth.signInWithPassword({
    email: 'anita.s@saraswatischool.edu.np',
    password: 'student123'
  });
  const anitaId = loginData ? loginData.user.id : null;

  let borrowCount = 0;

  // Process excelofmyproject borrow records
  for (const rec of allBorrowRecords) {
    const borrowId = `BR-EXL-${String(borrowCount + 1).padStart(4, '0')}`;
    const { error } = await supabase.from('borrow_requests').upsert({
      id: borrowId,
      book_id: 200,
      book_title: rec.subjects || 'Multiple Books',
      student_id: anitaId || '00000000-0000-0000-0000-000000000002',
      student_name: rec.student_name,
      borrow_date: rec.borrow_date || '2026-01-01',
      expected_return_date: rec.return_date || '2026-02-01',
      return_date: rec.return_date || null,
      status: rec.return_date ? 'returned' : 'borrowed'
    }, { onConflict: 'id' });

    if (error) console.log(`  Borrow error: ${error.message}`);
    else borrowCount++;
  }

  // Process Book4 student records
  for (const rec of studentRecords) {
    const borrowId = `BR-BK4-${String(borrowCount + 1).padStart(4, '0')}`;
    const { error } = await supabase.from('borrow_requests').upsert({
      id: borrowId,
      book_id: 200,
      book_title: rec.subjects.join(', ') || 'Multiple Books',
      student_id: anitaId || '00000000-0000-0000-0000-000000000002',
      student_name: rec.student_name,
      borrow_date: rec.borrow_date || '2026-01-01',
      expected_return_date: '2026-03-01',
      status: 'returned'
    }, { onConflict: 'id' });

    if (error) console.log(`  Borrow error: ${error.message}`);
    else borrowCount++;
  }

  console.log(`  Created ${borrowCount} borrow records`);

  // ── Summary ──
  const { count: totalBooks } = await supabase.from('books').select('*', { count: 'exact', head: true });
  const { count: totalBorrows } = await supabase.from('borrow_requests').select('*', { count: 'exact', head: true });

  console.log(`\n=== Import Complete ===`);
  console.log(`Books in database: ${totalBooks}`);
  console.log(`Borrow records: ${totalBorrows}`);
  console.log(`\nNew books imported: ${bookCount}`);
  console.log(`New borrow records: ${borrowCount}`);
}

main().catch(e => { console.error('Import failed:', e); process.exit(1); });
