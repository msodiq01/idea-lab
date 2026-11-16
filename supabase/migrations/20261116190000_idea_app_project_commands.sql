-- IDEA LAB: least-privilege project and membership command RPCs
-- Version: 20261116190000
-- Depends on: 20261116120000 through 20261116150000
-- Status: applied to Supabase production project idea-lab on 2026-11-16.
-- Security: SECURITY INVOKER only. Existing RLS and transition triggers remain authoritative.

begin;

-- Project creation/editing is exposed only through narrow command functions.
-- No table-wide privileges are granted and owner IDs are never client-selected.
grant select (id) on idea_app.projects to authenticated;
grant insert (
  created_by, title, summary, description, project_type,
  status, visibility, start_date, target_date
) on idea_app.projects to authenticated;
grant update (
  title, summary, description, project_type, status,
  visibility, start_date, target_date, updated_at
) on idea_app.projects to authenticated;

create or replace function idea_app.create_project(
  p_title text,
  p_summary text default '',
  p_description text default '',
  p_project_type text default 'other',
  p_visibility text default 'private',
  p_start_date date default null,
  p_target_date date default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_project_id uuid;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  insert into idea_app.projects (
    created_by, title, summary, description, project_type,
    status, visibility, start_date, target_date
  ) values (
    v_actor, p_title, coalesce(p_summary, ''), coalesce(p_description, ''),
    coalesce(p_project_type, 'other'), 'draft',
    coalesce(p_visibility, 'private'), p_start_date, p_target_date
  )
  returning id into v_project_id;

  return v_project_id;
end;
$function$;

create or replace function idea_app.update_project(
  p_project_id uuid,
  p_title text,
  p_summary text,
  p_description text,
  p_project_type text,
  p_status text,
  p_visibility text,
  p_start_date date default null,
  p_target_date date default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_project_id uuid;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_project_id is null then
    raise exception 'Project identifier is required' using errcode = '22023';
  end if;

  update idea_app.projects
  set title = p_title,
      summary = coalesce(p_summary, ''),
      description = coalesce(p_description, ''),
      project_type = p_project_type,
      status = p_status,
      visibility = p_visibility,
      start_date = p_start_date,
      target_date = p_target_date,
      updated_at = pg_catalog.now()
  where id = p_project_id
  returning id into v_project_id;

  if v_project_id is null then
    raise exception 'Project not found or not editable' using errcode = '42501';
  end if;
  return v_project_id;
end;
$function$;

-- Joining a project always creates a pending contributor request.
-- The caller's identity is derived from auth.uid(), never from client input.
grant select (id, project_id, membership_role, membership_status, created_at)
  on idea_app.project_members to authenticated;
grant insert (project_id, user_id, membership_role, membership_status)
  on idea_app.project_members to authenticated;

create or replace function idea_app.request_project_membership(p_project_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_membership_id uuid;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_project_id is null then
    raise exception 'Project identifier is required' using errcode = '22023';
  end if;

  insert into idea_app.project_members (
    project_id, user_id, membership_role, membership_status
  ) values (
    p_project_id, v_actor, 'contributor', 'pending'
  )
  returning id into v_membership_id;

  return v_membership_id;
end;
$function$;

-- The existing invoker trigger enforces owner/manager approval and role limits.
-- This function does not bypass RLS or the transition guard.
create or replace function idea_app.review_project_membership(
  p_membership_id uuid,
  p_approve boolean,
  p_membership_role text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_membership_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_membership_id is null or p_approve is null then
    raise exception 'Membership and decision are required' using errcode = '22023';
  end if;
  if p_membership_role is not null
     and p_membership_role not in ('manager', 'contributor', 'viewer') then
    raise exception 'Invalid membership role' using errcode = '22023';
  end if;

  update idea_app.project_members
  set membership_status = case when p_approve then 'active' else 'declined' end,
      membership_role = coalesce(p_membership_role, membership_role),
      updated_at = pg_catalog.now()
  where id = p_membership_id
    and membership_status = 'pending'
  returning id into v_membership_id;

  if v_membership_id is null then
    raise exception 'Request not found or not reviewable by this account'
      using errcode = '42501';
  end if;
  return v_membership_id;
end;
$function$;

create or replace function idea_app.leave_project(p_membership_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_membership_id uuid;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_membership_id is null then
    raise exception 'Membership identifier is required' using errcode = '22023';
  end if;

  update idea_app.project_members
  set membership_status = 'removed',
      updated_at = pg_catalog.now()
  where id = p_membership_id
    and membership_status = 'active'
  returning id into v_membership_id;

  if v_membership_id is null then
    raise exception 'Active membership not found' using errcode = '42501';
  end if;
  return v_membership_id;
end;
$function$;

-- Revoke default PUBLIC execute on every new function; grant only signed-in clients.
revoke all on function idea_app.create_project(text, text, text, text, text, date, date)
  from public, anon, authenticated;
revoke all on function idea_app.update_project(uuid, text, text, text, text, text, text, date, date)
  from public, anon, authenticated;
revoke all on function idea_app.request_project_membership(uuid)
  from public, anon, authenticated;
revoke all on function idea_app.review_project_membership(uuid, boolean, text)
  from public, anon, authenticated;
revoke all on function idea_app.leave_project(uuid)
  from public, anon, authenticated;

grant execute on function idea_app.create_project(text, text, text, text, text, date, date)
  to authenticated;
grant execute on function idea_app.update_project(uuid, text, text, text, text, text, text, date, date)
  to authenticated;
grant execute on function idea_app.request_project_membership(uuid)
  to authenticated;
grant execute on function idea_app.review_project_membership(uuid, boolean, text)
  to authenticated;
grant execute on function idea_app.leave_project(uuid)
  to authenticated;

comment on function idea_app.create_project(text, text, text, text, text, date, date) is
  'Invoker command: creates a draft project owned by auth.uid(); RLS and project constraints apply.';
comment on function idea_app.update_project(uuid, text, text, text, text, text, text, date, date) is
  'Invoker command: updates only the caller-owned project; RLS and project constraints apply.';
comment on function idea_app.request_project_membership(uuid) is
  'Invoker command: requests contributor membership in a public recruiting project; always pending.';
comment on function idea_app.review_project_membership(uuid, boolean, text) is
  'Invoker command: asks existing RLS and transition trigger to approve or decline a pending request.';
comment on function idea_app.leave_project(uuid) is
  'Invoker command: lets the authenticated active member leave their own project team.';

commit;
