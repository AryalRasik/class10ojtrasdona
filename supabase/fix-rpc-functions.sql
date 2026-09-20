-- ============================================================
-- FIX: Missing admin helper RPC functions (404 fix)
-- Project: cagbihfzktmebjkxwkwd
-- Run this file in Supabase Dashboard > SQL Editor
-- It recreates add_staff_account and delete_account and grants
-- EXECUTE so PostgREST can expose them via /rest/v1/rpc/...
-- ============================================================

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
set search_path = public, extensions
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
      extensions.crypt(p_password, extensions.gen_salt('bf')),
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

grant execute on function public.add_staff_account(text, text, text, text, text)
  to anon, authenticated, service_role;

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

grant execute on function public.delete_account(uuid)
  to anon, authenticated, service_role;