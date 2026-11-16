-- IDEA LAB: specialist directory, resource exchange, and partnership opportunities
-- Version: 20261116170000
-- Depends on: identity, project/team RLS, guarded project commands, and public listings.
-- Status: repository draft only; NOT applied to any Supabase project.
-- Scope: additive objects in the private idea_app schema. Existing public schema is untouched.
-- Important: opportunities are non-binding collaboration/support enquiries; no payment,
-- investment execution, bank details, or financial transaction processing is introduced.

begin;

-- SPECIALISTS
create table idea_app.specialist_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  public_name text not null,
  headline text not null default '',
  bio text not null default '',
  skill_tags text[] not null default '{}',
  specialist_categories text[] not null default '{}',
  city text,
  country_code text,
  portfolio_urls text[] not null default '{}',
  availability_status text not null default 'open',
  engagement_modes text[] not null default '{remote}',
  visibility text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint specialist_public_name_length check (char_length(trim(public_name)) between 2 and 100),
  constraint specialist_headline_length check (char_length(headline) <= 160),
  constraint specialist_bio_length check (char_length(bio) <= 2400),
  constraint specialist_skill_tags_count check (cardinality(skill_tags) <= 30),
  constraint specialist_categories_count check (cardinality(specialist_categories) <= 12),
  constraint specialist_portfolio_count check (cardinality(portfolio_urls) <= 8),
  constraint specialist_portfolio_no_nulls check (array_position(portfolio_urls, null) is null),
  constraint specialist_availability_check check (availability_status in ('open', 'limited', 'unavailable')),
  constraint specialist_visibility_check check (visibility in ('private', 'unlisted', 'public')),
  constraint specialist_country_code_check check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  constraint specialist_engagement_modes_check check (
    cardinality(engagement_modes) between 1 and 4
    and engagement_modes <@ array['remote','onsite','hybrid','volunteer']::text[]
  )
);
create index specialist_directory_idx
  on idea_app.specialist_profiles (availability_status, created_at desc)
  where visibility = 'public';

create table idea_app.specialist_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references idea_app.projects(id) on delete cascade,
  specialist_id uuid not null references idea_app.specialist_profiles(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete restrict,
  request_note text not null default '',
  status text not null default 'submitted',
  response_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint specialist_requests_unique unique (project_id, specialist_id),
  constraint specialist_request_note_length check (char_length(request_note) <= 2000),
  constraint specialist_response_note_length check (char_length(response_note) <= 1500),
  constraint specialist_request_status_check check (status in ('submitted','accepted','declined','cancelled'))
);
create index specialist_requests_specialist_idx
  on idea_app.specialist_requests (specialist_id, status, created_at desc);
create index specialist_requests_project_idx
  on idea_app.specialist_requests (project_id, status, created_at desc);

-- RESOURCE EXCHANGE
create table idea_app.resource_offers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  project_id uuid references idea_app.projects(id) on delete set null,
  slug text not null unique,
  title text not null,
  category text not null,
  description text not null default '',
  quantity_label text not null default '',
  availability_label text not null default '',
  location_label text,
  public_terms text not null default '',
  status text not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resource_offer_slug_check check (slug = lower(slug) and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 100),
  constraint resource_offer_title_check check (char_length(trim(title)) between 3 and 160),
  constraint resource_offer_category_check check (category in ('equipment','space','materials','software','expertise','service','other')),
  constraint resource_offer_description_check check (char_length(description) <= 3000),
  constraint resource_offer_quantity_check check (char_length(quantity_label) <= 120),
  constraint resource_offer_availability_check check (char_length(availability_label) <= 160),
  constraint resource_offer_terms_check check (char_length(public_terms) <= 1600),
  constraint resource_offer_status_check check (status in ('draft','published','paused','closed')),
  constraint resource_offer_published_at_check check (status <> 'published' or published_at is not null)
);
create index resource_offers_public_idx
  on idea_app.resource_offers (category, published_at desc)
  where status = 'published';

