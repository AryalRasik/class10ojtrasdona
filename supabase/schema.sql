-- ============================================================
-- Saraswati Sec School Library Management System
-- Supabase Schema (camelCase columns to match frontend)
-- ============================================================

-- Enable UUID extension (usually enabled by default in Supabase)
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. PROFILES (extends Supabase auth.users)
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  role text not null default 'student',
  grade text default '',
  className text default '',
  avatar text default '',
  borrow_count int default 0,
  reading_streak int default 0,
  teacher_id text default '',
  student_id text default '',
  department text default '',
  phone text default '',
  address text default '',
  approved boolean default false,
  membership_status text default 'active',
  membership_expiry timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- 1b. LEGACY SYNC
--     `create table if not exists` above will NOT add columns to a profiles
--     table that already exists, and an older live database may still use the
--     lowercase `classname` name. Without this block, guard_profile_update()
--     and handle_new_user() would fail on those databases with "column does
--     not exist" on the very first profile write (including approvals).
-- ============================================================
alter table public.profiles
  add column if not exists department text default '',
  add column if not exists phone text default '',
  add column if not exists address text default '',
  add column if not exists student_id text default '',
  add column if not exists teacher_id text default '',
  add column if not exists membership_status text default 'active',
  add column if not exists membership_expiry timestamptz;

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'profiles'
               and column_name = 'classname')
     and not exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'profiles'
               and column_name = 'className') then
    alter table public.profiles rename column classname to "className";
  end if;
end $$;

-- An earlier, broken version of is_staff() (COALESCE type error) may exist, and
-- `create or replace` cannot change a function's return type. Clear the helpers
-- ONLY when their signature does not already match what is created below:
-- dropping them unconditionally would sever the RLS policies that depend on
-- them and abort any second run of this file.
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure::text as signature,
           p.prorettype::regtype::text as return_type
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('is_admin', 'is_staff')
  loop
    if fn.return_type <> 'boolean' then
      execute format('drop function %s cascade', fn.signature);
    end if;
  end loop;
end $$;

-- SECURITY: Role helpers. SECURITY DEFINER so that RLS policies can call them
-- without recursing into the `profiles` policies themselves.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and role = 'admin' and approved is true);
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and role in ('admin','librarian') and approved is true);
$$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_staff() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.is_staff() to authenticated, service_role;

