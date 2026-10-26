-- =============================================================================
-- SchoolVault — Supabase setup (NO-LOGIN / TESTING version)
--
-- HOW TO USE: Supabase dashboard > SQL Editor > New query > paste this WHOLE
-- file > Run.  It is safe to run more than once (and safe to run on a project
-- you already set up with an older version of this file — it adds the new
-- columns/tables without deleting any data).
--
-- BEFORE YOU RUN IT: create the storage bucket first (Storage > New bucket,
-- name it exactly:  school-files   and switch "Public bucket" ON).
--
-- WARNING: these rules let ANYONE with your Supabase URL read, change and
-- delete your data, because this version has no login. That is fine for
-- testing on your own computer/phone, but do not use it for real student
-- records. For the login version use the other project's schema file.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. profiles  (extends Supabase's built-in auth.users; only used if you log in)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_date timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Public can view all profiles" on public.profiles;
create policy "Public can view all profiles"
  on public.profiles for select
  to public
  using (true);

-- Automatically create a profile row whenever someone registers.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- -----------------------------------------------------------------------------
-- 2. folders
-- -----------------------------------------------------------------------------
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_folder_id uuid references public.folders(id) on delete cascade,
  color text default '#3B82F6',
  description text,
  created_date timestamptz not null default now()
);

alter table public.folders enable row level security;

drop policy if exists "Public can manage folders" on public.folders;
create policy "Public can manage folders"
  on public.folders for all
  to public
  using (true)
  with check (true);


-- -----------------------------------------------------------------------------
-- 3. students
-- -----------------------------------------------------------------------------
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  grade text,
  grade_number numeric,
  last_promoted_year text,
  student_number text,
  photo_url text,
  notes text,
  created_date timestamptz not null default now()
);

-- Newer fields (added in the latest app version). "if not exists" means this
-- also upgrades a students table you created from an older version of this file.
alter table public.students add column if not exists age numeric;
alter table public.students add column if not exists address text;
alter table public.students add column if not exists email text;
alter table public.students add column if not exists section text;

alter table public.students enable row level security;

drop policy if exists "Public can manage students" on public.students;
create policy "Public can manage students"
  on public.students for all
  to public
  using (true)
  with check (true);


-- -----------------------------------------------------------------------------
-- 4. school_files
-- -----------------------------------------------------------------------------
create table if not exists public.school_files (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  file_url text not null,
  file_type text,
  file_size numeric,
  folder_id uuid references public.folders(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  tags text[],
  notes text,
  source text default 'upload' check (source in ('upload', 'scan')),
  created_date timestamptz not null default now()
);

alter table public.school_files enable row level security;

drop policy if exists "Public can manage school_files" on public.school_files;
create policy "Public can manage school_files"
  on public.school_files for all
  to public
  using (true)
  with check (true);


-- -----------------------------------------------------------------------------
-- 5. board_tasks  (NEW — the "Board" to-do page)
-- -----------------------------------------------------------------------------
create table if not exists public.board_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  notes text,
  due_date date,
  completed boolean not null default false,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  created_date timestamptz not null default now()
);

alter table public.board_tasks enable row level security;

drop policy if exists "Public can manage board_tasks" on public.board_tasks;
create policy "Public can manage board_tasks"
  on public.board_tasks for all
  to public
  using (true)
  with check (true);


-- -----------------------------------------------------------------------------
-- 6. Storage permissions for the "school-files" bucket
--    (the bucket itself must already exist — see the note at the top)
-- -----------------------------------------------------------------------------
drop policy if exists "Public can upload to school-files" on storage.objects;
create policy "Public can upload to school-files"
  on storage.objects for insert
  to public
  with check (bucket_id = 'school-files');

drop policy if exists "Public can read school-files" on storage.objects;
create policy "Public can read school-files"
  on storage.objects for select
  to public
  using (bucket_id = 'school-files');

drop policy if exists "Public can delete school-files" on storage.objects;
create policy "Public can delete school-files"
  on storage.objects for delete
  to public
  using (bucket_id = 'school-files');


-- -----------------------------------------------------------------------------
-- Done. In Supabase, also go to  Authentication > Providers > Email  and turn
-- "Confirm email" OFF if you want to try the Register page (it then logs you
-- in immediately). It is not needed just to use the no-login app.
-- -----------------------------------------------------------------------------
