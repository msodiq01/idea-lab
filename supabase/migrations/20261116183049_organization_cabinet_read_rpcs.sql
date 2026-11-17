-- Read-only organization cabinet RPCs; caller privileges and existing RLS remain in force.
create or replace function public.idea_lab_list_my_organizations()
returns table (
  id uuid, name text, slug text, organization_type text, description text,
  location_label text, website_url text, visibility text, status text,
  created_at timestamptz, updated_at timestamptz
)
language sql stable security invoker set search_path = ''
as $$
  select o.id,o.name,o.slug,o.organization_type,o.description,o.location_label,
         o.website_url,o.visibility,o.status,o.created_at,o.updated_at
  from idea_app.organizations o
  where o.owner_id = auth.uid()
  order by o.updated_at desc
  limit 100;
$$;

create or replace function public.idea_lab_list_organization_members(p_organization_id uuid)
returns table (
  id uuid, user_id uuid, membership_role text, membership_status text,
  invited_by uuid, invited_at timestamptz, joined_at timestamptz, created_at timestamptz
)
language sql stable security invoker set search_path = ''
as $$
  select m.id,m.user_id,m.membership_role,m.membership_status,m.invited_by,
         m.invited_at,m.joined_at,m.created_at
  from idea_app.organization_members m
  where m.organization_id = p_organization_id
  order by m.created_at asc
  limit 200;
$$;

revoke all on function public.idea_lab_list_my_organizations() from public, anon;
revoke all on function public.idea_lab_list_organization_members(uuid) from public, anon;
grant execute on function public.idea_lab_list_my_organizations() to authenticated;
grant execute on function public.idea_lab_list_organization_members(uuid) to authenticated;
