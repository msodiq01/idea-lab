-- IDEA LAB: authenticated team membership requests and owner review.
-- Uses existing idea_app.organizations / organization_members model.
-- No private contact fields are exposed through the public team directory.

begin;

grant insert, update on table idea_app.organization_members to authenticated;

drop policy if exists organization_members_insert_self_team_request on idea_app.organization_members;
create policy organization_members_insert_self_team_request
  on idea_app.organization_members
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and membership_role = 'member'
    and membership_status = 'pending'
    and invited_by is null
    and invited_at is null
    and joined_at is null
    and exists (
      select 1 from idea_app.organizations o
      where o.id = organization_members.organization_id
        and o.organization_type = 'team'
        and o.visibility = 'public'
        and o.status = 'active'
        and o.owner_id <> (select auth.uid())
    )
  );

create or replace function public.idea_lab_request_team_membership(p_organization_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  insert into idea_app.organization_members (
    organization_id, user_id, membership_role, membership_status,
    invited_by, invited_at, joined_at
  )
  select o.id, auth.uid(), 'member', 'pending', null, null, null
  from idea_app.organizations o
  where o.id = p_organization_id
    and o.organization_type = 'team'
    and o.visibility = 'public'
    and o.status = 'active'
    and o.owner_id <> auth.uid()
  on conflict (organization_id, user_id) do nothing
  returning id into v_id;
  if v_id is null then
    raise exception 'Team is unavailable or membership already exists' using errcode = '23505';
  end if;
  return v_id;
end;
$function$;

create or replace function public.idea_lab_review_team_membership(
  p_membership_id uuid, p_approve boolean
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $function$
declare v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  update idea_app.organization_members m
  set membership_status = case when p_approve then 'active' else 'declined' end,
      joined_at = case when p_approve then now() else null end,
      updated_at = now()
  where m.id = p_membership_id
    and m.membership_status = 'pending'
    and exists (
      select 1 from idea_app.organizations o
      where o.id = m.organization_id
        and o.organization_type = 'team'
        and o.owner_id = auth.uid()
    );
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$function$;

revoke all on function public.idea_lab_request_team_membership(uuid) from public, anon;
revoke all on function public.idea_lab_review_team_membership(uuid, boolean) from public, anon;
grant execute on function public.idea_lab_request_team_membership(uuid) to authenticated;
grant execute on function public.idea_lab_review_team_membership(uuid, boolean) to authenticated;

commit;
