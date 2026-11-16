-- IDEA LAB: server-persisted project applications and unified application centre
-- Version: 20261116200000
-- Depends on: idea_app identity, projects, project listings, modules, and project commands migrations.
-- Status: applied to Supabase production project idea-lab on 2026-11-16.nly after the complete prerequisite chain is reviewed in staging.
-- No service-role key or privileged definer endpoint is introduced.

begin;

alter table idea_app.applications
  add column offer_amount numeric(18,2),
  add column currency_code character(3) not null default 'UZS',
  add constraint applications_offer_amount_check
    check (offer_amount is null or offer_amount > 0),
  add constraint applications_currency_code_check
    check (currency_code ~ '^[A-Z]{3}$');

-- Only signed-in users can submit. Applicant identity is always auth.uid().
create or replace function idea_app.submit_project_application(
  p_project_id uuid,
  p_applicant_note text,
  p_offer_amount numeric,
  p_currency_code text default 'UZS'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_application_id uuid;
  v_note text := coalesce(p_applicant_note, '');
  v_currency text := upper(coalesce(p_currency_code, 'UZS'));
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_project_id is null then
    raise exception 'Project identifier is required' using errcode = '22023';
  end if;
  if pg_catalog.char_length(v_note) not between 1 and 3000 then
    raise exception 'Application message length is invalid' using errcode = '22023';
  end if;
  if p_offer_amount is null or p_offer_amount <= 0 then
    raise exception 'Offer amount must be positive' using errcode = '22023';
  end if;
  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'Currency code is invalid' using errcode = '22023';
  end if;

  insert into idea_app.applications (
    project_id, applicant_id, applicant_note, status, reviewer_note,
    offer_amount, currency_code
  ) values (
    p_project_id, v_actor, v_note, 'submitted', '', p_offer_amount, v_currency
  )
  returning id into v_application_id;

  return v_application_id;
end;
$function$;

create or replace function idea_app.update_project_application(
  p_application_id uuid,
  p_status text,
  p_reviewer_note text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_application_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_application_id is null then
    raise exception 'Application identifier is required' using errcode = '22023';
  end if;
  if p_status not in ('in_review', 'accepted', 'rejected', 'withdrawn') then
    raise exception 'Application status is invalid' using errcode = '22023';
  end if;
  if p_reviewer_note is not null and pg_catalog.char_length(p_reviewer_note) > 2000 then
    raise exception 'Reviewer note is too long' using errcode = '22023';
  end if;

  update idea_app.applications
  set status = p_status,
      reviewer_note = coalesce(p_reviewer_note, reviewer_note),
      updated_at = pg_catalog.now()
  where id = p_application_id
  returning id into v_application_id;

  if v_application_id is null then
    raise exception 'Application not found or not accessible' using errcode = '42501';
  end if;
  return v_application_id;
end;
$function$;

-- One participant-filtered read model for the existing Applications Centre.
-- The underlying tables' RLS policies remain authoritative because this is an
-- invoker view. The direction is calculated server-side for the current session.
create or replace view public.application_center
with (security_invoker = true)
as
select
  a.id,
  'project'::text as source_type,
  a.project_id as listing_id,
  coalesce(l.title, p.title, 'Loyiha') as listing_title,
  a.applicant_note as message,
  a.offer_amount,
  a.currency_code,
  a.status,
  case when a.applicant_id = (select auth.uid()) then 'outgoing' else 'incoming' end as direction,
  a.submitted_at as created_at,
  a.updated_at
from idea_app.applications a
left join idea_app.projects p on p.id = a.project_id
left join idea_app.project_listings l on l.project_id = a.project_id

union all

select
  r.id,
  'resource'::text,
  r.offer_id,
  coalesce(o.title, 'Resurs'),
  r.request_note,
  null::numeric,
  'UZS'::character(3),
  r.status,
  case when r.requester_id = (select auth.uid()) then 'outgoing' else 'incoming' end,
  r.created_at,
  r.updated_at
from idea_app.resource_requests r
left join idea_app.resource_offers o on o.id = r.offer_id

union all

select
  e.id,
  'partnership'::text,
  e.opportunity_id,
  coalesce(o.title, 'Hamkorlik taklifi'),
  e.message,
  null::numeric,
  'UZS'::character(3),
  e.status,
  case when e.requester_id = (select auth.uid()) then 'outgoing' else 'incoming' end,
  e.created_at,
  e.updated_at
from idea_app.partnership_enquiries e
left join idea_app.partnership_opportunities o on o.id = e.opportunity_id

union all

select
  s.id,
  'specialist'::text,
  s.specialist_id,
  coalesce(p.public_name, 'Mutaxassis'),
  s.request_note,
  null::numeric,
  'UZS'::character(3),
  s.status,
  case when s.requested_by = (select auth.uid()) then 'outgoing' else 'incoming' end,
  s.created_at,
  s.updated_at
from idea_app.specialist_requests s
left join idea_app.specialist_profiles p on p.id = s.specialist_id;

-- Public API wrappers keep the private idea_app schema unexposed through PostgREST.
-- Both wrappers remain SECURITY INVOKER and the underlying functions enforce RLS.
create or replace function public.submit_project_application(
  p_project_id uuid,
  p_applicant_note text,
  p_offer_amount numeric,
  p_currency_code text default 'UZS'
)
returns uuid
language sql
security invoker
set search_path = ''
as $function$
  select idea_app.submit_project_application(
    p_project_id, p_applicant_note, p_offer_amount, p_currency_code
  );
$function$;

create or replace function public.update_project_application(
  p_application_id uuid,
  p_status text,
  p_reviewer_note text default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $function$
  select idea_app.update_project_application(
    p_application_id, p_status, p_reviewer_note
  );
$function$;

revoke all on function public.submit_project_application(uuid, text, numeric, text)
  from public, anon, authenticated;
revoke all on function public.update_project_application(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_project_application(uuid, text, numeric, text)
  to authenticated;
grant execute on function public.update_project_application(uuid, text, text)
  to authenticated;

-- Narrow access: no direct table writes from the browser; only reviewed invoker RPCs.
grant usage on schema idea_app to authenticated;
grant select on public.application_center to authenticated;
grant select on idea_app.applications, idea_app.resource_requests,
  idea_app.partnership_enquiries, idea_app.specialist_requests to authenticated;
grant select (id, title) on idea_app.projects to authenticated;
grant select (project_id, title) on idea_app.project_listings to authenticated;
grant select (id, title) on idea_app.resource_offers to authenticated;
grant select (id, title) on idea_app.partnership_opportunities to authenticated;
grant select (id, public_name) on idea_app.specialist_profiles to authenticated;

revoke all on function idea_app.submit_project_application(uuid, text, numeric, text)
  from public, anon, authenticated;
revoke all on function idea_app.update_project_application(uuid, text, text)
  from public, anon, authenticated;
grant execute on function idea_app.submit_project_application(uuid, text, numeric, text)
  to authenticated;
grant execute on function idea_app.update_project_application(uuid, text, text)
  to authenticated;

comment on view public.application_center is
  'Unified participant-filtered read model in public schema; underlying idea_app tables remain RLS-protected and unexposed.';
comment on function idea_app.submit_project_application(uuid, text, numeric, text) is
  'Creates a project application for auth.uid(); target owner and access are enforced by RLS.';
comment on function idea_app.update_project_application(uuid, text, text) is
  'Updates only a permitted application transition; the existing invoker trigger enforces participant role.';

commit;
