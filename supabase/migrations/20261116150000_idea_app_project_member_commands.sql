-- IDEA LAB: guarded membership transitions and project task assignment
-- Version: 20261116150000
-- Depends on: 20261116120000, 20261116130000, 20261116140000
-- Status: applied to Supabase production project idea-lab on 2026-11-16.
-- No schema exposure or table-wide browser grants are added.

begin;

-- The trigger validates an assignee without granting clients access to
-- project owner IDs or the private membership roster.
create or replace function idea_private.is_valid_project_task_assignee(
  p_project_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select (select auth.uid()) is not null
    and pg_catalog.pg_trigger_depth() > 0
    and p_project_id is not null
    and p_user_id is not null
    and exists (
      select 1
      from idea_app.projects p
      where p.id = p_project_id
        and (
          p.created_by = p_user_id
          or exists (
            select 1
            from idea_app.project_members pm
            where pm.project_id = p.id
              and pm.user_id = p_user_id
              and pm.membership_status = 'active'
          )
        )
    );
$function$;

revoke all on function idea_private.is_valid_project_task_assignee(uuid, uuid)
  from public, anon, authenticated;
grant execute on function idea_private.is_valid_project_task_assignee(uuid, uuid)
  to authenticated;

-- A trigger is used instead of an exposed SECURITY DEFINER RPC. This keeps
-- privileged mutations out of the Data API while column grants + RLS + the
-- invoker trigger constrain the permitted state transitions.
create or replace function idea_private.enforce_project_member_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_is_owner boolean;
  v_is_manager boolean;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if new.project_id is distinct from old.project_id
     or new.user_id is distinct from old.user_id
     or new.invited_by is distinct from old.invited_by
     or new.invited_at is distinct from old.invited_at
     or new.created_at is distinct from old.created_at then
    raise exception 'Membership identity and invitation fields are immutable'
      using errcode = '42501';
  end if;

  v_is_owner := (select idea_private.is_project_owner(old.project_id));
  v_is_manager := (select idea_private.has_active_project_role(
    old.project_id, array['manager']::text[]
  ));

  -- The invited user may accept or decline their own invitation.
  if v_actor = old.user_id
     and old.membership_status = 'invited'
     and new.membership_status in ('active', 'declined')
     and new.membership_role = old.membership_role
     and not v_is_owner then
    if new.membership_status = 'active' then
      new.joined_at := pg_catalog.now();
    else
      new.joined_at := null;
    end if;

  -- Project owner or active manager may approve/reject a pending join request.
  elsif old.membership_status = 'pending'
        and new.membership_status in ('active', 'declined')
        and (v_is_owner or v_is_manager) then
    if v_is_manager and not v_is_owner
       and (
         new.membership_role not in ('contributor', 'viewer')
         or new.membership_role is distinct from old.membership_role
       ) then
      raise exception 'Managers cannot assign or change membership roles'
        using errcode = '42501';
    end if;

    if new.membership_status = 'active' then
      new.joined_at := pg_catalog.now();
    else
      new.joined_at := null;
    end if;

  -- A member may leave voluntarily, but cannot change their role.
  elsif v_actor = old.user_id
        and old.membership_status = 'active'
        and new.membership_status = 'removed'
        and new.membership_role = old.membership_role
        and not v_is_owner then
    new.joined_at := old.joined_at;

  -- Only the project owner may change the role of an active member.
  elsif v_is_owner
        and old.membership_status = 'active'
        and new.membership_status = 'active'
        and new.membership_role in ('manager', 'contributor', 'viewer') then
    new.joined_at := old.joined_at;

  else
    raise exception 'Membership transition is not permitted'
      using errcode = '42501';
  end if;

  new.updated_at := pg_catalog.now();
  return new;
end;
$function$;

revoke all on function idea_private.enforce_project_member_transition()
  from public, anon, authenticated;

create trigger project_members_guard_transition
before update on idea_app.project_members
for each row
execute function idea_private.enforce_project_member_transition();

-- Task assignment is permitted only to the project owner or an active member.
-- The trigger is SECURITY INVOKER; the authorization lookup helpers are the
-- only SECURITY DEFINER functions and live in the non-exposed idea_private schema.
create or replace function idea_private.validate_project_task_assignee()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if new.assignee_id is not null
     and not (select idea_private.is_valid_project_task_assignee(new.project_id, new.assignee_id)) then
    raise exception 'Task assignee must be the project owner or an active project member'
      using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and new.project_id is distinct from old.project_id then
    raise exception 'A task cannot be moved to another project'
      using errcode = '42501';
  end if;

  new.updated_at := pg_catalog.now();
  return new;
end;
$function$;

revoke all on function idea_private.validate_project_task_assignee()
  from public, anon, authenticated;

create trigger project_tasks_validate_assignee
before insert or update on idea_app.project_tasks
for each row
execute function idea_private.validate_project_task_assignee();

-- Column-level privileges only. No SELECT/INSERT/DELETE or table-wide access.
-- Schema USAGE is not Data API exposure; no table-wide privileges are granted.
grant usage on schema idea_app to authenticated;

grant update (membership_role, membership_status, joined_at, updated_at)
  on idea_app.project_members to authenticated;

grant update (
  title, description, status, priority, due_at, completed_at,
  sort_order, assignee_id, updated_at
) on idea_app.project_tasks to authenticated;

-- RLS still determines which rows may be updated. The trigger above constrains
-- the allowed transitions and prevents changing identity/invitation fields.
create policy project_members_update_owner_manager
on idea_app.project_members for update to authenticated
using (
  (select idea_private.is_project_owner(project_id))
  or (select idea_private.has_active_project_role(project_id, array['manager']::text[]))
)
with check (
  (select idea_private.is_project_owner(project_id))
  or (select idea_private.has_active_project_role(project_id, array['manager']::text[]))
);

create policy project_members_update_self
on idea_app.project_members for update to authenticated
using (
  user_id = (select auth.uid())
  and membership_status in ('invited', 'active')
)
with check (
  user_id = (select auth.uid())
  and membership_status in ('active', 'declined', 'removed')
);

create policy project_tasks_update_owner_manager
on idea_app.project_tasks for update to authenticated
using (
  (select idea_private.is_project_owner(project_id))
  or (select idea_private.has_active_project_role(project_id, array['manager']::text[]))
)
with check (
  (select idea_private.is_project_owner(project_id))
  or (select idea_private.has_active_project_role(project_id, array['manager']::text[]))
);

comment on function idea_private.enforce_project_member_transition() is
  'Invoker trigger: permits only invite acceptance/decline, owner/manager request decisions, voluntary leave, and owner role changes.';
comment on function idea_private.validate_project_task_assignee() is
  'Invoker trigger: validates task assignee is the project owner or an active project member.';

commit;
