-- IDEA LAB: public project listings, safe public projections, and applications
-- Version: 20261116160000
-- Depends on: identity, projects, project RLS, and guarded project commands migrations.
-- Status: repository draft only; NOT applied to any Supabase project.
-- Existing public schema is untouched. Data API schema exposure remains a separate gate.

begin;

create table idea_app.project_listings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references idea_app.projects(id) on delete cascade,
  slug text not null unique,
  title text not null,
  summary text not null,
  category text not null default 'other',
  listing_status text not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_listings_slug_format check (
    slug = lower(slug)
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and char_length(slug) between 3 and 100
  ),
  constraint project_listings_title_length check (char_length(trim(title)) between 3 and 160),
  constraint project_listings_summary_length check (char_length(trim(summary)) between 1 and 600),
  constraint project_listings_category_check check (
    category in ('startup', 'social', 'research', 'education', 'technology', 'creative', 'community', 'other')
  ),
  constraint project_listings_status_check check (
    listing_status in ('draft', 'published', 'paused', 'closed')
  ),
  constraint project_listings_published_at_check check (
    listing_status <> 'published' or published_at is not null
  )
);

create index project_listings_public_idx
  on idea_app.project_listings (published_at desc)
  where listing_status = 'published';

create table idea_app.applications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references idea_app.projects(id) on delete cascade,
  applicant_id uuid not null references auth.users(id) on delete cascade,
  applicant_note text not null default '',
  status text not null default 'submitted',
  reviewer_note text not null default '',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applications_project_applicant_unique unique (project_id, applicant_id),
  constraint applications_note_length check (char_length(applicant_note) <= 3000),
  constraint applications_reviewer_note_length check (char_length(reviewer_note) <= 2000),
  constraint applications_status_check check (
    status in ('submitted', 'in_review', 'accepted', 'rejected', 'withdrawn')
  ),
  constraint applications_reviewed_at_check check (
    status not in ('in_review', 'accepted', 'rejected') or reviewed_at is not null
  )
);

create index applications_project_status_idx
  on idea_app.applications (project_id, status, submitted_at desc);
create index applications_applicant_created_idx
  on idea_app.applications (applicant_id, created_at desc);

alter table idea_app.project_listings enable row level security;
alter table idea_app.applications enable row level security;

-- Listings: public reads are restricted to published listings attached to public,
-- recruiting/active/completed projects. Owners manage their own listing.
create policy project_listings_public_read
on idea_app.project_listings for select to anon, authenticated
using (
  listing_status = 'published'
  and exists (
    select 1 from idea_app.projects p
    where p.id = project_id
      and p.visibility = 'public'
      and p.status in ('recruiting', 'active', 'completed')
  )
);

create policy project_listings_owner_read
on idea_app.project_listings for select to authenticated
using ((select idea_private.is_project_owner(project_id)));

create policy project_listings_owner_insert
on idea_app.project_listings for insert to authenticated
with check ((select idea_private.is_project_owner(project_id)));

create policy project_listings_owner_update
on idea_app.project_listings for update to authenticated
using ((select idea_private.is_project_owner(project_id)))
with check ((select idea_private.is_project_owner(project_id)));

create policy project_listings_owner_delete
on idea_app.project_listings for delete to authenticated
using ((select idea_private.is_project_owner(project_id)));

-- A person can see their own applications; the project owner and active managers
-- can see applications addressed to their project. No contact details are stored here.
create policy applications_select_participants
on idea_app.applications for select to authenticated
using (
  applicant_id = (select auth.uid())
  or (select idea_private.is_project_owner(project_id))
  or (select idea_private.has_active_project_role(project_id, array['manager']::text[]))
);

create policy applications_insert_applicant
on idea_app.applications for insert to authenticated
with check (
  applicant_id = (select auth.uid())
  and status = 'submitted'
  and reviewer_note = ''
  and reviewed_at is null
  and exists (
    select 1
    from idea_app.project_listings l
    join idea_app.projects p on p.id = l.project_id
    where l.project_id = applications.project_id
      and l.listing_status = 'published'
      and p.visibility = 'public'
      and p.status = 'recruiting'
      and p.created_by <> (select auth.uid())
  )
);

create policy applications_update_applicant_withdraw
on idea_app.applications for update to authenticated
using (applicant_id = (select auth.uid()))
with check (applicant_id = (select auth.uid()));

create policy applications_update_project_reviewers
on idea_app.applications for update to authenticated
using (
  (select idea_private.is_project_owner(project_id))
  or (select idea_private.has_active_project_role(project_id, array['manager']::text[]))
)
with check (
  (select idea_private.is_project_owner(project_id))
  or (select idea_private.has_active_project_role(project_id, array['manager']::text[]))
);

