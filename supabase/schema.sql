-- IDEA LAB initial Supabase schema
-- Apply this file in Supabase SQL Editor after creating a new project.
-- This migration creates the shared data model and row-level security.
-- It does not import or delete existing browser localStorage data.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  roles text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text,
  name text not null,
  direction text not null default '',
  description text not null default '',
  investment numeric(16,2),
  specialists text not null default '',
  resources text not null default '',
  owner_name text not null default '',
  owner_email text not null default '',
  owner_phone text not null default '',
  status text not null default 'draft',
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, legacy_id)
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  legacy_id text,
  name text not null,
  direction text not null default '',
  leader text not null default '',
  roles text not null default '',
  description text not null default '',
  phone text not null default '',
  telegram text not null default '',
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, legacy_id)
);

create table if not exists public.job_posts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text,
  company_name text not null,
  job_title text not null,
  description text not null default '',
  salary text not null default '',
  location text not null default '',
  phone text not null default '',
  job_type text not null default '',
  status text not null default 'active',
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, legacy_id)
);

create table if not exists public.specialist_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text,
  full_name text not null,
  email text not null default '',
  phone text not null default '',
  profession text not null default '',
  skills text[] not null default '{}',
  experience text not null default '',
  education text not null default '',
  about text not null default '',
  portfolio text not null default '',
  resume_path text not null default '',
  job_search boolean not null default true,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, legacy_id)
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text,
  title text not null,
  offer_type text not null default '',
  category text not null default '',
  location text not null default '',
  contact text not null default '',
  deadline date,
  status text not null default 'active',
  description text not null default '',
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, legacy_id)
);

create table if not exists public.investors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  legacy_id text,
  name text not null,
  investor_type text not null default '',
  direction text not null default '',
  amount text not null default '',
  location text not null default '',
  phone text not null default '',
  telegram text not null default '',
  website text not null default '',
  description text not null default '',
  status text not null default 'active',
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, legacy_id)
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null default '',
  description text not null default '',
  location text not null default '',
  price text not null default '',
  contact text not null default '',
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_investment_applications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  investor_user_id uuid references auth.users(id) on delete set null,
  investor_name text not null default '',
  investor_email text not null default '',
  offer_amount numeric(16,2),
  message text not null default '',
  status text not null default 'new',
  legacy_id text,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_applications (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  applicant_id uuid references auth.users(id) on delete set null,
  applicant_name text not null default '',
  applicant_phone text not null default '',
  message text not null default '',
  status text not null default 'new',
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_posts(id) on delete cascade,
  applicant_id uuid references auth.users(id) on delete set null,
  applicant_name text not null default '',
  applicant_phone text not null default '',
  message text not null default '',
  status text not null default 'new',
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.offer_applications (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  applicant_id uuid references auth.users(id) on delete set null,
  applicant_label text not null default '',
  message text not null default '',
  status text not null default 'new',
  legacy_id text,
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.offer_messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.offer_applications(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.resource_orders (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  requester_id uuid references auth.users(id) on delete set null,
  requester_name text not null default '',
  requester_phone text not null default '',
  message text not null default '',
  status text not null default 'new',
  legacy_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_owner_created_idx on public.projects(owner_id, created_at desc);
create index if not exists teams_owner_created_idx on public.teams(owner_id, created_at desc);
create index if not exists job_posts_owner_created_idx on public.job_posts(owner_id, created_at desc);
create index if not exists specialist_profiles_owner_idx on public.specialist_profiles(owner_id);
create index if not exists offers_owner_created_idx on public.offers(owner_id, created_at desc);
create index if not exists investors_owner_created_idx on public.investors(owner_id);
create index if not exists resources_owner_created_idx on public.resources(owner_id, created_at desc);
create index if not exists investment_applications_project_idx on public.project_investment_applications(project_id);
create index if not exists team_applications_team_idx on public.team_applications(team_id);
create index if not exists job_applications_job_idx on public.job_applications(job_id);
create index if not exists offer_applications_offer_idx on public.offer_applications(offer_id);
create index if not exists offer_messages_application_idx on public.offer_messages(application_id, created_at);
create index if not exists resource_orders_resource_idx on public.resource_orders(resource_id);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.teams enable row level security;
alter table public.job_posts enable row level security;
alter table public.specialist_profiles enable row level security;
alter table public.offers enable row level security;
alter table public.investors enable row level security;
alter table public.resources enable row level security;
alter table public.project_investment_applications enable row level security;
alter table public.team_applications enable row level security;
alter table public.job_applications enable row level security;
alter table public.offer_applications enable row level security;
alter table public.offer_messages enable row level security;
alter table public.resource_orders enable row level security;

create policy "Profiles are readable by their owner" on public.profiles for select to authenticated using (id = auth.uid());
create policy "Users can create their profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "Users can update their profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "Authenticated users can view projects" on public.projects for select to authenticated using (true);
create policy "Owners manage projects" on public.projects for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "Authenticated users can view teams" on public.teams for select to authenticated using (true);
create policy "Owners manage teams" on public.teams for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "Authenticated users can view job posts" on public.job_posts for select to authenticated using (true);
create policy "Owners manage job posts" on public.job_posts for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "Authenticated users can view specialist profiles" on public.specialist_profiles for select to authenticated using (true);
create policy "Owners manage specialist profiles" on public.specialist_profiles for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "Authenticated users can view offers" on public.offers for select to authenticated using (true);
create policy "Owners manage offers" on public.offers for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "Authenticated users can view investors" on public.investors for select to authenticated using (true);
create policy "Owners manage investors" on public.investors for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "Authenticated users can view resources" on public.resources for select to authenticated using (true);
create policy "Owners manage resources" on public.resources for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "Project owners and investor can view investment applications"
on public.project_investment_applications for select to authenticated
using (
  investor_user_id = auth.uid()
  or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
);
create policy "Authenticated users can submit investment applications"
on public.project_investment_applications for insert to authenticated
with check (
  investor_user_id = auth.uid()
  and exists (select 1 from public.projects p where p.id = project_id)
);
create policy "Project owners can update investment applications"
on public.project_investment_applications for update to authenticated
using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()))
with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));