create table idea_app.resource_requests (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references idea_app.resource_offers(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references idea_app.projects(id) on delete set null,
  request_note text not null default '',
  requested_quantity text not null default '',
  status text not null default 'submitted',
  owner_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint resource_request_unique unique (offer_id, requester_id),
  constraint resource_request_note_check check (char_length(request_note) <= 2000),
  constraint resource_request_quantity_check check (char_length(requested_quantity) <= 120),
  constraint resource_request_owner_note_check check (char_length(owner_note) <= 1500),
  constraint resource_request_status_check check (status in ('submitted','accepted','rejected','cancelled'))
);
create index resource_requests_requester_idx
  on idea_app.resource_requests (requester_id, status, created_at desc);
create index resource_requests_offer_idx
  on idea_app.resource_requests (offer_id, status, created_at desc);

-- PARTNERSHIP / SUPPORT OPPORTUNITIES
-- These are discovery and non-binding enquiry records, not investment contracts or payments.
create table idea_app.partnership_opportunities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  project_id uuid references idea_app.projects(id) on delete set null,
  slug text not null unique,
  opportunity_type text not null,
  title text not null,
  summary text not null,
  details text not null default '',
  location_label text,
  status text not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partnership_slug_check check (slug = lower(slug) and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 100),
  constraint partnership_type_check check (opportunity_type in ('mentorship','collaboration','sponsorship','grant_support','community_partner','other')),
  constraint partnership_title_check check (char_length(trim(title)) between 3 and 160),
  constraint partnership_summary_check check (char_length(trim(summary)) between 1 and 600),
  constraint partnership_details_check check (char_length(details) <= 4000),
  constraint partnership_status_check check (status in ('draft','published','paused','closed')),
  constraint partnership_published_at_check check (status <> 'published' or published_at is not null)
);
create index partnership_opportunities_public_idx
  on idea_app.partnership_opportunities (opportunity_type, published_at desc)
  where status = 'published';

