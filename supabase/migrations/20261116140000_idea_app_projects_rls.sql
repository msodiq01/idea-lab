-- IDEA LAB: reviewed RLS policies for projects, teams, tasks, and updates
-- Version: 20261116140000
-- Depends on: 20261116120000 and 20261116130000
-- Status: applied to Supabase production project idea-lab on 2026-11-16.
-- Security model: authenticated users only; explicit ownership/membership checks.
-- The idea_app schema remains unexposed. Narrow column grants are limited to safe profile and organization surfaces.

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
set search_path = ''
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
set search_path = ''
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
set search_path = ''
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

-- IDENTITY AND ORGANIZATIONS
-- Schema USAGE is required for anonymous clients to read the two safe directory
-- views after idea_app is explicitly exposed through the Data API. No base-table
-- privileges are granted to anon; RLS and view column projections remain in force.
grant usage on schema idea_app to anon;

create or replace function idea_private.touch_identity_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$function$;
revoke all on function idea_private.touch_identity_updated_at()
  from public, anon, authenticated;

create trigger profiles_touch_updated_at
before update on idea_app.profiles
for each row execute function idea_private.touch_identity_updated_at();
create trigger profile_contacts_touch_updated_at
before update on idea_app.profile_contacts
for each row execute function idea_private.touch_identity_updated_at();
create trigger organizations_touch_updated_at
before update on idea_app.organizations
for each row execute function idea_private.touch_identity_updated_at();

-- Profile contact details remain private. Public views expose display fields only.
create policy profiles_public_read
on idea_app.profiles for select to anon, authenticated
using (
  visibility = 'public'
  and char_length(pg_catalog.btrim(display_name)) between 2 and 120
);
create policy profiles_owner_read
on idea_app.profiles for select to authenticated
using (user_id = (select auth.uid()));
create policy profiles_owner_insert
on idea_app.profiles for insert to authenticated
with check (user_id = (select auth.uid()));
create policy profiles_owner_update
on idea_app.profiles for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy profile_contacts_owner_read
on idea_app.profile_contacts for select to authenticated
using (user_id = (select auth.uid()));
create policy profile_contacts_owner_insert
on idea_app.profile_contacts for insert to authenticated
with check (user_id = (select auth.uid()));
create policy profile_contacts_owner_update
on idea_app.profile_contacts for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy organizations_public_read
on idea_app.organizations for select to anon, authenticated
using (visibility = 'public' and status = 'active');
create policy organizations_owner_read
on idea_app.organizations for select to authenticated
using (owner_id = (select auth.uid()));
create policy organizations_owner_insert
on idea_app.organizations for insert to authenticated
with check (owner_id = (select auth.uid()));
create policy organizations_owner_update
on idea_app.organizations for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));
create policy organizations_owner_delete
on idea_app.organizations for delete to authenticated
using (owner_id = (select auth.uid()));

create policy organization_members_select_participants
on idea_app.organization_members for select to authenticated
using (
  user_id = (select auth.uid())
  or (select idea_private.is_organization_owner(organization_id))
);
create policy organization_members_insert_owner_invitation
on idea_app.organization_members for insert to authenticated
with check (
  user_id <> (select auth.uid())
  and membership_status = 'invited'
  and invited_by = (select auth.uid())
  and invited_at is not null
  and joined_at is null
  and (select idea_private.is_organization_owner(organization_id))
);
create policy organization_members_update_owner
on idea_app.organization_members for update to authenticated
using ((select idea_private.is_organization_owner(organization_id)))
with check ((select idea_private.is_organization_owner(organization_id)));
create policy organization_members_update_self
on idea_app.organization_members for update to authenticated
using (
  user_id = (select auth.uid())
  and membership_status in ('invited', 'active')
)
with check (
  user_id = (select auth.uid())
  and membership_status in ('active', 'declined', 'removed')
);