create policy "Team owners and applicants can view team applications"
on public.team_applications for select to authenticated
using (
  applicant_id = auth.uid()
  or exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid())
);
create policy "Authenticated users can apply to teams"
on public.team_applications for insert to authenticated
with check (applicant_id = auth.uid());
create policy "Team owners can update team applications"
on public.team_applications for update to authenticated
using (exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid()))
with check (exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid()));

create policy "Job owners and applicants can view job applications"
on public.job_applications for select to authenticated
using (
  applicant_id = auth.uid()
  or exists (select 1 from public.job_posts j where j.id = job_id and j.owner_id = auth.uid())
);
create policy "Authenticated users can apply to jobs"
on public.job_applications for insert to authenticated
with check (applicant_id = auth.uid());
create policy "Job owners can update job applications"
on public.job_applications for update to authenticated
using (exists (select 1 from public.job_posts j where j.id = job_id and j.owner_id = auth.uid()))
with check (exists (select 1 from public.job_posts j where j.id = job_id and j.owner_id = auth.uid()));

create policy "Offer participants can view applications"
on public.offer_applications for select to authenticated
using (
  applicant_id = auth.uid()
  or exists (select 1 from public.offers o where o.id = offer_id and o.owner_id = auth.uid())
);
create policy "Authenticated users can apply to offers"
on public.offer_applications for insert to authenticated
with check (applicant_id = auth.uid());
create policy "Offer owners can update applications"
on public.offer_applications for update to authenticated
using (exists (select 1 from public.offers o where o.id = offer_id and o.owner_id = auth.uid()))
with check (exists (select 1 from public.offers o where o.id = offer_id and o.owner_id = auth.uid()));

create policy "Application participants can view messages"
on public.offer_messages for select to authenticated
using (
  sender_id = auth.uid()
  or exists (
    select 1 from public.offer_applications a
    join public.offers o on o.id = a.offer_id
    where a.id = application_id
      and (a.applicant_id = auth.uid() or o.owner_id = auth.uid())
  )
);
create policy "Application participants can send messages"
on public.offer_messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.offer_applications a
    join public.offers o on o.id = a.offer_id
    where a.id = application_id
      and (a.applicant_id = auth.uid() or o.owner_id = auth.uid())
  )
);

create policy "Resource owners and requesters can view orders"
on public.resource_orders for select to authenticated
using (
  requester_id = auth.uid()
  or exists (select 1 from public.resources r where r.id = resource_id and r.owner_id = auth.uid())
);
create policy "Authenticated users can request resources"
on public.resource_orders for insert to authenticated
with check (requester_id = auth.uid());
create policy "Resource owners can update orders"
on public.resource_orders for update to authenticated
using (exists (select 1 from public.resources r where r.id = resource_id and r.owner_id = auth.uid()))
with check (exists (select 1 from public.resources r where r.id = resource_id and r.owner_id = auth.uid()));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'profiles','projects','teams','job_posts','specialist_profiles',
    'offers','investors','resources','project_investment_applications',
    'team_applications','job_applications','offer_applications','resource_orders'
  ]
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', tbl);
    execute format('create trigger set_updated_at before update on public.%I for each row execute procedure public.set_updated_at()', tbl);
  end loop;
end;
$$;