-- Auto-create profile on signup via trigger.
-- SECURITY: a public signup may only ever request a student/teacher role, and
-- `approved` is ALWAYS false. Staff accounts are created by an admin through
-- add_staff_account() -- never through the public signup form.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_role text;
begin
  user_role := lower(btrim(coalesce(new.raw_user_meta_data->>'role', 'student')));
  if user_role not in ('student', 'teacher') then
    user_role := 'student';
  end if;

  insert into public.profiles (
    id, name, email, role, grade, "className", department, student_id, approved
  )
  values (
    new.id,
    coalesce(
      nullif(btrim(coalesce(new.raw_user_meta_data->>'name', '')), ''),
      nullif(btrim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    coalesce(new.email, ''),
    user_role,
    coalesce(new.raw_user_meta_data->>'grade', ''),
    coalesce(
      new.raw_user_meta_data->>'className',
      new.raw_user_meta_data->>'class',
      ''
    ),
    coalesce(new.raw_user_meta_data->>'department', ''),
    coalesce(new.raw_user_meta_data->>'user_id', ''),
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- SECURITY: blocks "update my own profile row to role=admin / approved=true".
-- RLS filters rows, not columns, so the protected-column rule needs a trigger.
create or replace function public.guard_profile_update()
returns trigger as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if new.role                 is distinct from old.role
     or new.student_id        is distinct from old.student_id
     or new.teacher_id        is distinct from old.teacher_id
     or new.membership_status is distinct from old.membership_status
     or new.membership_expiry is distinct from old.membership_expiry
     or new.borrow_count      is distinct from old.borrow_count
     or new.reading_streak    is distinct from old.reading_streak
     or new.created_at        is distinct from old.created_at
     or new.id                is distinct from old.id then
    raise exception 'Only administrators can change role or membership fields'
      using errcode = '42501';
  end if;

  if new.approved is distinct from old.approved and not public.is_staff() then
    raise exception 'Only staff can approve or reject an account' using errcode = '42501';
  end if;

  if new.email is distinct from old.email
     and (auth.uid() is null or auth.uid() <> old.id) then
    raise exception 'You can only change your own email address' using errcode = '42501';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists guard_profile_update on public.profiles;
create trigger guard_profile_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ============================================================
-- 2. CATEGORIES
-- ============================================================
create table if not exists categories (
  id serial primary key,
  name text not null unique,
  icon text default 'folder',
  color text default '#6366f1',
  count int default 0
);

-- ============================================================
-- 3. BOOKS
-- ============================================================
create table if not exists books (
  id serial primary key,
  title text not null,
  author text not null default '',
  publisher text default '',
  grade text default '',
  subject text default '',
  language text default 'English',
  pages int default 0,
  year int default 2024,
  description text default '',
  pdf_url text default '',
  pdf_filename text default '',
  cover text default '',
  isbn text default '',
  category text default '',
  total_copies int default 1,
  available_copies int default 1,
  borrow_count int default 0,
  rating numeric(3,2) default 0,
  status text default 'available',
  shelf text default '',
  rack text default '',
  edition text default '',
  barcode text default '',
  digital_url text default '',
  thumbnail_url text default '',
  reservation_queue int default 0
);

-- Legacy sync: `create table if not exists` does not add columns to a `books`
-- table that already exists, and the live one predates these five. Needed for
-- idx_books_barcode above and for the book-detail views that read `edition`.
-- `pdf_filename` is the display name of the uploaded book PDF (see the
-- /api/books/:id/pdf endpoints in server.js).
alter table public.books
  add column if not exists edition text default '',
  add column if not exists barcode text default '',
  add column if not exists digital_url text default '',
  add column if not exists thumbnail_url text default '',
  add column if not exists reservation_queue int default 0,
  add column if not exists pdf_filename text default '';

-- ============================================================
-- 4. BORROW_REQUESTS
-- ============================================================
create table if not exists borrow_requests (
  id text primary key,
  book_id int not null references books(id) on delete cascade,
  book_title text not null default '',
  student_id uuid not null references profiles(id) on delete cascade,
  student_name text not null default '',
  borrow_date date default current_date,
  expected_return_date date,
  return_date date,
  request_time timestamptz default now(),
  status text not null default 'pending',
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  fine numeric(10,2) default 0,
  renewed boolean default false,
  rejection_reason text default ''
);

-- ============================================================
-- 5. NOTIFICATIONS
-- ============================================================
create table if not exists notifications (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  type text default 'info',
  title text not null default '',
  message text default '',
  icon text default 'bell',
  read boolean default false,
  time text default '',
  timestamp timestamptz default now()
);

-- ============================================================
-- 6. ANNOUNCEMENTS
-- ============================================================
create table if not exists announcements (
  id serial primary key,
  title text not null,
  content text default '',
  date date default current_date,
  priority text default 'normal',
  icon text default 'megaphone',
  active boolean default true
);

-- ============================================================
-- 7. EVENTS
-- ============================================================
create table if not exists events (
  id serial primary key,
  title text not null,
  description text default '',
  date date default current_date,
  time text default '',
  location text default '',
  type text default 'general',
  icon text default 'calendar',
  active boolean default true
);

-- ============================================================
-- 8. RESERVATIONS
-- ============================================================
create table if not exists reservations (
  id bigserial primary key,
  book_id int not null references books(id) on delete cascade,
  book_title text not null default '',
  student_id uuid not null references profiles(id) on delete cascade,
  student_name text not null default '',
  reserved_at timestamptz default now(),
  status text default 'active',
  expires_at timestamptz
);

-- ============================================================
-- 9. FAVORITES
-- ============================================================
create table if not exists favorites (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  book_id int not null references books(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, book_id)
);

-- ============================================================
-- 10. RECENTLY_VIEWED
-- ============================================================
create table if not exists recently_viewed (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  book_id int not null references books(id) on delete cascade,
  viewed_at timestamptz default now(),
  unique(user_id, book_id)
);

-- ============================================================
-- 11. REVIEWS
-- ============================================================
create table if not exists reviews (
  id bigserial primary key,
  book_id int not null references books(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  rating int not null default 5,
  comment text default '',
  created_at timestamptz default now(),
  unique(book_id, user_id)
);

-- ============================================================
-- 12. DIGITAL_BOOKS
-- ============================================================
create table if not exists digital_books (
  id serial primary key,
  title text not null,
  author text default '',
  description text default '',
  cover text default '',
  pdf_url text default '',
  format text default 'pdf',
  pages int default 0,
  category text default '',
  added_date timestamptz default now(),
  downloads int default 0,
  featured boolean default false
);

-- ============================================================
-- 12B. STUDY_MATERIALS (question papers / notes / model sets)
-- ============================================================
create table if not exists study_materials (
  id serial primary key,
  title text not null,
  type text default 'notes',
  grade text default '',
  subject text default '',
  year text default '',
  exam_type text default '',
  pdf_url text default '',
  description text default '',
  uploaded_by text default '',
  uploaded_at timestamptz default now(),
  downloads int default 0
);

-- ============================================================
-- 13. SETTINGS (key-value store for library settings)
-- ============================================================
create table if not exists settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- ============================================================
-- 14. ACHIEVEMENTS (gamification)
-- ============================================================
create table if not exists achievements (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  description text default '',
  icon text default 'trophy',
  earned_at timestamptz default now(),
  unique(user_id, name)
);

-- ============================================================
-- 15. LOGIN_HISTORY (tracks all login attempts)
-- ============================================================
create table if not exists login_history (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  ip inet,
  user_agent text default '',
  success boolean not null default false,
  timestamp timestamptz default now()
);

-- ============================================================
-- 16. ACTIVITY_LOGS (tracks user actions)
-- ============================================================
create table if not exists activity_logs (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete set null,
  action text not null default '',
  details text default '',
  ip inet,
  timestamp timestamptz default now()
);

-- ============================================================
-- 17. AUDIT_LOGS (tracks security events)
-- ============================================================
create table if not exists audit_logs (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete set null,
  action text not null default '',
  details text default '',
  ip inet,
  severity text default 'info',
  timestamp timestamptz default now()
);

-- ============================================================
-- 18. FINE_PAYMENTS (tracks fine payments)
-- ============================================================
create table if not exists fine_payments (
  id bigserial primary key,
  borrow_request_id text not null references borrow_requests(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  amount numeric(10,2) not null default 0,
  payment_date timestamptz default now(),
  payment_method text default '',
  receipt_number text default ''
);

-- ============================================================
-- 19. BOOK_IMPORTS (tracks CDC imports)
-- ============================================================
create table if not exists book_imports (
  id bigserial primary key,
  book_id int references books(id) on delete set null,
  source text default '',
  imported_at timestamptz default now(),
  status text default 'pending'
);

-- ============================================================
-- 20. FEEDBACK (user feedback)
-- ============================================================
create table if not exists feedback (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete set null,
  subject text default '',
  message text default '',
  rating int default 5,
  created_at timestamptz default now()
);

-- ============================================================
-- 21. CALENDAR_EVENTS (library calendar/holidays)
-- ============================================================
create table if not exists calendar_events (
  id bigserial primary key,
  title text not null,
  date date not null,
  type text default 'general',
  description text default ''
);

-- ============================================================
-- 22. FAQS (frequently asked questions)
-- ============================================================
create table if not exists faqs (
  id bigserial primary key,
  question text not null,
  answer text default '',
  category text default 'general',
  order_index int default 0
);

-- ============================================================
-- 23. CONTACT_MESSAGES (contact form submissions)
-- ============================================================
create table if not exists contact_messages (
  id bigserial primary key,
  name text not null default '',
  email text not null default '',
  subject text default '',
  message text default '',
  read boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- 24. SESSIONS (server-side session management)
-- ============================================================
create table if not exists sessions (
  id bigserial primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  token text not null unique,
  ip inet,
  user_agent text default '',
  created_at timestamptz default now(),
  expires_at timestamptz not null
);

-- ============================================================
-- INDEXES
-- ============================================================
-- Legacy sync: an integer/bigint primary key with no default and no identity
-- makes EVERY id-less INSERT fail with a not-null violation. The app inserts
-- without an id into notifications (including the "Registration Approved"
-- notice sent after an approval), favorites, recently_viewed, reviews,
-- reservations, achievements, books, categories, announcements, events and
-- digital_books - and those calls are wrapped in .catch(() => {}), so the
-- failure is silent. Only columns that are genuinely plain are changed;
-- `is_identity = 'NO'` protects a column that already is an identity, and
-- `column_default is null` protects a serial. Existing rows are accounted for
-- by restarting the sequence above max(id).
do $$
declare
  t record;
  c record;
  next_id bigint;
begin
  for t in
    select * from (values
      ('achievements'), ('announcements'), ('books'), ('categories'),
      ('digital_books'), ('events'), ('favorites'), ('notifications'),
      ('recently_viewed'), ('reservations'), ('reviews')
    ) as x(table_name)
  loop
    for c in
      select column_name, data_type, column_default, is_identity, is_nullable
      from information_schema.columns
      where table_schema = 'public'
        and table_name = t.table_name
        and column_name = 'id'
        and data_type in ('integer', 'bigint')
        and is_nullable = 'NO'
    loop
      if c.column_default is null and c.is_identity = 'NO' then
        execute format('alter table public.%I alter column %I add generated by default as identity',
                       t.table_name, c.column_name);
        execute format('select coalesce(max(%I), 0) + 1 from public.%I',
                       c.column_name, t.table_name) into next_id;
        execute format('alter table public.%I alter column %I restart with %s',
                       t.table_name, c.column_name, next_id);
      end if;
    end loop;
  end loop;
end $$;

-- ============================================================
-- INDEXES
-- ============================================================
-- Created through a guarded loop rather than 34 bare statements: a legacy
-- database may predate some of the indexed columns (this project's live
-- `books` has no `barcode`, and its `activity_logs` has `created_at` instead
-- of `timestamp`). This whole file runs as ONE transaction, so a single
-- `create index` on a missing column would roll back everything - including
-- the approve/reject fixes. An index is simply skipped when its table or
-- column does not exist.
do $$
declare
  ix record;
begin
  for ix in
    select * from (values
      ('idx_books_category',             'books',             'category'),
      ('idx_books_status',               'books',             'status'),
      ('idx_books_title',                'books',             'title'),
      ('idx_books_isbn',                 'books',             'isbn'),
      ('idx_books_barcode',              'books',             'barcode'),
      ('idx_borrow_requests_student',    'borrow_requests',   'student_id'),
      ('idx_borrow_requests_status',     'borrow_requests',   'status'),
      ('idx_borrow_requests_book',       'borrow_requests',   'book_id'),
      ('idx_notifications_user',         'notifications',     'user_id'),
      ('idx_notifications_read',         'notifications',     'read'),
      ('idx_favorites_user',             'favorites',         'user_id'),
      ('idx_recently_viewed_user',       'recently_viewed',   'user_id'),
      ('idx_reservations_student',       'reservations',      'student_id'),
      ('idx_reviews_book',               'reviews',           'book_id'),
      ('idx_achievements_user',          'achievements',      'user_id'),
      ('idx_login_history_user',         'login_history',     'user_id'),
      ('idx_login_history_timestamp',    'login_history',     'timestamp'),
      ('idx_activity_logs_user',         'activity_logs',     'user_id'),
      ('idx_activity_logs_timestamp',    'activity_logs',     'timestamp'),
      ('idx_audit_logs_user',            'audit_logs',        'user_id'),
      ('idx_audit_logs_severity',        'audit_logs',        'severity'),
      ('idx_audit_logs_timestamp',       'audit_logs',        'timestamp'),
      ('idx_fine_payments_student',      'fine_payments',     'student_id'),
      ('idx_fine_payments_borrow',       'fine_payments',     'borrow_request_id'),
      ('idx_book_imports_book',          'book_imports',      'book_id'),
      ('idx_book_imports_status',        'book_imports',      'status'),
      ('idx_feedback_user',              'feedback',          'user_id'),
      ('idx_calendar_events_date',       'calendar_events',   'date'),
      ('idx_faqs_category',              'faqs',              'category'),
      ('idx_contact_messages_read',      'contact_messages',  'read'),
      ('idx_sessions_user',              'sessions',          'user_id'),
      ('idx_sessions_token',             'sessions',          'token'),
      ('idx_sessions_expires',           'sessions',          'expires_at'),
      ('idx_profiles_membership',        'profiles',          'membership_status')
    ) as t(idx_name, tbl_name, col_name)
  loop
    if exists (
      select 1 from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = ix.tbl_name
        and c.column_name = ix.col_name
    ) then
      execute format('create index if not exists %I on public.%I (%I)',
                     ix.idx_name, ix.tbl_name, ix.col_name);
    end if;
  end loop;
end $$;

-- ============================================================
-- Row Level Security
-- ============================================================
-- SECURITY NOTES (2026-09-30 hardening):
--   * Role checks go through public.is_admin() / public.is_staff(), which are
--     SECURITY DEFINER, so they cannot recurse into the `profiles` policies.
--   * `profiles` is readable ONLY by the owner and staff. Anonymous users get
--     nothing; students get nothing but their own row. Public, non-identifying
--     fields are exposed through the `public_profiles` view below.
--   * The public signup form can only ever create a student/teacher profile
--     with approved=false (see handle_new_user above).
--   * guard_profile_update (above) stops anyone from self-promoting their own
--     role/approved fields, which RLS alone cannot express.
--   * Log tables are service-role-write only.

-- Recreate the privileged RPCs at their current signatures. A live database
-- created from an older schema may still hold a previous version of any of
-- these with a different argument list or return type, and `create or replace`
-- can change NEITHER - it would abort the whole script. Drop them by name,
-- regardless of signature, first.
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure::text as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('add_staff_account', 'delete_account', 'delete_my_account',
                        'reject_registration', 'notify_staff_of_registration')
  loop
    execute format('drop function if exists %s', r.sig);
  end loop;
end $$;

-- Admin helper: create a staff account (auth user + profile), approved automatically
create or replace function public.add_staff_account(
  p_email text,
  p_password text,
  p_name text,
  p_role text default 'librarian',
  p_department text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can add staff accounts' using errcode = '42501';
  end if;

  if p_role not in ('librarian', 'admin') then
    raise exception 'Invalid staff role' using errcode = '22023';
  end if;

  if p_password is null or length(p_password) < 8
     or p_password !~ '[A-Z]' or p_password !~ '[a-z]' or p_password !~ '[0-9]' then
    raise exception 'Password must be at least 8 characters with upper, lower and a number'
      using errcode = '22023';
  end if;

  -- Never silently promote an existing member account into staff.
  if exists (select 1 from public.profiles where email = p_email) then
    raise exception 'That email already has a library account. Change their role from Manage Users instead.'
      using errcode = '23505';
  end if;

  v_user_id := extensions.uuid_generate_v4();
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    p_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('name', p_name),
    now(), now()
  );

  insert into public.profiles (id, name, email, role, department, approved)
  values (v_user_id, p_name, p_email, p_role, p_department, true)
  on conflict (id) do update
    set name       = excluded.name,
        role       = excluded.role,
        department = excluded.department,
        approved   = true,
        email      = excluded.email;

  return v_user_id;
end;
$$;

-- Admin helper: delete another account (auth user + profile cascade)
create or replace function public.delete_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can delete accounts' using errcode = '42501';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'You cannot delete your own account' using errcode = '42501';
  end if;

  if (select role from public.profiles where id = p_user_id) = 'admin'
     and (select count(*) from public.profiles where role = 'admin' and approved is true) <= 1 then
    raise exception 'This is the last administrator account and cannot be deleted'
      using errcode = '42501';
  end if;

  delete from auth.users where id = p_user_id;
  -- Profiles created outside this script may have no FK back to auth.users,
  -- in which case ON DELETE CASCADE never fires and the roster would still
  -- show the deleted account. Removing it explicitly is a no-op when the
  -- cascade already took it.
  delete from public.profiles where id = p_user_id;
end;
$$;

-- A user may delete their OWN account only (settings > danger zone)
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  delete from auth.users where id = auth.uid();
  delete from public.profiles where id = auth.uid();
end;
$$;

-- Librarian/staff "reject registration" action. Staff may remove a
-- registration ONLY while it is still unapproved AND holds a non-staff role,
-- so this can never delete an approved member or another staff account.
create or replace function public.reject_registration(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_role text;
  v_approved boolean;
begin
  if not public.is_staff() then
    raise exception 'Only staff can reject a registration' using errcode = '42501';
  end if;

  select role, approved into v_role, v_approved
  from public.profiles
  where id = p_user_id;

  if v_role is null then
    raise exception 'Account not found' using errcode = 'P0002';
  end if;

  if v_role in ('admin', 'librarian') or v_approved is true then
    raise exception 'Only unapproved student or teacher registrations can be rejected'
      using errcode = '42501';
  end if;

  delete from auth.users where id = p_user_id;
  delete from public.profiles where id = p_user_id;
end;
$$;

revoke all on function public.add_staff_account(text, text, text, text, text) from public, anon;
revoke all on function public.delete_account(uuid) from public, anon;
revoke all on function public.reject_registration(uuid) from public, anon;
revoke all on function public.delete_my_account() from public, anon;

grant execute on function public.add_staff_account(text, text, text, text, text)
  to authenticated, service_role;
grant execute on function public.delete_account(uuid) to authenticated, service_role;
grant execute on function public.reject_registration(uuid) to authenticated, service_role;
grant execute on function public.delete_my_account() to authenticated, service_role;

-- Staff notification on registration (replaces the unauthenticated client
-- fan-out that let any signed-up user write a notification row for anyone)
create or replace function public.notify_staff_of_registration(
  p_user_id uuid,
  p_name text,
  p_role text
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'You can only announce your own registration' using errcode = '42501';
  end if;

  insert into public.notifications (user_id, type, title, message, icon, read, time, timestamp)
  select
    p.id,
    'info',
    'New Registration Request',
    coalesce(p_name, 'A new user') || ' (' || coalesce(p_role, 'student')
      || ') has registered and is awaiting approval.',
    'user-plus',
    false,
    now()::text,
    now()
  from public.profiles p
  where p.role in ('admin', 'librarian') and p.approved is true;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.notify_staff_of_registration(uuid, text, text) from public, anon;
grant execute on function public.notify_staff_of_registration(uuid, text, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Clean slate: drop EVERY policy on the tables this file manages before
-- recreating them. Two policies here (borrow_insert_staff and
-- reservations_insert_staff) had no matching `drop policy if exists`, which
-- made any re-run of the file fail with "policy ... already exists" - and this
-- file runs as one transaction, so that would roll back everything else too.
-- Tables outside this list (borrow_records, fines, students, teachers, ...) are
-- not touched. On a first run there is nothing to drop.
-- ---------------------------------------------------------------------------
do $$
declare
  p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in (
        'achievements',
        'activity_logs',
        'announcements',
        'audit_logs',
        'book_imports',
        'books',
        'borrow_requests',
        'calendar_events',
        'categories',
        'contact_messages',
        'digital_books',
        'events',
        'faqs',
        'favorites',
        'feedback',
        'fine_payments',
        'login_history',
        'notifications',
        'profiles',
        'recently_viewed',
        'reservations',
        'reviews',
        'sessions',
        'settings',
        'study_materials',
        'user_preferences'
      )
  loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- Profiles: owner + staff only. No anonymous access, no self-insert, no
-- self-promotion. Column protection lives in the guard_profile_update trigger.
alter table public.profiles enable row level security;
drop policy if exists "profiles_select_all" on public.profiles;
drop policy if exists "profiles_select_self_or_staff" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_update_self_or_staff" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_insert_admin" on public.profiles;
drop policy if exists "profiles_delete_admin" on public.profiles;

create policy "profiles_select_self_or_staff" on public.profiles for select to authenticated
  using (auth.uid() = id or public.is_staff());
create policy "profiles_update_self_or_staff" on public.profiles for update to authenticated
  using (auth.uid() = id or public.is_staff())
  with check (auth.uid() = id or public.is_staff());
create policy "profiles_insert_admin" on public.profiles for insert to authenticated
  with check (public.is_admin());
create policy "profiles_delete_admin" on public.profiles for delete to authenticated
  using (public.is_admin());

revoke all on table public.profiles from anon;
grant select, update on table public.profiles to authenticated;

-- Public, non-identifying profile view used for book/review attribution.
-- Deliberately excludes email, phone, address, student_id, role, approved.
create or replace view public.public_profiles as
  select id, name, avatar from public.profiles;

grant select on public.public_profiles to anon, authenticated;

-- Books: everyone can read, only admins can modify
alter table public.books enable row level security;
drop policy if exists "books_select_all" on public.books;
drop policy if exists "books_insert_admin" on public.books;
drop policy if exists "books_update_admin" on public.books;
drop policy if exists "books_delete_admin" on public.books;
create policy "books_select_all" on public.books for select to anon, authenticated using (true);
create policy "books_insert_admin" on public.books for insert to authenticated with check (public.is_admin());
create policy "books_update_admin" on public.books for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "books_delete_admin" on public.books for delete to authenticated using (public.is_admin());

-- Categories: everyone can read, only admins can modify
alter table public.categories enable row level security;
drop policy if exists "categories_select_all" on public.categories;
drop policy if exists "categories_insert_admin" on public.categories;
drop policy if exists "categories_update_admin" on public.categories;
drop policy if exists "categories_delete_admin" on public.categories;
create policy "categories_select_all" on public.categories for select to anon, authenticated using (true);
create policy "categories_insert_admin" on public.categories for insert to authenticated with check (public.is_admin());
create policy "categories_update_admin" on public.categories for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "categories_delete_admin" on public.categories for delete to authenticated using (public.is_admin());

-- Borrow requests: owner sees own, staff see all.
-- A student can only create a PENDING request; approval is a staff action.
alter table public.borrow_requests enable row level security;
drop policy if exists "borrow_select_own" on public.borrow_requests;
drop policy if exists "borrow_insert_own" on public.borrow_requests;
drop policy if exists "borrow_insert_own_pending" on public.borrow_requests;
drop policy if exists "borrow_update_admin" on public.borrow_requests;
drop policy if exists "borrow_update_staff" on public.borrow_requests;
create policy "borrow_select_own" on public.borrow_requests for select to authenticated
  using (auth.uid() = student_id or public.is_staff());
create policy "borrow_insert_own_pending" on public.borrow_requests for insert to authenticated
  with check (
    auth.uid() = student_id
    and coalesce(status, 'pending') = 'pending'
    and approved_by is null
    and approved_at is null
  );
create policy "borrow_update_staff" on public.borrow_requests for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());
-- Staff may record historical / already-decided rows (CSV borrow import).
create policy "borrow_insert_staff" on public.borrow_requests for insert to authenticated
  with check (public.is_staff());

-- Notifications: owner manages own; staff can read all
alter table public.notifications enable row level security;
drop policy if exists "notifications_select_own" on public.notifications;
drop policy if exists "notifications_insert_own" on public.notifications;
drop policy if exists "notifications_update_own" on public.notifications;
drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_select_own" on public.notifications for select to authenticated
  using (auth.uid() = user_id or public.is_staff());
create policy "notifications_insert_own" on public.notifications for insert to authenticated
  with check (auth.uid() = user_id or public.is_staff());
create policy "notifications_update_own" on public.notifications for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notifications_delete_own" on public.notifications for delete to authenticated
  using (auth.uid() = user_id);

-- Announcements: everyone can read, admins can manage
alter table public.announcements enable row level security;
drop policy if exists "announcements_select_all" on public.announcements;
drop policy if exists "announcements_insert_admin" on public.announcements;
drop policy if exists "announcements_update_admin" on public.announcements;
drop policy if exists "announcements_delete_admin" on public.announcements;
create policy "announcements_select_all" on public.announcements for select to anon, authenticated using (true);
create policy "announcements_insert_admin" on public.announcements for insert to authenticated with check (public.is_admin());
create policy "announcements_update_admin" on public.announcements for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "announcements_delete_admin" on public.announcements for delete to authenticated using (public.is_admin());

-- Events: everyone can read, admins can manage
alter table public.events enable row level security;
drop policy if exists "events_select_all" on public.events;
drop policy if exists "events_insert_admin" on public.events;
drop policy if exists "events_update_admin" on public.events;
drop policy if exists "events_delete_admin" on public.events;
create policy "events_select_all" on public.events for select to anon, authenticated using (true);
create policy "events_insert_admin" on public.events for insert to authenticated with check (public.is_admin());
create policy "events_update_admin" on public.events for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "events_delete_admin" on public.events for delete to authenticated using (public.is_admin());

-- Reservations: owner sees own, staff see all. Owner cannot self-fulfil.
alter table public.reservations enable row level security;
drop policy if exists "reservations_select_own" on public.reservations;
drop policy if exists "reservations_insert_own" on public.reservations;
drop policy if exists "reservations_update_own" on public.reservations;
drop policy if exists "reservations_update_staff" on public.reservations;
create policy "reservations_select_own" on public.reservations for select to authenticated
  using (auth.uid() = student_id or public.is_staff());
create policy "reservations_insert_own" on public.reservations for insert to authenticated
  with check (auth.uid() = student_id and coalesce(status, 'active') in ('active', 'waiting'));
create policy "reservations_update_staff" on public.reservations for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy "reservations_insert_staff" on public.reservations for insert to authenticated
  with check (public.is_staff());

-- Favorites: users manage their own
alter table public.favorites enable row level security;
drop policy if exists "favorites_select_own" on public.favorites;
drop policy if exists "favorites_insert_own" on public.favorites;
drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_select_own" on public.favorites for select to authenticated using (auth.uid() = user_id);
create policy "favorites_insert_own" on public.favorites for insert to authenticated with check (auth.uid() = user_id);
create policy "favorites_delete_own" on public.favorites for delete to authenticated using (auth.uid() = user_id);

-- Recently viewed: users manage their own
alter table public.recently_viewed enable row level security;
drop policy if exists "recently_viewed_select_own" on public.recently_viewed;
drop policy if exists "recently_viewed_insert_own" on public.recently_viewed;
drop policy if exists "recently_viewed_delete_own" on public.recently_viewed;
create policy "recently_viewed_select_own" on public.recently_viewed for select to authenticated using (auth.uid() = user_id);
create policy "recently_viewed_insert_own" on public.recently_viewed for insert to authenticated with check (auth.uid() = user_id);
create policy "recently_viewed_delete_own" on public.recently_viewed for delete to authenticated using (auth.uid() = user_id);

-- Reviews: everyone can read, users manage their own
alter table public.reviews enable row level security;
drop policy if exists "reviews_select_all" on public.reviews;
drop policy if exists "reviews_insert_own" on public.reviews;
drop policy if exists "reviews_update_own" on public.reviews;
drop policy if exists "reviews_delete_own" on public.reviews;
create policy "reviews_select_all" on public.reviews for select to anon, authenticated using (true);
create policy "reviews_insert_own" on public.reviews for insert to authenticated with check (auth.uid() = user_id);
create policy "reviews_update_own" on public.reviews for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reviews_delete_own" on public.reviews for delete to authenticated using (auth.uid() = user_id);

-- Digital books: everyone can read, admins can manage
alter table public.digital_books enable row level security;
drop policy if exists "digital_books_select_all" on public.digital_books;
drop policy if exists "digital_books_insert_admin" on public.digital_books;
drop policy if exists "digital_books_update_admin" on public.digital_books;
drop policy if exists "digital_books_delete_admin" on public.digital_books;
create policy "digital_books_select_all" on public.digital_books for select to anon, authenticated using (true);
create policy "digital_books_insert_admin" on public.digital_books for insert to authenticated with check (public.is_admin());
create policy "digital_books_update_admin" on public.digital_books for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "digital_books_delete_admin" on public.digital_books for delete to authenticated using (public.is_admin());

-- Study materials: everyone can read, admins/librarians manage
alter table public.study_materials enable row level security;
drop policy if exists "study_materials_select_all" on public.study_materials;
drop policy if exists "study_materials_insert_staff" on public.study_materials;
drop policy if exists "study_materials_update_staff" on public.study_materials;
drop policy if exists "study_materials_delete_staff" on public.study_materials;
create policy "study_materials_select_all" on public.study_materials for select to anon, authenticated using (true);
create policy "study_materials_insert_staff" on public.study_materials for insert to authenticated with check (public.is_staff());
create policy "study_materials_update_staff" on public.study_materials for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "study_materials_delete_staff" on public.study_materials for delete to authenticated using (public.is_staff());

-- Settings: everyone reads, ONLY admins write.
-- Never store SMTP credentials in this table.
alter table public.settings enable row level security;
drop policy if exists "settings_select_all" on public.settings;
drop policy if exists "settings_upsert_admin" on public.settings;
drop policy if exists "settings_update_admin" on public.settings;
drop policy if exists "settings_insert_authenticated" on public.settings;
drop policy if exists "settings_update_authenticated" on public.settings;
create policy "settings_select_all" on public.settings for select to anon, authenticated using (true);
create policy "settings_upsert_admin" on public.settings for insert to authenticated with check (public.is_admin());
create policy "settings_update_admin" on public.settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Personal (per-user) preferences. Kept out of the global `settings` table so
-- a student can save their own theme/notifications without being able to
-- rewrite library-wide configuration.
create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;
drop policy if exists "user_preferences_select_own" on public.user_preferences;
drop policy if exists "user_preferences_upsert_own" on public.user_preferences;
drop policy if exists "user_preferences_update_own" on public.user_preferences;
drop policy if exists "user_preferences_delete_own" on public.user_preferences;
create policy "user_preferences_select_own" on public.user_preferences for select to authenticated using (auth.uid() = user_id);
create policy "user_preferences_upsert_own" on public.user_preferences for insert to authenticated with check (auth.uid() = user_id);
create policy "user_preferences_update_own" on public.user_preferences for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_preferences_delete_own" on public.user_preferences for delete to authenticated using (auth.uid() = user_id);

revoke all on table public.user_preferences from anon;
grant select, insert, update, delete on table public.user_preferences to authenticated;

-- Achievements: users see own, admins see all
alter table public.achievements enable row level security;
drop policy if exists "achievements_select_own" on public.achievements;
drop policy if exists "achievements_insert_own" on public.achievements;
create policy "achievements_select_own" on public.achievements for select to authenticated
  using (auth.uid() = user_id or public.is_admin());
create policy "achievements_insert_own" on public.achievements for insert to authenticated with check (auth.uid() = user_id);

-- Login history: admins read; writes are service-role only (no client policy)
alter table public.login_history enable row level security;
drop policy if exists "login_history_select_own" on public.login_history;
drop policy if exists "login_history_select_admin" on public.login_history;
drop policy if exists "login_history_insert_service" on public.login_history;
create policy "login_history_select_admin" on public.login_history for select to authenticated using (public.is_admin());

-- Activity logs: admins read; writes are service-role only
alter table public.activity_logs enable row level security;
drop policy if exists "activity_logs_select_own" on public.activity_logs;
drop policy if exists "activity_logs_select_admin" on public.activity_logs;
drop policy if exists "activity_logs_insert_service" on public.activity_logs;
create policy "activity_logs_select_admin" on public.activity_logs for select to authenticated using (public.is_admin());

-- Audit logs: only admins can read; writes are service-role only
alter table public.audit_logs enable row level security;
drop policy if exists "audit_logs_select_admin" on public.audit_logs;
drop policy if exists "audit_logs_insert_service" on public.audit_logs;
create policy "audit_logs_select_admin" on public.audit_logs for select to authenticated using (public.is_admin());

revoke insert, update, delete on table public.login_history  from anon, authenticated;
revoke insert, update, delete on table public.activity_logs from anon, authenticated;
revoke insert, update, delete on table public.audit_logs    from anon, authenticated;
grant select on table public.login_history, public.activity_logs, public.audit_logs to authenticated;

-- Fine payments: owner sees own, staff see all, staff record fines
alter table public.fine_payments enable row level security;
drop policy if exists "fine_payments_select_own" on public.fine_payments;
drop policy if exists "fine_payments_insert_admin" on public.fine_payments;
drop policy if exists "fine_payments_insert_staff" on public.fine_payments;
create policy "fine_payments_select_own" on public.fine_payments for select to authenticated
  using (auth.uid() = student_id or public.is_staff());
create policy "fine_payments_insert_staff" on public.fine_payments for insert to authenticated
  with check (public.is_staff());

-- Book imports: only admins can manage
alter table public.book_imports enable row level security;
drop policy if exists "book_imports_select_admin" on public.book_imports;
drop policy if exists "book_imports_insert_admin" on public.book_imports;
drop policy if exists "book_imports_update_admin" on public.book_imports;
create policy "book_imports_select_admin" on public.book_imports for select to authenticated using (public.is_admin());
create policy "book_imports_insert_admin" on public.book_imports for insert to authenticated with check (public.is_admin());
create policy "book_imports_update_admin" on public.book_imports for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Feedback: users see own, admins see all
alter table public.feedback enable row level security;
drop policy if exists "feedback_select_own" on public.feedback;
drop policy if exists "feedback_insert_own" on public.feedback;
create policy "feedback_select_own" on public.feedback for select to authenticated
  using (auth.uid() = user_id or public.is_admin());
create policy "feedback_insert_own" on public.feedback for insert to authenticated with check (auth.uid() = user_id);

-- Calendar events: everyone can read, admins can manage
alter table public.calendar_events enable row level security;
drop policy if exists "calendar_events_select_all" on public.calendar_events;
drop policy if exists "calendar_events_insert_admin" on public.calendar_events;
drop policy if exists "calendar_events_update_admin" on public.calendar_events;
drop policy if exists "calendar_events_delete_admin" on public.calendar_events;
create policy "calendar_events_select_all" on public.calendar_events for select to anon, authenticated using (true);
create policy "calendar_events_insert_admin" on public.calendar_events for insert to authenticated with check (public.is_admin());
create policy "calendar_events_update_admin" on public.calendar_events for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "calendar_events_delete_admin" on public.calendar_events for delete to authenticated using (public.is_admin());

-- FAQs: everyone can read, admins can manage
alter table public.faqs enable row level security;
drop policy if exists "faqs_select_all" on public.faqs;
drop policy if exists "faqs_insert_admin" on public.faqs;
drop policy if exists "faqs_update_admin" on public.faqs;
drop policy if exists "faqs_delete_admin" on public.faqs;
create policy "faqs_select_all" on public.faqs for select to anon, authenticated using (true);
create policy "faqs_insert_admin" on public.faqs for insert to authenticated with check (public.is_admin());
create policy "faqs_update_admin" on public.faqs for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "faqs_delete_admin" on public.faqs for delete to authenticated using (public.is_admin());

-- Contact messages: admins manage, anyone can submit the public form
alter table public.contact_messages enable row level security;
drop policy if exists "contact_messages_select_admin" on public.contact_messages;
drop policy if exists "contact_messages_insert_anon" on public.contact_messages;
drop policy if exists "contact_messages_update_admin" on public.contact_messages;
create policy "contact_messages_select_admin" on public.contact_messages for select to authenticated using (public.is_admin());
create policy "contact_messages_insert_anon" on public.contact_messages for insert to anon, authenticated with check (true);
create policy "contact_messages_update_admin" on public.contact_messages for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Sessions: users see own, admins see all
alter table public.sessions enable row level security;
drop policy if exists "sessions_select_own" on public.sessions;
drop policy if exists "sessions_insert_own" on public.sessions;
drop policy if exists "sessions_delete_own" on public.sessions;
create policy "sessions_select_own" on public.sessions for select to authenticated
  using (auth.uid() = user_id or public.is_admin());
create policy "sessions_insert_own" on public.sessions for insert to authenticated with check (auth.uid() = user_id);
create policy "sessions_delete_own" on public.sessions for delete to authenticated using (auth.uid() = user_id);
