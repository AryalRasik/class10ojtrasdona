-- ============================================================================
-- Saraswati Sec School Library — SECURITY HARDENING MIGRATION
-- File    : supabase/migrations/20260930_security_hardening.sql
-- Project : cagbihfzktmebjkxwkwd
-- Date    : 2026-09-30
--
-- HOW TO APPLY (read fully before running)
-- ---------------------------------------
-- 1. Supabase Dashboard -> SQL Editor -> New query
-- 2. Paste this WHOLE file
-- 3. Press Run
--
-- WHAT THIS MIGRATION DOES NOT DO
-- -------------------------------
--   * It does NOT delete, truncate or UPDATE any row in `profiles`.
--   * It does NOT delete any user account.
--   * It does NOT change any column type or drop any table.
--   * It does NOT remove any table/column your app reads.
--   * It IS idempotent: every statement is `create or replace` /
--     `drop policy if exists` + `create policy`, so re-running is safe.
--
-- SIDE EFFECTS YOU SHOULD EXPECT (all intentional)
-- -------------------------------------------------
--   S1. Public signup can no longer create `admin`/`librarian` profiles.
--       A signup request that claims role=admin now becomes role=student,
--       approved=false. THIS IS THE MOST IMPORTANT FIX.
--   S2. After this migration, ANY account currently sitting in
--       profiles with role='admin' or 'librarian' but approved=false will
--       not be able to sign in. Run the PRE-FLIGHT query in section 0 and
--       fix those rows deliberately if any exist.
--   S3. Anonymous visitors can no longer read the `profiles` table at all
--       (that was a full PII dump: email/phone/address/student_id).
--   S4. Students can no longer read other students' profile rows.
--       Book-review author names keep working through the new
--       `public_profiles` view (id, name, avatar only).
--   S5. Only `admin` can change a role. `admin` AND `librarian` can still
--       approve a pending registration (existing librarian workflow kept).
--   S6. Only `admin` can delete an account. Librarians keep the roster view
--       and the approve/reject workflow.
--   S7. Global library `settings` rows can only be written by `admin`.
--   S8. Log tables (login_history / activity_logs / audit_logs) can no
--       longer be written by anybody except the service role.
--   S9. A student can no longer insert a borrow_request/reservation that is
--       already marked approved/completed (self-approval fix).
--  S10. `EXECUTE` on the two security-definer RPCs is no longer granted to
--       `anon` (they were, which is unnecessary attack surface).
--
-- ROLLBACK
-- --------
-- Restore the pre-migration policies with git:
--   git show backup-pre-security-audit-2026-09-30:supabase/schema.sql
-- The data is unchanged, so a rollback is policy-only.
-- ============================================================================


-- ============================================================================
-- SECTION 0 — PRE-FLIGHT (read-only; safe to run)
-- ============================================================================

-- 0.1  Staff accounts that are NOT approved. These will be blocked from
--      signing in after this migration. Expect: zero rows.
select id, email, role, approved
from public.profiles
where role in ('admin', 'librarian') and approved is not true;

-- 0.2  Unknown role values that will be coerced to 'student' by the guard.
select role, count(*) from public.profiles group by role order by 2 desc;

-- 0.3  Current policy inventory on profiles (what we are replacing).
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'profiles';

-- 0.4  Columns the `guard_profile_update` trigger protects.
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
order by ordinal_position;


-- ============================================================================
-- SECTION 0.5 — LEGACY COLUMN SYNC (needed on databases created before this
--              migration). `guard_profile_update` below references columns a
--              profiles table created by an older schema does not have, and
--              that would break EVERY profile write - including approvals -
--              with "column ... does not exist". Safe on a fresh database:
--              every statement is IF NOT EXISTS / guarded by a catalog check.
-- ============================================================================

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

-- An earlier, broken is_staff() (COALESCE type error) may still exist, and
-- `create or replace` cannot change a function's return type. Clear the
-- helpers ONLY when their signature does not already match Section 1: dropping
-- them unconditionally would sever the RLS policies that depend on them and
-- abort any second run of this migration.
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


