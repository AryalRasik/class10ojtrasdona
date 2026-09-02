-- ============================================================
-- Saraswati Sec School Library Management System
-- Supabase Schema (camelCase columns to match frontend)
-- ============================================================

-- Enable UUID extension (usually enabled by default in Supabase)
create extension if not exists "uuid-ossp";

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

-- Auto-create profile on signup via trigger
-- Admin and librarian are auto-approved; students/teachers require approval
create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_role text;
  auto_approve boolean;
begin
  user_role := coalesce(new.raw_user_meta_data->>'role', 'student');
  auto_approve := user_role in ('admin', 'librarian');

  insert into public.profiles (id, name, email, role, approved)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    user_role,
    auto_approve
  );
  return new;
end;
$$ language plpgsql security definer;

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
create index if not exists idx_books_category on books(category);
create index if not exists idx_books_status on books(status);
create index if not exists idx_books_title on books(title);
create index if not exists idx_books_isbn on books(isbn);
create index if not exists idx_books_barcode on books(barcode);
create index if not exists idx_borrow_requests_student on borrow_requests(student_id);
create index if not exists idx_borrow_requests_status on borrow_requests(status);
create index if not exists idx_borrow_requests_book on borrow_requests(book_id);
create index if not exists idx_notifications_user on notifications(user_id);
create index if not exists idx_notifications_read on notifications(read);
create index if not exists idx_favorites_user on favorites(user_id);
create index if not exists idx_recently_viewed_user on recently_viewed(user_id);
create index if not exists idx_reservations_student on reservations(student_id);
create index if not exists idx_reviews_book on reviews(book_id);
create index if not exists idx_achievements_user on achievements(user_id);
create index if not exists idx_login_history_user on login_history(user_id);
create index if not exists idx_login_history_timestamp on login_history(timestamp);
create index if not exists idx_activity_logs_user on activity_logs(user_id);
create index if not exists idx_activity_logs_timestamp on activity_logs(timestamp);
create index if not exists idx_audit_logs_user on audit_logs(user_id);
create index if not exists idx_audit_logs_severity on audit_logs(severity);
create index if not exists idx_audit_logs_timestamp on audit_logs(timestamp);
create index if not exists idx_fine_payments_student on fine_payments(student_id);
create index if not exists idx_fine_payments_borrow on fine_payments(borrow_request_id);
create index if not exists idx_book_imports_book on book_imports(book_id);
create index if not exists idx_book_imports_status on book_imports(status);
create index if not exists idx_feedback_user on feedback(user_id);
create index if not exists idx_calendar_events_date on calendar_events(date);
create index if not exists idx_faqs_category on faqs(category);
create index if not exists idx_contact_messages_read on contact_messages(read);
create index if not exists idx_sessions_user on sessions(user_id);
create index if not exists idx_sessions_token on sessions(token);
create index if not exists idx_sessions_expires on sessions(expires_at);
create index if not exists idx_profiles_membership on profiles(membership_status);

-- ============================================================
-- Row Level Security
-- ============================================================
-- (defined below in the RLS section; adding admin helper functions)

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
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Only administrators can add staff accounts';
  end if;

  if p_role not in ('librarian', 'admin') then
    raise exception 'Invalid staff role';
  end if;

  v_user_id := (select id from auth.users where email = p_email limit 1);

  if v_user_id is null then
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
      crypt(p_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('name', p_name, 'role', p_role),
      now(), now()
    );
  end if;

  insert into public.profiles (id, name, email, role, department, approved)
  values (v_user_id, p_name, p_email, p_role, p_department, true)
  on conflict (id) do update
    set name = excluded.name,
        role = excluded.role,
        department = excluded.department,
        approved = true,
        email = excluded.email;

  return v_user_id;
end;
$$;

-- Admin helper: delete a user account (auth user + profile cascade)
create or replace function public.delete_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Only administrators can delete accounts';
  end if;
  delete from auth.users where id = p_user_id;
end;
$$;

