-- IDEA LAB: include career applications in the existing unified Applications Center.
-- Additive read-model extension. Existing RLS policies on job_posts and job_applications
-- remain authoritative because the view runs with SECURITY INVOKER.
begin;

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
left join idea_app.specialist_profiles p on p.id = s.specialist_id

union all

-- Career applications are visible to the applicant and the vacancy owner only;
-- this join does not project email, phone, resume paths, or internal notes.
select
  a.id,
  'job'::text,
  a.job_post_id,
  coalesce(j.title, 'Vakansiya'),
  a.message,
  null::numeric,
  'UZS'::character(3),
  a.status,
  case when a.applicant_id = (select auth.uid()) then 'outgoing' else 'incoming' end,
  a.submitted_at,
  a.updated_at
from idea_app.job_applications a
join idea_app.job_posts j on j.id = a.job_post_id;

grant select on public.application_center to authenticated;

comment on view public.application_center is
  'Unified participant-filtered read model for project, resource, partnership, specialist, and career applications. SECURITY INVOKER preserves underlying RLS.';

commit;