create table idea_app.partnership_enquiries (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references idea_app.partnership_opportunities(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references idea_app.projects(id) on delete set null,
  message text not null,
  status text not null default 'submitted',
  owner_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint partnership_enquiry_unique unique (opportunity_id, requester_id),
  constraint partnership_message_check check (char_length(trim(message)) between 1 and 2500),
  constraint partnership_owner_note_check check (char_length(owner_note) <= 1500),
  constraint partnership_enquiry_status_check check (status in ('submitted','in_review','accepted','declined','withdrawn'))
);
create index partnership_enquiries_requester_idx
  on idea_app.partnership_enquiries (requester_id, status, created_at desc);
create index partnership_enquiries_opportunity_idx
  on idea_app.partnership_enquiries (opportunity_id, status, created_at desc);

-- RLS is enabled on every new table before any possible future API exposure.
alter table idea_app.specialist_profiles enable row level security;
alter table idea_app.specialist_requests enable row level security;
alter table idea_app.resource_offers enable row level security;
alter table idea_app.resource_requests enable row level security;
alter table idea_app.partnership_opportunities enable row level security;
alter table idea_app.partnership_enquiries enable row level security;

-- Private ownership predicates let RLS and invoker triggers verify ownership
-- without granting clients SELECT access to internal Auth/owner identifier columns.
create or replace function idea_private.is_specialist_profile_owner(p_profile_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $function$
  select exists (
    select 1 from idea_app.specialist_profiles sp
    where sp.id = p_profile_id and sp.user_id = (select auth.uid())
  );
$function$;

create or replace function idea_private.is_resource_offer_owner(p_offer_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $function$
  select exists (
    select 1 from idea_app.resource_offers ro
    where ro.id = p_offer_id and ro.owner_id = (select auth.uid())
  );
$function$;

create or replace function idea_private.is_partnership_opportunity_owner(p_opportunity_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $function$
  select exists (
    select 1 from idea_app.partnership_opportunities po
    where po.id = p_opportunity_id and po.owner_id = (select auth.uid())
  );
$function$;

revoke all on function idea_private.is_specialist_profile_owner(uuid) from public, anon, authenticated;
revoke all on function idea_private.is_resource_offer_owner(uuid) from public, anon, authenticated;
revoke all on function idea_private.is_partnership_opportunity_owner(uuid) from public, anon, authenticated;
grant execute on function idea_private.is_specialist_profile_owner(uuid) to authenticated;
grant execute on function idea_private.is_resource_offer_owner(uuid) to authenticated;
grant execute on function idea_private.is_partnership_opportunity_owner(uuid) to authenticated;

-- Specialist profile: public listing fields only; the specialist owns their own record.
create policy specialist_profiles_public_read
on idea_app.specialist_profiles for select to anon, authenticated
using (visibility = 'public');
create policy specialist_profiles_owner_read
on idea_app.specialist_profiles for select to authenticated
using (user_id = (select auth.uid()));
create policy specialist_profiles_owner_insert
on idea_app.specialist_profiles for insert to authenticated
with check (user_id = (select auth.uid()));
create policy specialist_profiles_owner_update
on idea_app.specialist_profiles for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- A project owner/manager may invite a public specialist. Only the specialist
-- and the project's owner/active manager can read the private request.
create policy specialist_requests_select_participants
on idea_app.specialist_requests for select to authenticated
using (
  (select idea_private.is_specialist_profile_owner(specialist_id))
  or (select idea_private.is_project_owner(project_id))
  or (select idea_private.has_active_project_role(project_id, array['manager']::text[]))
);
create policy specialist_requests_insert_project_owner
on idea_app.specialist_requests for insert to authenticated
with check (
  requested_by = (select auth.uid())
  and (
    (select idea_private.is_project_owner(project_id))
    or (select idea_private.has_active_project_role(project_id, array['manager']::text[]))
  )
  and exists (
    select 1 from idea_app.specialist_profiles sp
    where sp.id = specialist_id and sp.visibility = 'public'
  )
);
create policy specialist_requests_update_participants
on idea_app.specialist_requests for update to authenticated
using (
  (select idea_private.is_specialist_profile_owner(specialist_id))
  or (select idea_private.is_project_owner(project_id))
  or (select idea_private.has_active_project_role(project_id, array['manager']::text[]))
)
with check (
  (select idea_private.is_specialist_profile_owner(specialist_id))
  or (select idea_private.is_project_owner(project_id))
  or (select idea_private.has_active_project_role(project_id, array['manager']::text[]))
);

-- Resource offers: public catalogue is published-only; owners retain private management access.
create policy resource_offers_public_read
on idea_app.resource_offers for select to anon, authenticated
using (status = 'published');
create policy resource_offers_owner_read
on idea_app.resource_offers for select to authenticated
using (owner_id = (select auth.uid()));
create policy resource_offers_owner_insert
on idea_app.resource_offers for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and (project_id is null or (select idea_private.is_project_owner(project_id)))
);
create policy resource_offers_owner_update
on idea_app.resource_offers for update to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and (project_id is null or (select idea_private.is_project_owner(project_id)))
);
create policy resource_offers_owner_delete
on idea_app.resource_offers for delete to authenticated
using (owner_id = (select auth.uid()));

-- Request visibility is limited to requester and the owner of the referenced offer.
create policy resource_requests_select_participants
on idea_app.resource_requests for select to authenticated
using (
  requester_id = (select auth.uid())
  or (select idea_private.is_resource_offer_owner(offer_id))
);
create policy resource_requests_insert_requester
on idea_app.resource_requests for insert to authenticated
with check (
  requester_id = (select auth.uid())
  and status = 'submitted'
  and owner_note = ''
  and reviewed_at is null
  and (project_id is null or (select idea_private.is_project_owner(project_id))
       or (select idea_private.has_active_project_role(project_id, array['manager','contributor']::text[])))
  and exists (
    select 1 from idea_app.resource_offers ro
    where ro.id = offer_id and ro.status = 'published'
  )
);
create policy resource_requests_update_participants
on idea_app.resource_requests for update to authenticated
using (
  requester_id = (select auth.uid())
  or (select idea_private.is_resource_offer_owner(offer_id))
)
with check (
  requester_id = (select auth.uid())
  or (select idea_private.is_resource_offer_owner(offer_id))
);

-- Partnership opportunities are public only while published.
create policy partnership_opportunities_public_read
on idea_app.partnership_opportunities for select to anon, authenticated
using (status = 'published');
create policy partnership_opportunities_owner_read
on idea_app.partnership_opportunities for select to authenticated
using (owner_id = (select auth.uid()));
create policy partnership_opportunities_owner_insert
on idea_app.partnership_opportunities for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and (project_id is null or (select idea_private.is_project_owner(project_id)))
);
create policy partnership_opportunities_owner_update
on idea_app.partnership_opportunities for update to authenticated
using (owner_id = (select auth.uid()))
with check (
  owner_id = (select auth.uid())
  and (project_id is null or (select idea_private.is_project_owner(project_id)))
);
create policy partnership_opportunities_owner_delete
on idea_app.partnership_opportunities for delete to authenticated
using (owner_id = (select auth.uid()));

create policy partnership_enquiries_select_participants
on idea_app.partnership_enquiries for select to authenticated
using (
  requester_id = (select auth.uid())
  or (select idea_private.is_partnership_opportunity_owner(opportunity_id))
);
create policy partnership_enquiries_insert_requester
on idea_app.partnership_enquiries for insert to authenticated
with check (
  requester_id = (select auth.uid())
  and status = 'submitted'
  and owner_note = ''
  and reviewed_at is null
  and (project_id is null or (select idea_private.is_project_owner(project_id))
       or (select idea_private.has_active_project_role(project_id, array['manager','contributor']::text[])))
  and exists (
    select 1 from idea_app.partnership_opportunities po
    where po.id = opportunity_id and po.status = 'published'
  )
);
create policy partnership_enquiries_update_participants
on idea_app.partnership_enquiries for update to authenticated
using (
  requester_id = (select auth.uid())
  or (select idea_private.is_partnership_opportunity_owner(opportunity_id))
)
with check (
  requester_id = (select auth.uid())
  or (select idea_private.is_partnership_opportunity_owner(opportunity_id))
);

-- Server-owned updated_at timestamps for owner-editable catalogue/profile rows.
create or replace function idea_private.touch_module_updated_at()
returns trigger language plpgsql security invoker set search_path = ''
as $function$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$function$;
revoke all on function idea_private.touch_module_updated_at() from public, anon, authenticated;
create trigger specialist_profiles_touch_updated_at before update on idea_app.specialist_profiles
for each row execute function idea_private.touch_module_updated_at();
create trigger resource_offers_touch_updated_at before update on idea_app.resource_offers
for each row execute function idea_private.touch_module_updated_at();
create trigger partnership_opportunities_touch_updated_at before update on idea_app.partnership_opportunities
for each row execute function idea_private.touch_module_updated_at();

-- SECURITY INVOKER guards enforce immutable identity and allowed state transitions.
create or replace function idea_private.guard_specialist_request_transition()
returns trigger language plpgsql security invoker set search_path = ''
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_is_specialist boolean;
  v_reviewer boolean;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if new.id is distinct from old.id or new.project_id is distinct from old.project_id
     or new.specialist_id is distinct from old.specialist_id or new.requested_by is distinct from old.requested_by
     or new.request_note is distinct from old.request_note or new.created_at is distinct from old.created_at then
    raise exception 'Specialist request identity and request note are immutable' using errcode = '42501';
  end if;
  v_is_specialist := (select idea_private.is_specialist_profile_owner(old.specialist_id));
  v_reviewer := (select idea_private.is_project_owner(old.project_id))
    or (select idea_private.has_active_project_role(old.project_id, array['manager']::text[]));
  if v_is_specialist and not v_reviewer
     and old.status = 'submitted' and new.status in ('accepted','declined') then
    new.responded_at := pg_catalog.now();
  elsif v_reviewer and old.status = 'submitted' and new.status = 'cancelled'
        and new.response_note = old.response_note then
    new.responded_at := pg_catalog.now();
  else
    raise exception 'Specialist request transition is not permitted' using errcode = '42501';
  end if;
  new.updated_at := pg_catalog.now();
  return new;
end;
$function$;
revoke all on function idea_private.guard_specialist_request_transition() from public, anon, authenticated;
create trigger specialist_requests_guard_transition before update on idea_app.specialist_requests
for each row execute function idea_private.guard_specialist_request_transition();

create or replace function idea_private.guard_resource_request_transition()
returns trigger language plpgsql security invoker set search_path = ''
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_is_owner boolean;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if new.id is distinct from old.id or new.offer_id is distinct from old.offer_id
     or new.requester_id is distinct from old.requester_id or new.project_id is distinct from old.project_id
     or new.request_note is distinct from old.request_note or new.requested_quantity is distinct from old.requested_quantity
     or new.created_at is distinct from old.created_at then
    raise exception 'Resource request identity and requester content are immutable' using errcode = '42501';
  end if;
  v_is_owner := (select idea_private.is_resource_offer_owner(old.offer_id));
  if v_actor = old.requester_id and old.status = 'submitted'
     and new.status = 'cancelled' and new.owner_note = old.owner_note
     and new.reviewed_at is not distinct from old.reviewed_at then
    null;
  elsif v_is_owner and old.status = 'submitted'
        and new.status in ('accepted','rejected') then
    new.reviewed_at := pg_catalog.now();
  else
    raise exception 'Resource request transition is not permitted' using errcode = '42501';
  end if;
  new.updated_at := pg_catalog.now();
  return new;
end;
$function$;
revoke all on function idea_private.guard_resource_request_transition() from public, anon, authenticated;
create trigger resource_requests_guard_transition before update on idea_app.resource_requests
for each row execute function idea_private.guard_resource_request_transition();

create or replace function idea_private.guard_partnership_enquiry_transition()
returns trigger language plpgsql security invoker set search_path = ''
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_is_owner boolean;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if new.id is distinct from old.id or new.opportunity_id is distinct from old.opportunity_id
     or new.requester_id is distinct from old.requester_id or new.project_id is distinct from old.project_id
     or new.message is distinct from old.message or new.created_at is distinct from old.created_at then
    raise exception 'Partnership enquiry identity and message are immutable' using errcode = '42501';
  end if;
  v_is_owner := (select idea_private.is_partnership_opportunity_owner(old.opportunity_id));
  if v_actor = old.requester_id and old.status in ('submitted','in_review')
     and new.status = 'withdrawn' and new.owner_note = old.owner_note
     and new.reviewed_at is not distinct from old.reviewed_at then
    null;
  elsif v_is_owner and old.status in ('submitted','in_review')
        and new.status in ('in_review','accepted','declined')
        and (new.status <> 'in_review' or old.status = 'submitted') then
    new.reviewed_at := pg_catalog.now();
  else
    raise exception 'Partnership enquiry transition is not permitted' using errcode = '42501';
  end if;
  new.updated_at := pg_catalog.now();
  return new;
end;
$function$;
revoke all on function idea_private.guard_partnership_enquiry_transition() from public, anon, authenticated;
create trigger partnership_enquiries_guard_transition before update on idea_app.partnership_enquiries
for each row execute function idea_private.guard_partnership_enquiry_transition();

-- Safe, invoker-based catalogues. No user IDs, emails, phone numbers, or private notes.
create view idea_app.public_specialist_directory with (security_invoker = true) as
select id, public_name, headline, bio, skill_tags, specialist_categories, city, country_code,
       portfolio_urls, availability_status, engagement_modes, created_at
from idea_app.specialist_profiles
where visibility = 'public';

create view idea_app.public_resource_catalogue with (security_invoker = true) as
select slug, title, category, description, quantity_label, availability_label,
       location_label, public_terms, published_at
from idea_app.resource_offers
where status = 'published';

create view idea_app.public_partnership_directory with (security_invoker = true) as
select slug, opportunity_type, title, summary, details, location_label, published_at
from idea_app.partnership_opportunities
where status = 'published';

-- Grants are narrow prerequisites for future API design.
-- idea_app must remain unexposed through the Data API: invoker views require underlying grants and the base tables contain
-- internal owner/user/project identifiers. No Data API schema exposure is added.
grant usage on schema idea_app to anon, authenticated;
grant usage on schema idea_private to authenticated;

-- Public visitors receive profile content but never the Auth user identifier.
-- The generated profile ID is a public opaque identifier. The Auth user ID is never selectable.
grant select (id, public_name, headline, bio, skill_tags, specialist_categories,
              city, country_code, portfolio_urls, availability_status, engagement_modes,
              visibility, created_at)
  on idea_app.specialist_profiles to anon, authenticated;
grant insert (user_id, public_name, headline, bio, skill_tags, specialist_categories,
              city, country_code, portfolio_urls, availability_status, engagement_modes, visibility)
  on idea_app.specialist_profiles to authenticated;
grant update (public_name, headline, bio, skill_tags, specialist_categories,
              city, country_code, portfolio_urls, availability_status, engagement_modes, visibility)
  on idea_app.specialist_profiles to authenticated;
grant select on idea_app.public_specialist_directory to anon, authenticated;

-- Owner IDs are internal authorization data, not public catalogue fields.
grant select (id, slug, title, category, description, quantity_label,
              availability_label, location_label, public_terms, status, published_at, created_at)
  on idea_app.resource_offers to anon, authenticated;
grant insert (owner_id, project_id, slug, title, category, description, quantity_label,
              availability_label, location_label, public_terms, status, published_at)
  on idea_app.resource_offers to authenticated;
grant update (project_id, slug, title, category, description, quantity_label,
              availability_label, location_label, public_terms, status, published_at)
  on idea_app.resource_offers to authenticated;
grant delete on idea_app.resource_offers to authenticated;
grant select on idea_app.public_resource_catalogue to anon, authenticated;

-- Owner IDs are internal authorization data, not public directory fields.
grant select (id, slug, opportunity_type, title, summary, details,
              location_label, status, published_at, created_at)
  on idea_app.partnership_opportunities to anon, authenticated;
grant insert (owner_id, project_id, slug, opportunity_type, title, summary, details,
              location_label, status, published_at)
  on idea_app.partnership_opportunities to authenticated;
grant update (project_id, slug, opportunity_type, title, summary, details,
              location_label, status, published_at)
  on idea_app.partnership_opportunities to authenticated;
grant delete on idea_app.partnership_opportunities to authenticated;
grant select on idea_app.public_partnership_directory to anon, authenticated;

grant select on idea_app.specialist_requests, idea_app.resource_requests,
  idea_app.partnership_enquiries to authenticated;
grant insert (project_id, specialist_id, requested_by, request_note)
  on idea_app.specialist_requests to authenticated;
grant update (status, response_note, responded_at, updated_at)
  on idea_app.specialist_requests to authenticated;
grant insert (offer_id, requester_id, project_id, request_note, requested_quantity)
  on idea_app.resource_requests to authenticated;
grant update (status, owner_note, reviewed_at, updated_at)
  on idea_app.resource_requests to authenticated;
grant insert (opportunity_id, requester_id, project_id, message)
  on idea_app.partnership_enquiries to authenticated;
grant update (status, owner_note, reviewed_at, updated_at)
  on idea_app.partnership_enquiries to authenticated;

comment on table idea_app.specialist_profiles is
  'Opt-in public specialist profile; contact details remain in separate private profile_contacts table.';
comment on table idea_app.resource_offers is
  'Published resource offers; public terms are informational and requests are private.';
comment on table idea_app.partnership_opportunities is
  'Non-binding collaboration, mentorship, sponsorship, or grant-support discovery; no funds or investment execution.';
comment on table idea_app.partnership_enquiries is
  'Private enquiries visible only to the requester and opportunity owner.';
comment on view idea_app.public_specialist_directory is
  'Safe specialist catalogue without user IDs or direct contact details.';
comment on view idea_app.public_resource_catalogue is
  'Safe published resource catalogue without owner IDs or internal project IDs.';
comment on view idea_app.public_partnership_directory is
  'Safe published partnership catalogue without owner IDs or private enquiry data.';

commit;