-- Profiles: users can read all, update own or admin can update all
alter table profiles enable row level security;
create policy "profiles_select_all" on profiles for select using (true);
create policy "profiles_update_own" on profiles for update
  using (
    auth.uid() = id
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'librarian'))
  );
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);
create policy "profiles_delete_admin" on profiles for delete
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'librarian')));

-- Books: everyone can read, only admins can modify
alter table books enable row level security;
create policy "books_select_all" on books for select using (true);
create policy "books_insert_admin" on books for insert
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "books_update_admin" on books for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "books_delete_admin" on books for delete
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Categories: everyone can read, only admins can modify
alter table categories enable row level security;
create policy "categories_select_all" on categories for select using (true);
create policy "categories_insert_admin" on categories for insert
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "categories_update_admin" on categories for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "categories_delete_admin" on categories for delete
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Borrow requests: users see own, admins see all
alter table borrow_requests enable row level security;
create policy "borrow_select_own" on borrow_requests for select
  using (
    auth.uid() = student_id
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'librarian'))
  );
create policy "borrow_insert_own" on borrow_requests for insert
  with check (auth.uid() = student_id);
create policy "borrow_update_admin" on borrow_requests for update
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'librarian')));

-- Notifications: users see own, admins see all, admins can insert for anyone
alter table notifications enable row level security;
create policy "notifications_select_own" on notifications for select
  using (
    auth.uid() = user_id
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'librarian'))
  );
create policy "notifications_insert_own" on notifications for insert
  with check (
    auth.uid() = user_id
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'librarian'))
  );
create policy "notifications_update_own" on notifications for update
  using (auth.uid() = user_id);
create policy "notifications_delete_own" on notifications for delete
  using (auth.uid() = user_id);

-- Announcements: everyone can read, admins can manage
alter table announcements enable row level security;
create policy "announcements_select_all" on announcements for select using (true);
create policy "announcements_insert_admin" on announcements for insert
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "announcements_update_admin" on announcements for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "announcements_delete_admin" on announcements for delete
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Events: everyone can read, admins can manage
alter table events enable row level security;
create policy "events_select_all" on events for select using (true);
create policy "events_insert_admin" on events for insert
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "events_update_admin" on events for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "events_delete_admin" on events for delete
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Reservations: users see own, admins see all
alter table reservations enable row level security;
create policy "reservations_select_own" on reservations for select
  using (
    auth.uid() = student_id
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'librarian'))
  );
create policy "reservations_insert_own" on reservations for insert
  with check (auth.uid() = student_id);
create policy "reservations_update_own" on reservations for update
  using (
    auth.uid() = student_id
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'librarian'))
  );

-- Favorites: users manage their own
alter table favorites enable row level security;
create policy "favorites_select_own" on favorites for select using (auth.uid() = user_id);
create policy "favorites_insert_own" on favorites for insert with check (auth.uid() = user_id);
create policy "favorites_delete_own" on favorites for delete using (auth.uid() = user_id);

-- Recently viewed: users manage their own
alter table recently_viewed enable row level security;
create policy "recently_viewed_select_own" on recently_viewed for select using (auth.uid() = user_id);
create policy "recently_viewed_insert_own" on recently_viewed for insert with check (auth.uid() = user_id);
create policy "recently_viewed_delete_own" on recently_viewed for delete using (auth.uid() = user_id);

-- Reviews: everyone can read, users manage their own
alter table reviews enable row level security;
create policy "reviews_select_all" on reviews for select using (true);
create policy "reviews_insert_own" on reviews for insert with check (auth.uid() = user_id);
create policy "reviews_update_own" on reviews for update using (auth.uid() = user_id);
create policy "reviews_delete_own" on reviews for delete using (auth.uid() = user_id);

-- Digital books: everyone can read, admins can manage
alter table digital_books enable row level security;
create policy "digital_books_select_all" on digital_books for select using (true);
create policy "digital_books_insert_admin" on digital_books for insert
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "digital_books_update_admin" on digital_books for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "digital_books_delete_admin" on digital_books for delete
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Study materials: everyone can read, admins/librarians manage
alter table study_materials enable row level security;
create policy "study_materials_select_all" on study_materials for select using (true);
create policy "study_materials_insert_staff" on study_materials for insert
  with check (exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'librarian')));
