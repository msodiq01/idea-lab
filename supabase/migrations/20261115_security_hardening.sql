-- IDEA LAB security hardening migration
-- Prepared for review only. Do NOT run until the current database state is backed up
-- and the target Supabase project has been confirmed.
--
-- Goals:
-- 1) Public discovery uses narrow views that omit private contact fields.
-- 2) Direct table reads remain owner/participant scoped by existing RLS policies.
-- 3) User-managed profile updates cannot self-assign privileged roles.
-- 4) Application inserts must target valid, active records.
-- 5) Project task identity and project linkage cannot be changed by an assignee.

begin;

-- ---------------------------------------------------------------------------
-- 1. Remove broad authenticated SELECT policies from directory tables.
-- Existing "Owners manage ..." FOR ALL policies continue to allow owners
-- to read/manage their own rows. Public discovery is through the views below.
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated users can view projects" on public.projects;
drop policy if exists "Authenticated users can view teams" on public.teams;
drop policy if exists "Authenticated users can view job posts" on public.job_posts;
drop policy if exists "Authenticated users can view specialist profiles" on public.specialist_profiles;
drop policy if exists "Authenticated users can view offers" on public.offers;
drop policy if exists "Authenticated users can view investors" on public.investors;
drop policy if exists "Authenticated users can view resources" on public.resources;

-- ---------------------------------------------------------------------------
-- 2. Public directory views.
-- Views deliberately omit phone numbers, emails, Telegram handles, resume
-- storage paths, owner IDs, and other private account/contact fields.
-- View owner privileges are used for directory projection; access is granted
-- only to authenticated users. Keep these views read-only for the client.
-- ---------------------------------------------------------------------------
create or replace view public.projects_public
with (security_barrier = true, security_invoker = false) as
select id, name, direction, description, investment, specialists, resources,
       owner_name, status, created_at, updated_at
from public.projects
where status in ('active', 'published');

create or replace view public.teams_public
with (security_barrier = true, security_invoker = false) as
select id, project_id, name, direction, leader, roles, description, created_at
from public.teams;

create or replace view public.job_posts_public
with (security_barrier = true, security_invoker = false) as
select id, company_name, job_title, description, salary, location,
       job_type, status, created_at
from public.job_posts
where status = 'active';

create or replace view public.specialist_profiles_public
with (security_barrier = true, security_invoker = false) as
select id, full_name, profession, skills, experience, education, about,
       portfolio, job_search, created_at
from public.specialist_profiles
where job_search = true;

create or replace view public.offers_public
with (security_barrier = true, security_invoker = false) as
select id, title, offer_type, category, location, deadline, status,
       description, created_at
from public.offers
where status = 'active';

create or replace view public.investors_public
with (security_barrier = true, security_invoker = false) as
select id, name, investor_type, direction, amount, location, website,
       description, status, created_at
from public.investors
where status = 'active';

create or replace view public.resources_public
with (security_barrier = true, security_invoker = false) as
select id, title, category, description, location, price, status, created_at
from public.resources
where status = 'active';

revoke all on public.projects_public from anon;
revoke all on public.teams_public from anon;
revoke all on public.job_posts_public from anon;
revoke all on public.specialist_profiles_public from anon;
revoke all on public.offers_public from anon;
revoke all on public.investors_public from anon;
revoke all on public.resources_public from anon;

grant select on public.projects_public to authenticated;
grant select on public.teams_public to authenticated;
grant select on public.job_posts_public to authenticated;
grant select on public.specialist_profiles_public to authenticated;
grant select on public.offers_public to authenticated;
grant select on public.investors_public to authenticated;
grant select on public.resources_public to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Prevent self-assignment of profile roles.
-- Role changes must be performed by a trusted server-side administrative
-- process, never by a normal authenticated profile update.
-- ---------------------------------------------------------------------------
create or replace function public.prevent_self_role_escalation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null
     and new.roles is distinct from old.roles then
    raise exception 'Profile roles can only be changed by a trusted administrator';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_profile_role_escalation on public.profiles;
create trigger prevent_profile_role_escalation
before update of roles on public.profiles
for each row execute procedure public.prevent_self_role_escalation();

-- ---------------------------------------------------------------------------
-- 4. Validate application targets at insert time.
-- Applicants may apply only as themselves and only to active/public targets.
-- Team records currently have no status column, so team applications require
-- only that the referenced team exists.
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated users can submit investment applications"
on public.project_investment_applications;
create policy "Authenticated users can submit investment applications"
on public.project_investment_applications for insert to authenticated
with check (
  investor_user_id = auth.uid()
  and exists (
    select 1 from public.projects p
    where p.id = project_id and p.status in ('active', 'published')
  )
);

drop policy if exists "Authenticated users can apply to teams"
on public.team_applications;
create policy "Authenticated users can apply to teams"
on public.team_applications for insert to authenticated
with check (
  applicant_id = auth.uid()
  and exists (select 1 from public.teams t where t.id = team_id)
);

drop policy if exists "Authenticated users can apply to jobs"
on public.job_applications;
create policy "Authenticated users can apply to jobs"
on public.job_applications for insert to authenticated
with check (
  applicant_id = auth.uid()
  and exists (
    select 1 from public.job_posts j
    where j.id = job_id and j.status = 'active'
  )
);

drop policy if exists "Authenticated users can apply to offers"
on public.offer_applications;
create policy "Authenticated users can apply to offers"
on public.offer_applications for insert to authenticated
with check (
  applicant_id = auth.uid()
  and exists (
    select 1 from public.offers o
    where o.id = offer_id and o.status = 'active'
  )
);

drop policy if exists "Authenticated users can request resources"
on public.resource_orders;
create policy "Authenticated users can request resources"
on public.resource_orders for insert to authenticated
with check (
  requester_id = auth.uid()
  and exists (
    select 1 from public.resources r
    where r.id = resource_id and r.status = 'active'
  )
);

-- ---------------------------------------------------------------------------
-- 5. Protect task identity and project linkage from assignee-side changes.
-- Existing RLS still determines who may update a task. This trigger ensures
-- an assignee cannot move a task to another project, rewrite its creator, or
-- transfer assignment to another account.
-- ---------------------------------------------------------------------------
create or replace function public.guard_project_task_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null then
    if new.project_id is distinct from old.project_id then
      raise exception 'A task cannot be moved to another project';
    end if;

    if new.created_by is distinct from old.created_by then
      raise exception 'Task creator cannot be changed';
    end if;

    if new.assigned_to is distinct from old.assigned_to
       and not exists (
         select 1 from public.projects p
         where p.id = old.project_id and p.owner_id = auth.uid()
       ) then
      raise exception 'Only the project owner can reassign a task';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_project_task_identity on public.project_tasks;
create trigger guard_project_task_identity
before update on public.project_tasks
for each row execute procedure public.guard_project_task_identity();

commit;

-- Post-migration checks (run separately after applying in a test project):
-- 1. Confirm the seven *_public views return no private contact columns.
-- 2. Confirm one authenticated user cannot SELECT another user's base-table rows.
-- 3. Confirm users cannot update profiles.roles.
-- 4. Confirm applications to draft/inactive targets are rejected.
-- 5. Confirm an assigned task cannot be moved or reassigned by its assignee.
