-- IDEA LAB: reviewed RLS policies for projects, teams, tasks, and updates
-- Version: 20261116140000
-- Depends on: 20261116120000 and 20261116130000
-- Status: repository draft only; NOT applied to any Supabase project.
-- Security model: authenticated users only; explicit ownership/membership checks.
-- The idea_app schema remains unexposed and no table privileges are granted.

begin;

-- Keep privileged lookup helpers in a separate, never-exposed schema.
create schema idea_private;
revoke all on schema idea_private from public, anon, authenticated;

-- Narrow SECURITY DEFINER helpers are used only for cross-row membership checks.
-- They are non-exposed, have a pinned search_path, contain no dynamic SQL, and
-- always bind the decision to the verified auth.uid() from the request JWT.
create or replace function idea_private.is_project_owner(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, idea_app
as $function$
  select (select auth.uid()) is not null
    and exists (
      select 1 from idea_app.projects p
      where p.id = p_project_id
        and p.created_by = (select auth.uid())
    );
$function$;

create or replace function idea_private.has_active_project_role(
  p_project_id uuid,
  p_allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, idea_app
as $function$
  select (select auth.uid()) is not null
    and p_allowed_roles is not null
    and exists (
      select 1 from idea_app.project_members pm
      where pm.project_id = p_project_id
        and pm.user_id = (select auth.uid())
        and pm.membership_status = 'active'
        and pm.membership_role = any (p_allowed_roles)
    );
$function$;

create or replace function idea_private.is_organization_owner(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, idea_app
as $function$
  select (select auth.uid()) is not null
    and exists (
      select 1 from idea_app.organizations o
      where o.id = p_organization_id
        and o.owner_id = (select auth.uid())
    );
$function$;

-- Functions are callable by signed-in users only. The schema is not exposed
-- through the Data API and the tables receive no browser grants in this phase.
revoke all on function idea_private.is_project_owner(uuid) from public, anon, authenticated;
revoke all on function idea_private.has_active_project_role(uuid, text[]) from public, anon, authenticated;
revoke all on function idea_private.is_organization_owner(uuid) from public, anon, authenticated;

grant usage on schema idea_private to authenticated;
grant execute on function idea_private.is_project_owner(uuid) to authenticated;
grant execute on function idea_private.has_active_project_role(uuid, text[]) to authenticated;
grant execute on function idea_private.is_organization_owner(uuid) to authenticated;

comment on function idea_private.is_project_owner(uuid) is
  'Non-exposed RLS helper: true only when auth.uid() owns the supplied project.';
comment on function idea_private.has_active_project_role(uuid, text[]) is
  'Non-exposed RLS helper: checks the caller active membership and an explicit allowed role list.';
comment on function idea_private.is_organization_owner(uuid) is
  'Non-exposed RLS helper: true only when auth.uid() owns the supplied organization.';

-- PROJECTS
create policy projects_select_authorized
on idea_app.projects for select to authenticated
using (
  created_by = (select auth.uid())
  or (visibility = 'public' and status in ('recruiting', 'active', 'completed'))
  or (select idea_private.has_active_project_role(id, array['manager', 'contributor', 'viewer']::text[]))
);

create policy projects_insert_owner
on idea_app.projects for insert to authenticated
with check (
  created_by = (select auth.uid())
  and (organization_id is null or (select idea_private.is_organization_owner(organization_id)))
);

create policy projects_update_owner
on idea_app.projects for update to authenticated
using (created_by = (select auth.uid()))
with check (
  created_by = (select auth.uid())
  and (organization_id is null or (select idea_private.is_organization_owner(organization_id)))
);

create policy projects_delete_owner
on idea_app.projects for delete to authenticated
using (created_by = (select auth.uid()));

-- PROJECT MEMBERS
create policy project_members_select_participants
on idea_app.project_members for select to authenticated
using (
  user_id = (select auth.uid())
  or (select idea_private.is_project_owner(project_id))
  or (select idea_private.has_active_project_role(project_id, array['manager']::text[]))
);

-- Self-service creates a pending request only. Owner/manager invitations are separate.
create policy project_members_insert_request_or_invitation
on idea_app.project_members for insert to authenticated
with check (
  (
    user_id = (select auth.uid())
    and membership_role in ('contributor', 'viewer')
    and membership_status = 'pending'
    and invited_by is null
    and invited_at is null
    and joined_at is null
    and exists (
      select 1 from idea_app.projects p
      where p.id = project_id
        and p.visibility = 'public'
        and p.status = 'recruiting'
    )
  )
  or
  (
    invited_by = (select auth.uid())
    and membership_status = 'invited'
    and invited_at is not null
    and joined_at is null
    and (
      (select idea_private.is_project_owner(project_id))
      or (
        membership_role in ('contributor', 'viewer')
        and (select idea_private.has_active_project_role(project_id, array['manager']::text[]))
      )
    )
  )
);

-- Status/role transitions are withheld from direct client UPDATE. A later,
-- narrow transactional server operation will implement acceptance/approval.
create policy project_members_delete_owner_or_manager
on idea_app.project_members for delete to authenticated
using (
  (select idea_private.is_project_owner(project_id))
  or (
    membership_role in ('contributor', 'viewer')
    and (select idea_private.has_active_project_role(project_id, array['manager']::text[]))
  )
);

-- PROJECT TASKS
create policy project_tasks_select_team
on idea_app.project_tasks for select to authenticated
using (
  (select idea_private.is_project_owner(project_id))
  or (select idea_private.has_active_project_role(project_id, array['manager', 'contributor', 'viewer']::text[]))
);

create policy project_tasks_insert_team
on idea_app.project_tasks for insert to authenticated
with check (
  created_by = (select auth.uid())
  and (assignee_id is null or assignee_id = (select auth.uid()))
  and (
    (select idea_private.is_project_owner(project_id))
    or (select idea_private.has_active_project_role(project_id, array['manager', 'contributor']::text[]))
  )
);

-- Assignment to another person is withheld until a dedicated server operation exists.
create policy project_tasks_update_creator
on idea_app.project_tasks for update to authenticated
using (
  created_by = (select auth.uid())
  and (
    (select idea_private.is_project_owner(project_id))
    or (select idea_private.has_active_project_role(project_id, array['manager', 'contributor']::text[]))
  )
)
with check (
  created_by = (select auth.uid())
  and (assignee_id is null or assignee_id = (select auth.uid()))
  and (
    (select idea_private.is_project_owner(project_id))
    or (select idea_private.has_active_project_role(project_id, array['manager', 'contributor']::text[]))
  )
);

create policy project_tasks_delete_owner_or_manager
on idea_app.project_tasks for delete to authenticated
using (
  (select idea_private.is_project_owner(project_id))
  or (select idea_private.has_active_project_role(project_id, array['manager']::text[]))
);

-- PROJECT UPDATES
create policy project_updates_select_team_or_public
on idea_app.project_updates for select to authenticated
using (
  (select idea_private.is_project_owner(project_id))
  or (select idea_private.has_active_project_role(project_id, array['manager', 'contributor', 'viewer']::text[]))
  or (
    visibility = 'public'
    and publication_status = 'published'
    and exists (
      select 1 from idea_app.projects p
      where p.id = project_id
        and p.visibility = 'public'
        and p.status in ('recruiting', 'active', 'completed')
    )
  )
);

create policy project_updates_insert_team
on idea_app.project_updates for insert to authenticated
with check (
  author_id = (select auth.uid())
  and publication_status = 'draft'
  and (
    (select idea_private.is_project_owner(project_id))
    or (select idea_private.has_active_project_role(project_id, array['manager', 'contributor']::text[]))
  )
);

-- Authors edit their own updates. Public publication is reserved to owner/manager.
create policy project_updates_update_author
on idea_app.project_updates for update to authenticated
using (
  author_id = (select auth.uid())
  and (
    (select idea_private.is_project_owner(project_id))
    or (select idea_private.has_active_project_role(project_id, array['manager', 'contributor']::text[]))
  )
)
with check (
  author_id = (select auth.uid())
  and (
    publication_status = 'draft'
    or (publication_status = 'published' and visibility = 'team')
    or (
      publication_status = 'published'
      and visibility = 'public'
      and (
        (select idea_private.is_project_owner(project_id))
        or (select idea_private.has_active_project_role(project_id, array['manager']::text[]))
      )
    )
  )
  and (
    (select idea_private.is_project_owner(project_id))
    or (select idea_private.has_active_project_role(project_id, array['manager', 'contributor']::text[]))
  )
);

create policy project_updates_delete_author_or_manager
on idea_app.project_updates for delete to authenticated
using (
  author_id = (select auth.uid())
  or (select idea_private.is_project_owner(project_id))
  or (select idea_private.has_active_project_role(project_id, array['manager']::text[]))
);

-- No table GRANTs are made here. RLS policies do not expose the schema or grant
-- table access; Data API exposure and per-table privileges remain a separate gate.
comment on schema idea_app is
  'Private IDEA LAB schema. RLS helpers live in non-exposed idea_private; Data API exposure and table grants remain disabled pending staging acceptance.';

commit;