create policy "study_materials_update_staff" on study_materials for update
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'librarian')));
create policy "study_materials_delete_staff" on study_materials for delete
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'librarian')));

-- Settings: admins manage, everyone reads
alter table settings enable row level security;
create policy "settings_select_all" on settings for select using (true);
create policy "settings_upsert_admin" on settings for insert
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "settings_update_admin" on settings for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- The SPA writes settings with the anon key (no service role/session), so also allow
-- writes when a matching profile is the current user, so admin settings can persist.
create policy "settings_insert_authenticated" on settings for insert
  with check (exists (select 1 from profiles where id = auth.uid()));
create policy "settings_update_authenticated" on settings for update
  using (exists (select 1 from profiles where id = auth.uid()));

-- Achievements: users see own, admins see all
alter table achievements enable row level security;
create policy "achievements_select_own" on achievements for select
  using (
    auth.uid() = user_id
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
create policy "achievements_insert_own" on achievements for insert
  with check (auth.uid() = user_id);

-- Login history: admins see all, users see own
alter table login_history enable row level security;
create policy "login_history_select_own" on login_history for select
  using (
    auth.uid() = user_id
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
create policy "login_history_insert_service" on login_history for insert
  with check (true);

-- Activity logs: admins see all, users see own
alter table activity_logs enable row level security;
create policy "activity_logs_select_own" on activity_logs for select
  using (
    auth.uid() = user_id
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
create policy "activity_logs_insert_service" on activity_logs for insert
  with check (true);

-- Audit logs: only admins can read, service role inserts
alter table audit_logs enable row level security;
create policy "audit_logs_select_admin" on audit_logs for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "audit_logs_insert_service" on audit_logs for insert
  with check (true);

-- Fine payments: users see own, admins see all
alter table fine_payments enable row level security;
create policy "fine_payments_select_own" on fine_payments for select
  using (
    auth.uid() = student_id
    or exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'librarian'))
  );
create policy "fine_payments_insert_admin" on fine_payments for insert
  with check (exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'librarian')));

-- Book imports: only admins can manage
alter table book_imports enable row level security;
create policy "book_imports_select_admin" on book_imports for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "book_imports_insert_admin" on book_imports for insert
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "book_imports_update_admin" on book_imports for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Feedback: users see own, admins see all; anyone can insert
alter table feedback enable row level security;
create policy "feedback_select_own" on feedback for select
  using (
    auth.uid() = user_id
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
create policy "feedback_insert_own" on feedback for insert
  with check (auth.uid() = user_id);

-- Calendar events: everyone can read, admins can manage
alter table calendar_events enable row level security;
create policy "calendar_events_select_all" on calendar_events for select using (true);
create policy "calendar_events_insert_admin" on calendar_events for insert
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "calendar_events_update_admin" on calendar_events for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "calendar_events_delete_admin" on calendar_events for delete
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- FAQs: everyone can read, admins can manage
alter table faqs enable row level security;
create policy "faqs_select_all" on faqs for select using (true);
create policy "faqs_insert_admin" on faqs for insert
  with check (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "faqs_update_admin" on faqs for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "faqs_delete_admin" on faqs for delete
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Contact messages: admins can manage, anyone can insert
alter table contact_messages enable row level security;
create policy "contact_messages_select_admin" on contact_messages for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));
create policy "contact_messages_insert_anon" on contact_messages for insert
  with check (true);
create policy "contact_messages_update_admin" on contact_messages for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Sessions: users see own, admins see all
alter table sessions enable row level security;
create policy "sessions_select_own" on sessions for select
  using (
    auth.uid() = user_id
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
create policy "sessions_insert_own" on sessions for insert
  with check (auth.uid() = user_id);
create policy "sessions_delete_own" on sessions for delete
  using (auth.uid() = user_id);