-- ============================================================================
-- SECTION 1 — ROLE HELPERS (SECURITY DEFINER so RLS on profiles cannot
--              recurse into itself)
-- ============================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and approved is true
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'librarian') and approved is true
  );
$$;

comment on function public.is_admin() is
  'True only when the caller is an approved admin. SECURITY DEFINER avoids RLS recursion.';
comment on function public.is_staff() is
  'True only when the caller is an approved admin or librarian.';

revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_staff() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.is_staff() to authenticated, service_role;


-- ============================================================================
-- SECTION 2 — SIGNUP ROLE CLAMP  (fixes the admin self-signup escalation)
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
begin
  -- A public signup may only ever ask for a student or teacher account.
  -- Anything else (including 'admin' / 'librarian') is forced to 'student'.
  v_role := lower(btrim(coalesce(new.raw_user_meta_data ->> 'role', 'student')));
  if v_role not in ('student', 'teacher') then
    v_role := 'student';
  end if;

  -- approved is ALWAYS false for self-service signup. Staff accounts are
  -- created by an admin through add_staff_account(), never by the signup form.
  insert into public.profiles (
    id, name, email, role, grade, "className", department, student_id, approved
  )
  values (
    new.id,
    coalesce(
      nullif(btrim(coalesce(new.raw_user_meta_data ->> 'name', '')), ''),
      nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    coalesce(new.email, ''),
    v_role,
    coalesce(new.raw_user_meta_data ->> 'grade', ''),
    coalesce(
      new.raw_user_meta_data ->> 'className',
      new.raw_user_meta_data ->> 'class',
      ''
    ),
    coalesce(new.raw_user_meta_data ->> 'department', ''),
    coalesce(new.raw_user_meta_data ->> 'user_id', ''),
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Signup trigger. Role is clamped to student/teacher and approved is always false.';


-- ============================================================================
-- SECTION 3 — PROTECTED-FIELD GUARD ON `profiles`
--   Blocks the "update my own row to set role=admin, approved=true" attack
--   that RLS alone cannot express (RLS filters rows, not columns).
-- ============================================================================

create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Admin may change anything on any row.
  if public.is_admin() then
    return new;
  end if;

  -- ---- Admin-only fields -----------------------------------------------
  if new.role               is distinct from old.role
     or new.student_id      is distinct from old.student_id
     or new.teacher_id      is distinct from old.teacher_id
     or new.membership_status is distinct from old.membership_status
     or new.membership_expiry is distinct from old.membership_expiry
     or new.borrow_count    is distinct from old.borrow_count
     or new.reading_streak  is distinct from old.reading_streak
     or new.created_at      is distinct from old.created_at
     or new.id              is distinct from old.id then
    raise exception 'Only administrators can change role or membership fields'
      using errcode = '42501';
  end if;

  -- ---- Staff-only field (librarians keep the approval workflow) ---------
  if new.approved is distinct from old.approved then
    if not public.is_staff() then
      raise exception 'Only staff can approve or reject an account'
        using errcode = '42501';
    end if;
  end if;

  -- ---- Own-row fields --------------------------------------------------
  -- name, avatar, phone, address, grade, classname, department are allowed
  -- on your own row. email may also be changed, but only on your own row.
  if new.email is distinct from old.email then
    if auth.uid() is null or auth.uid() <> old.id then
      raise exception 'You can only change your own email address'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profile_update on public.profiles;
create trigger guard_profile_update
  before update on public.profiles
  for each row
  execute function public.guard_profile_update();


-- ============================================================================
-- SECTION 4 — `profiles` RULES (self + staff only; no anonymous access)
-- ============================================================================

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

alter table public.profiles enable row level security;

drop policy if exists profiles_select_all     on public.profiles;
drop policy if exists profiles_select_own_staff on public.profiles;
drop policy if exists profiles_update_own      on public.profiles;
drop policy if exists profiles_update_self_or_staff on public.profiles;
drop policy if exists profiles_insert_own      on public.profiles;
drop policy if exists profiles_delete_admin     on public.profiles;

-- Read: your own row, or every row if you are staff.
create policy "profiles_select_self_or_staff" on public.profiles
  for select to authenticated
  using (auth.uid() = id or public.is_staff());

-- Update: your own row (guarded by Section 3) or any row if you are staff.
create policy "profiles_update_self_or_staff" on public.profiles
  for update to authenticated
  using (auth.uid() = id or public.is_staff())
  with check (auth.uid() = id or public.is_staff());

-- Insert: admin only. Ordinary signups are handled by handle_new_user()
-- (SECURITY DEFINER), so no client-side insert is needed.
create policy "profiles_insert_admin" on public.profiles
  for insert to authenticated
  with check (public.is_admin());

-- Delete: admin only (matches delete_account).
create policy "profiles_delete_admin" on public.profiles
  for delete to authenticated
  using (public.is_admin());

-- Defence in depth: never let the anonymous role reach this table.
revoke all on table public.profiles from anon;
grant select, update on table public.profiles to authenticated;


-- ============================================================================
-- SECTION 5 — PUBLIC (NON-PII) PROFILE VIEW
--   Book reviews join `profiles(name, avatar)`. Under the strict policy that
--   join would return nothing, so expose a view with the non-identifying
--   columns only. No email / phone / address / student_id / role.
-- ============================================================================

drop view if exists public.public_profiles;
create view public.public_profiles as
  select id, name, avatar
  from public.profiles;

grant select on public.public_profiles to anon, authenticated;

comment on view public.public_profiles is
  'Non-identifying profile fields (id, name, avatar) used for review/book attribution.';


-- ============================================================================
-- SECTION 6 — STAFF NOTIFICATION ON REGISTRATION
--   Replaces the client-side fan-out in js/pages/login.js, which let any
--   signed-up user insert a notification row for ANY user_id.
-- ============================================================================

-- Recreate the privileged RPCs at their current signatures. A live database
-- created from an older schema may still hold a previous version of any of
-- these with a different argument list or return type, and `create or replace`
-- can change NEITHER - it would abort the whole migration. Drop them by name,
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

create or replace function public.notify_staff_of_registration(
  p_user_id uuid,
  p_name     text,
  p_role     text
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  -- You may only report YOUR OWN registration.
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'You can only announce your own registration'
      using errcode = '42501';
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


-- ============================================================================
-- SECTION 7 — PERSONAL PREFERENCES (kept separate from global settings)
-- ============================================================================

create table if not exists public.user_preferences (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

drop policy if exists user_preferences_select_own on public.user_preferences;
drop policy if exists user_preferences_upsert_own on public.user_preferences;

create policy "user_preferences_select_own" on public.user_preferences
  for select to authenticated
  using (auth.uid() = user_id);

create policy "user_preferences_upsert_own" on public.user_preferences
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "user_preferences_update_own" on public.user_preferences
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_preferences_delete_own" on public.user_preferences
  for delete to authenticated
  using (auth.uid() = user_id);

revoke all on table public.user_preferences from anon;
grant select, insert, update, delete on table public.user_preferences to authenticated;

create index if not exists idx_user_preferences_user on public.user_preferences(user_id);


-- ============================================================================
-- SECTION 8 — GLOBAL SETTINGS: only an admin may write
--   Removes settings_insert_authenticated / settings_update_authenticated,
--   which let ANY signed-in student rewrite library-wide configuration.
-- ============================================================================

alter table public.settings enable row level security;

drop policy if exists settings_insert_authenticated on public.settings;
drop policy if exists settings_update_authenticated on public.settings;
drop policy if exists settings_upsert_admin        on public.settings;
drop policy if exists settings_update_admin        on public.settings;
drop policy if exists settings_select_all          on public.settings;

-- Read stays public: the library name / hours / contact details are shown on
-- the public pages. NEVER store credentials in this table (the app no longer
-- writes SMTP user/password here).
create policy "settings_select_all" on public.settings
  for select to anon, authenticated
  using (true);

create policy "settings_upsert_admin" on public.settings
  for insert to authenticated
  with check (public.is_admin());

create policy "settings_update_admin" on public.settings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on table public.settings from anon;
grant select on table public.settings to anon, authenticated;
grant insert, update on table public.settings to authenticated;


-- ============================================================================
-- SECTION 9 — LOG TABLES: service role only
--   login_history / activity_logs / audit_logs had `with check (true)`
--   policies, so anyone (even anonymous) could forge log entries.
--   The frontend never writes these tables.
-- ============================================================================

drop policy if exists login_history_insert_service  on public.login_history;
drop policy if exists login_history_select_own      on public.login_history;

alter table public.login_history enable row level security;
create policy "login_history_select_admin" on public.login_history
  for select to authenticated
  using (public.is_admin());

drop policy if exists activity_logs_insert_service on public.activity_logs;
drop policy if exists activity_logs_select_own     on public.activity_logs;

alter table public.activity_logs enable row level security;
create policy "activity_logs_select_admin" on public.activity_logs
  for select to authenticated
  using (public.is_admin());

drop policy if exists audit_logs_insert_service on public.audit_logs;
drop policy if exists audit_logs_select_admin  on public.audit_logs;

alter table public.audit_logs enable row level security;
create policy "audit_logs_select_admin" on public.audit_logs
  for select to authenticated
  using (public.is_admin());

revoke insert, update, delete on table public.login_history  from anon, authenticated;
revoke insert, update, delete on table public.activity_logs from anon, authenticated;
revoke insert, update, delete on table public.audit_logs    from anon, authenticated;
grant select on table public.login_history, public.activity_logs, public.audit_logs to authenticated;


-- ============================================================================
-- SECTION 10 — BORROW / RESERVATION: no self-approval
--   borrow_insert_own had `with check (auth.uid() = student_id)` only, so a
--   student could POST a row that was already status='approved'.
-- ============================================================================

drop policy if exists borrow_insert_own  on public.borrow_requests;
drop policy if exists borrow_update_admin on public.borrow_requests;
drop policy if exists borrow_select_own  on public.borrow_requests;

create policy "borrow_select_own" on public.borrow_requests
  for select to authenticated
  using (auth.uid() = student_id or public.is_staff());

create policy "borrow_insert_own_pending" on public.borrow_requests
  for insert to authenticated
  with check (
    auth.uid() = student_id
    and coalesce(status, 'pending') = 'pending'
    and approved_by is null
    and approved_at is null
  );

create policy "borrow_update_staff" on public.borrow_requests
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Staff may also record historical/already-decided rows (e.g. the CSV
-- "borrow records" import), which a student could never do.
create policy "borrow_insert_staff" on public.borrow_requests
  for insert to authenticated
  with check (public.is_staff());

drop policy if exists reservations_insert_own on public.reservations;
drop policy if exists reservations_update_own on public.reservations;
drop policy if exists reservations_select_own on public.reservations;

create policy "reservations_select_own" on public.reservations
  for select to authenticated
  using (auth.uid() = student_id or public.is_staff());

create policy "reservations_insert_own" on public.reservations
  for insert to authenticated
  with check (
    auth.uid() = student_id
    and coalesce(status, 'active') in ('active', 'waiting')
  );

create policy "reservations_update_staff" on public.reservations
  for update to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "reservations_insert_staff" on public.reservations
  for insert to authenticated
  with check (public.is_staff());


-- ============================================================================
-- SECTION 11 — REWRITE THE REMAINING POLICIES TO USE is_admin()/is_staff()
--   The originals embedded `exists (select 1 from profiles where ...)`,
--   which now resolves through the tightened profiles policy. These helper
--   calls are explicit, index-friendly and cannot recurse.
--   Behaviour is unchanged for every table other than `profiles`.
-- ============================================================================

-- books ---------------------------------------------------------------------
drop policy if exists books_select_all   on public.books;
drop policy if exists books_insert_admin on public.books;
drop policy if exists books_update_admin on public.books;
drop policy if exists books_delete_admin on public.books;
create policy "books_select_all"   on public.books for select to anon, authenticated using (true);
create policy "books_insert_admin" on public.books for insert to authenticated with check (public.is_admin());
create policy "books_update_admin" on public.books for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "books_delete_admin" on public.books for delete to authenticated using (public.is_admin());

-- categories ----------------------------------------------------------------
drop policy if exists categories_select_all   on public.categories;
drop policy if exists categories_insert_admin on public.categories;
drop policy if exists categories_update_admin on public.categories;
drop policy if exists categories_delete_admin on public.categories;
create policy "categories_select_all"   on public.categories for select to anon, authenticated using (true);
create policy "categories_insert_admin" on public.categories for insert to authenticated with check (public.is_admin());
create policy "categories_update_admin" on public.categories for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "categories_delete_admin" on public.categories for delete to authenticated using (public.is_admin());

-- announcements -------------------------------------------------------------
drop policy if exists announcements_select_all   on public.announcements;
drop policy if exists announcements_insert_admin on public.announcements;
drop policy if exists announcements_update_admin on public.announcements;
drop policy if exists announcements_delete_admin on public.announcements;
create policy "announcements_select_all"   on public.announcements for select to anon, authenticated using (true);
create policy "announcements_insert_admin" on public.announcements for insert to authenticated with check (public.is_admin());
create policy "announcements_update_admin" on public.announcements for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "announcements_delete_admin" on public.announcements for delete to authenticated using (public.is_admin());

-- events --------------------------------------------------------------------
drop policy if exists events_select_all   on public.events;
drop policy if exists events_insert_admin on public.events;
drop policy if exists events_update_admin on public.events;
drop policy if exists events_delete_admin on public.events;
create policy "events_select_all"   on public.events for select to anon, authenticated using (true);
create policy "events_insert_admin" on public.events for insert to authenticated with check (public.is_admin());
create policy "events_update_admin" on public.events for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "events_delete_admin" on public.events for delete to authenticated using (public.is_admin());

-- digital_books -------------------------------------------------------------
drop policy if exists digital_books_select_all   on public.digital_books;
drop policy if exists digital_books_insert_admin on public.digital_books;
drop policy if exists digital_books_update_admin on public.digital_books;
drop policy if exists digital_books_delete_admin on public.digital_books;
create policy "digital_books_select_all"   on public.digital_books for select to anon, authenticated using (true);
create policy "digital_books_insert_admin" on public.digital_books for insert to authenticated with check (public.is_admin());
create policy "digital_books_update_admin" on public.digital_books for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "digital_books_delete_admin" on public.digital_books for delete to authenticated using (public.is_admin());

-- study_materials (admin + librarian, unchanged behaviour) -----------------
drop policy if exists study_materials_select_all    on public.study_materials;
drop policy if exists study_materials_insert_staff  on public.study_materials;
drop policy if exists study_materials_update_staff  on public.study_materials;
drop policy if exists study_materials_delete_staff  on public.study_materials;
create policy "study_materials_select_all"   on public.study_materials for select to anon, authenticated using (true);
create policy "study_materials_insert_staff" on public.study_materials for insert to authenticated with check (public.is_staff());
create policy "study_materials_update_staff" on public.study_materials for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "study_materials_delete_staff" on public.study_materials for delete to authenticated using (public.is_staff());

-- calendar_events / faqs ---------------------------------------------------
drop policy if exists calendar_events_select_all   on public.calendar_events;
drop policy if exists calendar_events_insert_admin on public.calendar_events;
drop policy if exists calendar_events_update_admin on public.calendar_events;
drop policy if exists calendar_events_delete_admin on public.calendar_events;
create policy "calendar_events_select_all"   on public.calendar_events for select to anon, authenticated using (true);
create policy "calendar_events_insert_admin" on public.calendar_events for insert to authenticated with check (public.is_admin());
create policy "calendar_events_update_admin" on public.calendar_events for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "calendar_events_delete_admin" on public.calendar_events for delete to authenticated using (public.is_admin());

drop policy if exists faqs_select_all   on public.faqs;
drop policy if exists faqs_insert_admin on public.faqs;
drop policy if exists faqs_update_admin on public.faqs;
drop policy if exists faqs_delete_admin on public.faqs;
create policy "faqs_select_all"   on public.faqs for select to anon, authenticated using (true);
create policy "faqs_insert_admin" on public.faqs for insert to authenticated with check (public.is_admin());
create policy "faqs_update_admin" on public.faqs for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "faqs_delete_admin" on public.faqs for delete to authenticated using (public.is_admin());

-- notifications ------------------------------------------------------------
drop policy if exists notifications_select_own  on public.notifications;
drop policy if exists notifications_insert_own  on public.notifications;
drop policy if exists notifications_update_own  on public.notifications;
drop policy if exists notifications_delete_own  on public.notifications;
create policy "notifications_select_own" on public.notifications for select to authenticated
  using (auth.uid() = user_id or public.is_staff());
create policy "notifications_insert_own" on public.notifications for insert to authenticated
  with check (auth.uid() = user_id or public.is_staff());
create policy "notifications_update_own" on public.notifications for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notifications_delete_own" on public.notifications for delete to authenticated
  using (auth.uid() = user_id);

-- favorites / recently_viewed / reviews / achievements (unchanged behaviour)
drop policy if exists favorites_select_own      on public.favorites;
drop policy if exists favorites_insert_own      on public.favorites;
drop policy if exists favorites_delete_own      on public.favorites;
create policy "favorites_select_own" on public.favorites for select to authenticated using (auth.uid() = user_id);
create policy "favorites_insert_own" on public.favorites for insert to authenticated with check (auth.uid() = user_id);
create policy "favorites_delete_own" on public.favorites for delete to authenticated using (auth.uid() = user_id);

drop policy if exists recently_viewed_select_own on public.recently_viewed;
drop policy if exists recently_viewed_insert_own on public.recently_viewed;
drop policy if exists recently_viewed_delete_own on public.recently_viewed;
create policy "recently_viewed_select_own" on public.recently_viewed for select to authenticated using (auth.uid() = user_id);
create policy "recently_viewed_insert_own" on public.recently_viewed for insert to authenticated with check (auth.uid() = user_id);
create policy "recently_viewed_delete_own" on public.recently_viewed for delete to authenticated using (auth.uid() = user_id);

drop policy if exists reviews_select_all   on public.reviews;
drop policy if exists reviews_insert_own   on public.reviews;
drop policy if exists reviews_update_own   on public.reviews;
drop policy if exists reviews_delete_own   on public.reviews;
create policy "reviews_select_all" on public.reviews for select to anon, authenticated using (true);
create policy "reviews_insert_own" on public.reviews for insert to authenticated with check (auth.uid() = user_id);
create policy "reviews_update_own" on public.reviews for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reviews_delete_own" on public.reviews for delete to authenticated using (auth.uid() = user_id);

drop policy if exists achievements_select_own on public.achievements;
drop policy if exists achievements_insert_own on public.achievements;
create policy "achievements_select_own" on public.achievements for select to authenticated
  using (auth.uid() = user_id or public.is_admin());
create policy "achievements_insert_own" on public.achievements for insert to authenticated with check (auth.uid() = user_id);

-- fine_payments / book_imports / feedback / contact_messages / sessions ----
drop policy if exists fine_payments_select_own on public.fine_payments;
drop policy if exists fine_payments_insert_admin on public.fine_payments;
create policy "fine_payments_select_own" on public.fine_payments for select to authenticated
  using (auth.uid() = student_id or public.is_staff());
create policy "fine_payments_insert_staff" on public.fine_payments for insert to authenticated
  with check (public.is_staff());

drop policy if exists book_imports_select_admin on public.book_imports;
drop policy if exists book_imports_insert_admin on public.book_imports;
drop policy if exists book_imports_update_admin on public.book_imports;
create policy "book_imports_select_admin" on public.book_imports for select to authenticated using (public.is_admin());
create policy "book_imports_insert_admin" on public.book_imports for insert to authenticated with check (public.is_admin());
create policy "book_imports_update_admin" on public.book_imports for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists feedback_select_own  on public.feedback;
drop policy if exists feedback_insert_own  on public.feedback;
create policy "feedback_select_own" on public.feedback for select to authenticated
  using (auth.uid() = user_id or public.is_admin());
create policy "feedback_insert_own" on public.feedback for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists contact_messages_select_admin on public.contact_messages;
drop policy if exists contact_messages_insert_anon  on public.contact_messages;
drop policy if exists contact_messages_update_admin on public.contact_messages;
create policy "contact_messages_select_admin" on public.contact_messages for select to authenticated using (public.is_admin());
create policy "contact_messages_insert_anon"  on public.contact_messages for insert to anon, authenticated with check (true);
create policy "contact_messages_update_admin" on public.contact_messages for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists sessions_select_own on public.sessions;
drop policy if exists sessions_insert_own on public.sessions;
drop policy if exists sessions_delete_own on public.sessions;
create policy "sessions_select_own" on public.sessions for select to authenticated
  using (auth.uid() = user_id or public.is_admin());
create policy "sessions_insert_own" on public.sessions for insert to authenticated with check (auth.uid() = user_id);
create policy "sessions_delete_own" on public.sessions for delete to authenticated using (auth.uid() = user_id);


-- ============================================================================
-- SECTION 12 — SECURITY-DEFINER RPCs: un-grant anon, add password rules,
--               pin search_path.
-- ============================================================================

create or replace function public.add_staff_account(
  p_email      text,
  p_password   text,
  p_name       text,
  p_role       text default 'librarian',
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

  -- Do not silently promote an existing member into staff.
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

  -- Guard against locking every administrator out of the system.
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

-- A user may delete their OWN account (settings > Danger zone) but nobody else.
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

-- Librarian/staff "reject registration" action.
-- Narrowly scoped on purpose: staff may remove a registration ONLY while it is
-- still unapproved AND holds a non-staff role, so this can never be used to
-- delete an approved member or another staff account.
create or replace function public.reject_registration(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_role    text;
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

grant execute on function public.add_staff_account(text, text, text, text, text) to authenticated, service_role;
grant execute on function public.delete_account(uuid) to authenticated, service_role;
grant execute on function public.reject_registration(uuid) to authenticated, service_role;
grant execute on function public.delete_my_account() to authenticated, service_role;


-- ============================================================================
-- SECTION 13 — POST-FLIGHT VERIFICATION (read-only; safe to run)
-- ============================================================================

-- 13.1  MUST return 0 rows: these two policies used to allow anonymous
--       access to every student's PII.
select policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'profiles'
  and ('profiles_select_all' = policyname or 'profiles_insert_own' = policyname);

-- 13.2  Confirm the signup clamp is in force.
select prosrc like '%v_role not in%' as signup_role_clamped,
       prosrc like '%false%'       as approval_forced_false
from pg_proc
where proname = 'handle_new_user';

-- 13.3  Confirm no `with check (true)` policy remains on the log tables.
select tablename, policyname
from pg_policies
where schemaname = 'public'
  and tablename in ('login_history', 'activity_logs', 'audit_logs')
  and with_check = 'true';

-- 13.4  Confirm `anon` can no longer execute the privileged RPCs.
select routine_name, grantee, privilege_type
from information_schema.routine_privileges
where specific_schema = 'public'
  and routine_name in ('add_staff_account', 'delete_account', 'reject_registration', 'delete_my_account')
  and grantee = 'anon';

-- 13.5  Confirm the guard trigger exists.
select tgname, tgrelid::regclass as on_table
from pg_trigger
where tgname = 'guard_profile_update' and not tgisinternal;
