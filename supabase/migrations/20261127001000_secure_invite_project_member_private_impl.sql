-- Keep the privileged project-member invitation implementation outside exposed schemas.
-- The live database already has this change; this migration reconciles repository history.

create schema if not exists idea_private;

create or replace function idea_private.ilab_invite_project_member_impl(
  p_project_id uuid,
  p_email text,
  p_role text default 'editor'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_role not in ('viewer', 'editor') then
    raise exception 'Invalid role';
  end if;

  if not exists (
    select 1
    from public.ilab_projects p
    where p.id = p_project_id
      and p.owner_id = auth.uid()
  ) then
    raise exception 'Only the project owner can invite members';
  end if;

  select u.id
    into v_user_id
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1;

  if v_user_id is null then
    raise exception 'No account found for this email. Ask them to create an IDEA LAB account first.';
  end if;

  if v_user_id = auth.uid() then
    raise exception 'You already own this project';
  end if;

  insert into public.ilab_project_members(project_id, user_id, role, invited_by)
  values (p_project_id, v_user_id, p_role, auth.uid())
  on conflict (project_id, user_id)
  do update set role = excluded.role, invited_by = excluded.invited_by;

  return jsonb_build_object('success', true, 'role', p_role);
end;
$function$;

revoke all on function idea_private.ilab_invite_project_member_impl(uuid, text, text) from public, anon;
grant usage on schema idea_private to authenticated;
grant execute on function idea_private.ilab_invite_project_member_impl(uuid, text, text) to authenticated;

create or replace function public.ilab_invite_project_member(
  p_project_id uuid,
  p_email text,
  p_role text default 'editor'
)
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select idea_private.ilab_invite_project_member_impl(p_project_id, p_email, p_role);
$function$;

revoke all on function public.ilab_invite_project_member(uuid, text, text) from public, anon;
grant execute on function public.ilab_invite_project_member(uuid, text, text) to authenticated;