-- Server-side transition guard. No SECURITY DEFINER endpoint is introduced.
create or replace function idea_private.guard_application_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_is_reviewer boolean;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if new.id is distinct from old.id
     or new.project_id is distinct from old.project_id
     or new.applicant_id is distinct from old.applicant_id
     or new.applicant_note is distinct from old.applicant_note
     or new.submitted_at is distinct from old.submitted_at
     or new.created_at is distinct from old.created_at then
    raise exception 'Application identity and applicant content are immutable'
      using errcode = '42501';
  end if;

  v_is_reviewer :=
    (select idea_private.is_project_owner(old.project_id))
    or (select idea_private.has_active_project_role(old.project_id, array['manager']::text[]));

  if v_actor = old.applicant_id
     and not v_is_reviewer
     and old.status in ('submitted', 'in_review')
     and new.status = 'withdrawn'
     and new.reviewer_note = old.reviewer_note
     and new.reviewed_at is not distinct from old.reviewed_at then
    null;
  elsif v_is_reviewer
        and old.status in ('submitted', 'in_review')
        and new.status in ('in_review', 'accepted', 'rejected')
        and (new.status <> 'in_review' or old.status = 'submitted') then
    new.reviewed_at := pg_catalog.now();
  else
    raise exception 'Application status transition is not permitted'
      using errcode = '42501';
  end if;

  new.updated_at := pg_catalog.now();
  return new;
end;
$function$;

revoke all on function idea_private.guard_application_transition()
  from public, anon, authenticated;

create trigger applications_guard_transition
before update on idea_app.applications
for each row execute function idea_private.guard_application_transition();

-- Public projections expose only listing-safe fields and published update content.
-- security_invoker ensures underlying grants and RLS remain in force.
create view idea_app.public_project_directory
with (security_invoker = true)
as
select
  l.slug,
  l.title,
  l.summary,
  l.category,
  p.project_type,
  p.status as project_status,
  p.start_date,
  p.target_date,
  l.published_at
from idea_app.project_listings l
join idea_app.projects p on p.id = l.project_id
where l.listing_status = 'published'
  and p.visibility = 'public'
  and p.status in ('recruiting', 'active', 'completed');

create view idea_app.public_project_updates
with (security_invoker = true)
as
select
  l.slug as project_slug,
  u.title,
  u.body,
  u.update_type,
  u.published_at
from idea_app.project_updates u
join idea_app.project_listings l on l.project_id = u.project_id
join idea_app.projects p on p.id = u.project_id
where l.listing_status = 'published'
  and p.visibility = 'public'
  and p.status in ('recruiting', 'active', 'completed')
  and u.visibility = 'public'
  and u.publication_status = 'published';

-- The views are intentionally not yet Data API-exposed. These grants are
-- narrow prerequisites for a later, explicit schema-exposure review.
grant usage on schema idea_app to anon, authenticated;
grant usage on schema idea_private to authenticated;

grant select (id, title, summary, project_type, status, visibility, start_date, target_date)
  on idea_app.projects to anon, authenticated;
grant select (project_id, slug, title, summary, category, listing_status, published_at)
  on idea_app.project_listings to anon, authenticated;
grant select (project_id, title, body, update_type, visibility, publication_status, published_at)
  on idea_app.project_updates to anon, authenticated;
grant select on idea_app.public_project_directory, idea_app.public_project_updates
  to anon, authenticated;

grant select on idea_app.applications to authenticated;
grant insert (project_id, applicant_id, applicant_note, status, reviewer_note, reviewed_at)
  on idea_app.applications to authenticated;
grant update (status, reviewer_note, reviewed_at, updated_at)
  on idea_app.applications to authenticated;

grant select on idea_app.project_listings to authenticated;
grant insert (project_id, slug, title, summary, category, listing_status, published_at, updated_at)
  on idea_app.project_listings to authenticated;
grant update (slug, title, summary, category, listing_status, published_at, updated_at)
  on idea_app.project_listings to authenticated;
grant delete on idea_app.project_listings to authenticated;

-- Public base-table policies are limited to the exact rows needed by invoker views.
create policy projects_public_listing_read
on idea_app.projects for select to anon, authenticated
using (
  visibility = 'public'
  and status in ('recruiting', 'active', 'completed')
  and exists (
    select 1 from idea_app.project_listings l
    where l.project_id = id and l.listing_status = 'published'
  )
);

create policy project_updates_public_listing_read
on idea_app.project_updates for select to anon, authenticated
using (
  visibility = 'public'
  and publication_status = 'published'
  and exists (
    select 1
    from idea_app.project_listings l
    join idea_app.projects p on p.id = l.project_id
    where l.project_id = project_id
      and l.listing_status = 'published'
      and p.visibility = 'public'
      and p.status in ('recruiting', 'active', 'completed')
  )
);

comment on table idea_app.project_listings is
  'Public-facing listing metadata; public visibility requires published listing and public project status.';
comment on table idea_app.applications is
  'Private project applications visible only to applicant, project owner, and active project managers.';
comment on view idea_app.public_project_directory is
  'Safe public project directory projection; excludes internal IDs, contact data, and private project fields.';
comment on view idea_app.public_project_updates is
  'Published public updates for listed public projects; excludes author IDs and internal project IDs.';
comment on function idea_private.guard_application_transition() is
  'Invoker trigger: applicants may withdraw; project owners/managers may review, accept, or reject applications.';

commit;
