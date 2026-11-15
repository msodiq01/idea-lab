-- IDEA LAB: projects, project teams, tasks, and updates
-- Version: 20261116130000
-- Depends on: 20261116120000_idea_app_identity_organizations.sql
-- Status: repository draft only; NOT applied to any Supabase project.
-- Scope: additive objects in the private idea_app schema. Existing public schema is untouched.
-- Access: deny-by-default. No Data API exposure, client grants, or RLS policies in this phase.

begin;

create table idea_app.projects (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete restrict,
  organization_id uuid references idea_app.organizations(id) on delete set null,
  title text not null,
  summary text not null default '',
  description text not null default '',
  project_type text not null default 'other',
  status text not null default 'draft',
  visibility text not null default 'private',
  start_date date,
  target_date date,
  cover_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_title_length check (
    char_length(trim(title)) between 3 and 160
  ),
  constraint projects_summary_length check (char_length(summary) <= 320),
  constraint projects_description_length check (char_length(description) <= 6000),
  constraint projects_type_check check (
    project_type in (
      'startup', 'social', 'research', 'education',
      'technology', 'creative', 'community', 'other'
    )
  ),
  constraint projects_status_check check (
    status in ('draft', 'recruiting', 'active', 'paused', 'completed', 'archived')
  ),
  constraint projects_visibility_check check (
    visibility in ('private', 'unlisted', 'public')
  ),
  constraint projects_target_date_check check (
    target_date is null or start_date is null or target_date >= start_date
  )
);

create index projects_creator_created_idx
  on idea_app.projects (created_by, created_at desc);

create index projects_organization_created_idx
  on idea_app.projects (organization_id, created_at desc)
  where organization_id is not null;

create index projects_directory_idx
  on idea_app.projects (status, project_type, created_at desc)
  where visibility = 'public';

create table idea_app.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null
    references idea_app.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  membership_role text not null default 'contributor',
  membership_status text not null default 'pending',
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_members_role_check check (
    membership_role in ('manager', 'contributor', 'viewer')
  ),
  constraint project_members_status_check check (
    membership_status in ('invited', 'pending', 'active', 'declined', 'removed')
  ),
  constraint project_members_invited_at_check check (
    membership_status <> 'invited' or invited_at is not null
  ),
  constraint project_members_joined_at_check check (
    membership_status <> 'active' or joined_at is not null
  ),
  constraint project_members_project_user_unique unique (project_id, user_id)
);

create index project_members_user_status_idx
  on idea_app.project_members (user_id, membership_status);

create index project_members_project_status_idx
  on idea_app.project_members (project_id, membership_status);

create table idea_app.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null
    references idea_app.projects(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  assignee_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text not null default '',
  status text not null default 'todo',
  priority text not null default 'normal',
  due_at timestamptz,
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_tasks_title_length check (
    char_length(trim(title)) between 2 and 180
  ),
  constraint project_tasks_description_length check (
    char_length(description) <= 4000
  ),
  constraint project_tasks_status_check check (
    status in ('todo', 'in_progress', 'blocked', 'done', 'cancelled')
  ),
  constraint project_tasks_priority_check check (
    priority in ('low', 'normal', 'high', 'urgent')
  ),
  constraint project_tasks_sort_order_check check (sort_order >= 0),
  constraint project_tasks_completed_at_check check (
    status <> 'done' or completed_at is not null
  )
);

create index project_tasks_project_status_due_idx
  on idea_app.project_tasks (project_id, status, due_at);

create index project_tasks_assignee_status_idx
  on idea_app.project_tasks (assignee_id, status)
  where assignee_id is not null;

create table idea_app.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null
    references idea_app.projects(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete restrict,
  title text not null,
  body text not null,
  update_type text not null default 'progress',
  visibility text not null default 'team',
  publication_status text not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_updates_title_length check (
    char_length(trim(title)) between 2 and 180
  ),
  constraint project_updates_body_length check (
    char_length(trim(body)) between 1 and 8000
  ),
  constraint project_updates_type_check check (
    update_type in ('announcement', 'progress', 'milestone', 'blocker')
  ),
  constraint project_updates_visibility_check check (
    visibility in ('team', 'public')
  ),
  constraint project_updates_publication_status_check check (
    publication_status in ('draft', 'published')
  ),
  constraint project_updates_published_at_check check (
    publication_status <> 'published' or published_at is not null
  )
);

create index project_updates_project_created_idx
  on idea_app.project_updates (project_id, created_at desc);

create index project_updates_public_feed_idx
  on idea_app.project_updates (created_at desc)
  where visibility = 'public' and publication_status = 'published';

-- RLS is enabled before any future API exposure. No policies means no row access.
alter table idea_app.projects enable row level security;
alter table idea_app.project_members enable row level security;
alter table idea_app.project_tasks enable row level security;
alter table idea_app.project_updates enable row level security;

-- Browser roles receive no direct table privileges in this foundation phase.
revoke all on all tables in schema idea_app from public, anon, authenticated;

comment on table idea_app.projects is
  'Project records; created_by is the canonical individual owner and organization_id is an optional affiliation.';
comment on table idea_app.project_members is
  'Project team membership. Project creator ownership is represented by projects.created_by, not a client-editable membership role.';
comment on table idea_app.project_tasks is
  'Project work items. Assignment authorization and cross-project membership checks must be enforced in the later RLS/API phase.';
comment on table idea_app.project_updates is
  'Project updates. Publication visibility is metadata only until reviewed RLS policies and a safe public projection exist.';

commit;
