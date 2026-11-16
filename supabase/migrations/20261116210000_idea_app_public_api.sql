-- IDEA LAB: public PostgREST facade over private application schema
-- Expose only safe read projections and narrow SECURITY INVOKER command wrappers.
begin;

create or replace view public.idea_lab_public_profile_directory
with (security_invoker = true) as
select display_name, username, headline, bio, city, country_code, created_at
from idea_app.public_profile_directory;

create or replace view public.idea_lab_public_organization_directory
with (security_invoker = true) as
select id, name, slug, organization_type, description, location_label, website_url, created_at
from idea_app.public_organization_directory;

create or replace view public.idea_lab_public_project_directory
with (security_invoker = true) as
select slug, title, summary, category, project_type, project_status, start_date, target_date, published_at
from idea_app.public_project_directory;

create or replace view public.idea_lab_public_project_updates
with (security_invoker = true) as
select project_slug, title, body, update_type, published_at
from idea_app.public_project_updates;

create or replace view public.idea_lab_public_specialist_directory
with (security_invoker = true) as
select id, public_name, headline, bio, skill_tags, specialist_categories, city, country_code,
       portfolio_urls, availability_status, engagement_modes, created_at
from idea_app.public_specialist_directory;

create or replace view public.idea_lab_public_resource_catalogue
with (security_invoker = true) as
select slug, title, category, description, quantity_label, availability_label,
       location_label, public_terms, published_at
from idea_app.public_resource_catalogue;

create or replace view public.idea_lab_public_partnership_directory
with (security_invoker = true) as
select slug, opportunity_type, title, summary, details, location_label, published_at
from idea_app.public_partnership_directory;

grant select on public.idea_lab_public_profile_directory,
  public.idea_lab_public_organization_directory,
  public.idea_lab_public_project_directory,
  public.idea_lab_public_project_updates,
  public.idea_lab_public_specialist_directory,
  public.idea_lab_public_resource_catalogue,
  public.idea_lab_public_partnership_directory
to anon, authenticated;

create or replace function public.idea_lab_create_project(
 p_title text, p_summary text default '', p_description text default '',
 p_project_type text default 'other', p_visibility text default 'private',
 p_start_date date default null, p_target_date date default null
) returns uuid language sql security invoker set search_path = ''
as $function$
 select idea_app.create_project(p_title,p_summary,p_description,p_project_type,p_visibility,p_start_date,p_target_date);
$function$;

create or replace function public.idea_lab_update_project(
 p_project_id uuid, p_title text, p_summary text, p_description text,
 p_project_type text, p_status text, p_visibility text,
 p_start_date date default null, p_target_date date default null
) returns uuid language sql security invoker set search_path = ''
as $function$
 select idea_app.update_project(p_project_id,p_title,p_summary,p_description,p_project_type,p_status,p_visibility,p_start_date,p_target_date);
$function$;

create or replace function public.idea_lab_request_project_membership(p_project_id uuid)
returns uuid language sql security invoker set search_path = ''
as $function$
 select idea_app.request_project_membership(p_project_id);
$function$;

create or replace function public.idea_lab_review_project_membership(
 p_membership_id uuid, p_approve boolean, p_membership_role text default null
) returns uuid language sql security invoker set search_path = ''
as $function$
 select idea_app.review_project_membership(p_membership_id,p_approve,p_membership_role);
$function$;

create or replace function public.idea_lab_leave_project(p_membership_id uuid)
returns uuid language sql security invoker set search_path = ''
as $function$
 select idea_app.leave_project(p_membership_id);
$function$;

revoke all on function public.idea_lab_create_project(text,text,text,text,text,date,date) from public, anon, authenticated;
revoke all on function public.idea_lab_update_project(uuid,text,text,text,text,text,text,date,date) from public, anon, authenticated;
revoke all on function public.idea_lab_request_project_membership(uuid) from public, anon, authenticated;
revoke all on function public.idea_lab_review_project_membership(uuid,boolean,text) from public, anon, authenticated;
revoke all on function public.idea_lab_leave_project(uuid) from public, anon, authenticated;

grant execute on function public.idea_lab_create_project(text,text,text,text,text,date,date) to authenticated;
grant execute on function public.idea_lab_update_project(uuid,text,text,text,text,text,text,date,date) to authenticated;
grant execute on function public.idea_lab_request_project_membership(uuid) to authenticated;
grant execute on function public.idea_lab_review_project_membership(uuid,boolean,text) to authenticated;
grant execute on function public.idea_lab_leave_project(uuid) to authenticated;

comment on schema idea_app is 'Private IDEA LAB application schema; access through safe public views and invoker RPC wrappers only.';
comment on view public.idea_lab_public_project_directory is 'Safe public project catalogue; excludes owner and internal project identifiers.';
comment on view public.idea_lab_public_specialist_directory is 'Safe public specialist directory; excludes contact details and Auth user IDs.';

commit;