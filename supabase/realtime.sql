-- ─────────────────────────────────────────────────────────────────────────────
-- Enable Realtime for the library tables.
--
-- The web app (js/realtime.js) subscribes to `postgres_changes` on these
-- tables so the Admin Dashboard updates the instant a row changes — not only
-- from another device, but also from edits made directly in the Supabase
-- dashboard.
--
-- HOW TO APPLY:
--   1. Go to your Supabase project  →  SQL Editor  →  New query.
--   2. Paste this file's contents and press «Run».
--   3. Re-open the Admin Dashboard in the browser: it will show the green
--      «Live» badge instead of «Auto-refresh».
--
-- The block is idempotent: it only adds tables that are missing, so it can be
-- re-run safely after you add more tables to the schema in the future.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare t record;
begin
  for t in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename in (
        'books', 'categories', 'borrow_requests', 'reservations',
        'profiles', 'notifications', 'announcements', 'events',
        'digital_books', 'study_materials', 'settings'
      )
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t.tablename
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t.tablename);
    end if;
  end loop;
end $$;

-- Optional, only needed if you want UPDATE/DELETE events to include the full
-- previous row rather than just the primary key (the app re-fetches anyway):
-- alter table public.books replica identity full;
-- alter table public.borrow_requests replica identity full;
-- alter table public.profiles replica identity full;