create or replace function idea_private.guard_organization_member_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_is_owner boolean;
begin
  -- ON DELETE SET NULL from auth.users may execute this FK action without a
  -- request JWT. Permit only that exact system-maintenance transition:
  -- invited_by non-NULL -> NULL, with every other field unchanged.
  if v_actor is null
     and old.invited_by is not null
     and new.invited_by is null
     and (pg_catalog.to_jsonb(new) - 'invited_by' - 'updated_at')
         is not distinct from
         (pg_catalog.to_jsonb(old) - 'invited_by' - 'updated_at') then
    new.updated_at := pg_catalog.now();
    return new;
  end if;

  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if new.id is distinct from old.id
     or new.organization_id is distinct from old.organization_id
     or new.user_id is distinct from old.user_id
     or new.created_at is distinct from old.created_at
     or new.invited_at is distinct from old.invited_at
     or (new.invited_by is distinct from old.invited_by and new.invited_by is not null) then
    raise exception 'Organization membership identity and invitation fields are immutable'
      using errcode = '42501';
  end if;

  v_is_owner := (select idea_private.is_organization_owner(old.organization_id));

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
  elsif v_actor = old.user_id
        and old.membership_status = 'active'
        and new.membership_status = 'removed'
        and new.membership_role = old.membership_role
        and not v_is_owner then
    new.joined_at := old.joined_at;
  elsif v_is_owner
        and old.membership_status in ('invited', 'active')
        and (
          (new.membership_status = 'removed')
          or (
            old.membership_status = 'invited'
            and new.membership_status = 'invited'
            and new.membership_role in ('admin', 'editor', 'member')
          )
          or (
            old.membership_status = 'active'
            and new.membership_status = 'active'
            and new.membership_role in ('admin', 'editor', 'member')
          )
        ) then
    new.joined_at := old.joined_at;
  else
    raise exception 'Organization membership transition is not permitted'
      using errcode = '42501';
  end if;

  new.updated_at := pg_catalog.now();
  return new;
end;
$function$;

revoke all on function idea_private.guard_organization_member_transition()
  from public, anon, authenticated;
create trigger organization_members_guard_transition
before update on idea_app.organization_members
for each row execute function idea_private.guard_organization_member_transition();

-- Invoker views expose no Auth IDs, contact details, or storage object paths.
create view idea_app.public_profile_directory
with (security_invoker = true)
as
select display_name, username, headline, bio, city, country_code, created_at
from idea_app.profiles
where visibility = 'public'
  and char_length(pg_catalog.btrim(display_name)) between 2 and 120;

create view idea_app.public_organization_directory
with (security_invoker = true)
as
select id, name, slug, organization_type, description, location_label, website_url, created_at
from idea_app.organizations
where visibility = 'public' and status = 'active';

-- Column-level grants only. Internal Auth IDs and storage paths stay private.
grant select (display_name, username, headline, bio, city, country_code, visibility, created_at)
  on idea_app.profiles to anon, authenticated;
grant insert (user_id, display_name, username, headline, bio, city, country_code, visibility)
  on idea_app.profiles to authenticated;
grant update (display_name, username, headline, bio, city, country_code, visibility)
  on idea_app.profiles to authenticated;
grant select on idea_app.public_profile_directory to anon, authenticated;

grant select (phone_e164, telegram_handle, contact_email, website_url, visibility, created_at, updated_at)
  on idea_app.profile_contacts to authenticated;
grant insert (user_id, phone_e164, telegram_handle, contact_email, website_url, visibility)
  on idea_app.profile_contacts to authenticated;
grant update (phone_e164, telegram_handle, contact_email, website_url, visibility)
  on idea_app.profile_contacts to authenticated;

grant select (id, name, slug, organization_type, description, location_label, website_url, visibility, status, created_at)
  on idea_app.organizations to anon, authenticated;
grant insert (owner_id, name, slug, organization_type, description, location_label, website_url, visibility, status)
  on idea_app.organizations to authenticated;
grant update (name, slug, organization_type, description, location_label, website_url, visibility, status)
  on idea_app.organizations to authenticated;
grant delete on idea_app.organizations to authenticated;
grant select on idea_app.public_organization_directory to anon, authenticated;

grant select (id, organization_id, membership_role, membership_status, invited_at, joined_at, created_at, updated_at)
  on idea_app.organization_members to authenticated;
grant insert (organization_id, user_id, membership_role, membership_status, invited_by, invited_at, joined_at)
  on idea_app.organization_members to authenticated;
grant update (membership_role, membership_status, joined_at, updated_at)
  on idea_app.organization_members to authenticated;

comment on view idea_app.public_profile_directory is
  'Safe public profile projection; excludes Auth IDs, contact details, and private storage paths.';
comment on view idea_app.public_organization_directory is
  'Safe public organization projection; excludes owner IDs, member identities, and private storage paths.';

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
  'Private IDEA LAB schema. RLS helpers live in non-exposed idea_private; only narrow column grants and safe invoker views are prepared. Data API exposure remains disabled pending staging acceptance.';

commit;
