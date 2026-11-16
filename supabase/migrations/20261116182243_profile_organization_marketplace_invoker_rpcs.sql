-- Public PostgREST invoker RPCs for profile, organization and marketplace writes.
-- All functions run with caller privileges. Underlying RLS and column grants apply.
-- No SECURITY DEFINER functions are introduced.

create or replace function public.idea_lab_upsert_profile(
  p_display_name text, p_username text, p_headline text, p_bio text,
  p_city text, p_country_code text, p_visibility text
) returns uuid language plpgsql security invoker set search_path = ''
as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  insert into idea_app.profiles (user_id,display_name,username,headline,bio,city,country_code,visibility)
  values (v_user_id,btrim(p_display_name),nullif(lower(btrim(coalesce(p_username,''))),''),coalesce(p_headline,''),
    coalesce(p_bio,''),nullif(btrim(coalesce(p_city,'')),''),nullif(upper(btrim(coalesce(p_country_code,''))),''),coalesce(p_visibility,'private'))
  on conflict (user_id) do update set display_name=excluded.display_name,username=excluded.username,
    headline=excluded.headline,bio=excluded.bio,city=excluded.city,country_code=excluded.country_code,
    visibility=excluded.visibility,updated_at=now();
  return v_user_id;
end; $$;

create or replace function public.idea_lab_upsert_specialist_profile(
  p_public_name text,p_headline text,p_bio text,p_skill_tags text[],p_specialist_categories text[],
  p_city text,p_country_code text,p_portfolio_urls text[],p_availability_status text,
  p_engagement_modes text[],p_visibility text
) returns uuid language plpgsql security invoker set search_path = ''
as $$
declare v_user_id uuid := auth.uid(); v_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  insert into idea_app.specialist_profiles
    (user_id,public_name,headline,bio,skill_tags,specialist_categories,city,country_code,portfolio_urls,availability_status,engagement_modes,visibility)
  values
    (v_user_id,btrim(p_public_name),coalesce(p_headline,''),coalesce(p_bio,''),coalesce(p_skill_tags,array[]::text[]),
     coalesce(p_specialist_categories,array[]::text[]),nullif(btrim(coalesce(p_city,'')),''),nullif(upper(btrim(coalesce(p_country_code,''))),''),
     coalesce(p_portfolio_urls,array[]::text[]),coalesce(p_availability_status,'open'),coalesce(p_engagement_modes,array['remote']::text[]),coalesce(p_visibility,'private'))
  on conflict (user_id) do update set public_name=excluded.public_name,headline=excluded.headline,bio=excluded.bio,
    skill_tags=excluded.skill_tags,specialist_categories=excluded.specialist_categories,city=excluded.city,
    country_code=excluded.country_code,portfolio_urls=excluded.portfolio_urls,
    availability_status=excluded.availability_status,engagement_modes=excluded.engagement_modes,
    visibility=excluded.visibility,updated_at=now()
  returning id into v_id;
  return v_id;
end; $$;

create or replace function public.idea_lab_create_organization(
  p_name text,p_slug text,p_organization_type text,p_description text,p_location_label text,p_website_url text,p_visibility text
) returns uuid language plpgsql security invoker set search_path = ''
as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  insert into idea_app.organizations(owner_id,name,slug,organization_type,description,location_label,website_url,visibility,status)
  values(auth.uid(),btrim(p_name),nullif(lower(btrim(coalesce(p_slug,''))),''),coalesce(p_organization_type,'other'),
    coalesce(p_description,''),nullif(btrim(coalesce(p_location_label,'')),''),nullif(btrim(coalesce(p_website_url,'')),''),
    coalesce(p_visibility,'private'),'draft') returning id into v_id;
  return v_id;
end; $$;

create or replace function public.idea_lab_update_organization(
  p_organization_id uuid,p_name text,p_slug text,p_organization_type text,p_description text,
  p_location_label text,p_website_url text,p_visibility text,p_status text
) returns boolean language plpgsql security invoker set search_path = ''
as $$
declare v_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  update idea_app.organizations set name=btrim(p_name),slug=nullif(lower(btrim(coalesce(p_slug,''))), ''),
    organization_type=p_organization_type,description=coalesce(p_description,''),
    location_label=nullif(btrim(coalesce(p_location_label,'')),''),website_url=nullif(btrim(coalesce(p_website_url,'')),''),
    visibility=p_visibility,status=p_status,updated_at=now()
  where id=p_organization_id and owner_id=auth.uid();
  get diagnostics v_count = row_count; return v_count=1;
end; $$;

create or replace function public.idea_lab_invite_organization_member(p_organization_id uuid,p_user_id uuid,p_membership_role text)
returns uuid language plpgsql security invoker set search_path = ''
as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_user_id=auth.uid() then raise exception 'Cannot invite self' using errcode = '22023'; end if;
  insert into idea_app.organization_members(organization_id,user_id,membership_role,membership_status,invited_by,invited_at)
  values(p_organization_id,p_user_id,p_membership_role,'invited',auth.uid(),now()) returning id into v_id;
  return v_id;
end; $$;

create or replace function public.idea_lab_accept_organization_invite(p_membership_id uuid)
returns boolean language plpgsql security invoker set search_path = ''
as $$
declare v_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  update idea_app.organization_members set membership_status='active',joined_at=now(),updated_at=now()
  where id=p_membership_id and user_id=auth.uid() and membership_status='invited';
  get diagnostics v_count = row_count; return v_count=1;
end; $$;

create or replace function public.idea_lab_create_resource_offer(
  p_project_id uuid,p_slug text,p_title text,p_category text,p_description text,p_quantity_label text,
  p_availability_label text,p_location_label text,p_public_terms text,p_status text
) returns uuid language plpgsql security invoker set search_path = ''
as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  insert into idea_app.resource_offers(owner_id,project_id,slug,title,category,description,quantity_label,availability_label,location_label,public_terms,status,published_at)
  values(auth.uid(),p_project_id,lower(btrim(p_slug)),btrim(p_title),p_category,coalesce(p_description,''),coalesce(p_quantity_label,''),
    coalesce(p_availability_label,''),nullif(btrim(coalesce(p_location_label,'')),''),coalesce(p_public_terms,''),
    coalesce(p_status,'draft'),case when p_status='published' then now() else null end) returning id into v_id;
  return v_id;
end; $$;

create or replace function public.idea_lab_update_resource_offer(
  p_offer_id uuid,p_project_id uuid,p_slug text,p_title text,p_category text,p_description text,
  p_quantity_label text,p_availability_label text,p_location_label text,p_public_terms text,p_status text
) returns boolean language plpgsql security invoker set search_path = ''
as $$
declare v_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  update idea_app.resource_offers set project_id=p_project_id,slug=lower(btrim(p_slug)),title=btrim(p_title),category=p_category,
    description=coalesce(p_description,''),quantity_label=coalesce(p_quantity_label,''),availability_label=coalesce(p_availability_label,''),
    location_label=nullif(btrim(coalesce(p_location_label,'')),''),public_terms=coalesce(p_public_terms,''),status=p_status,
    published_at=case when p_status='published' then coalesce(published_at,now()) else null end,updated_at=now()
  where id=p_offer_id and owner_id=auth.uid();
  get diagnostics v_count = row_count; return v_count=1;
end; $$;

create or replace function public.idea_lab_create_partnership_opportunity(
  p_project_id uuid,p_slug text,p_opportunity_type text,p_title text,p_summary text,p_details text,p_location_label text,p_status text
) returns uuid language plpgsql security invoker set search_path = ''
as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  insert into idea_app.partnership_opportunities(owner_id,project_id,slug,opportunity_type,title,summary,details,location_label,status,published_at)
  values(auth.uid(),p_project_id,lower(btrim(p_slug)),p_opportunity_type,btrim(p_title),btrim(p_summary),coalesce(p_details,''),
    nullif(btrim(coalesce(p_location_label,'')),''),coalesce(p_status,'draft'),case when p_status='published' then now() else null end)
  returning id into v_id; return v_id;
end; $$;

create or replace function public.idea_lab_update_partnership_opportunity(
  p_opportunity_id uuid,p_project_id uuid,p_slug text,p_opportunity_type text,p_title text,p_summary text,
  p_details text,p_location_label text,p_status text
) returns boolean language plpgsql security invoker set search_path = ''
as $$
declare v_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  update idea_app.partnership_opportunities set project_id=p_project_id,slug=lower(btrim(p_slug)),opportunity_type=p_opportunity_type,
    title=btrim(p_title),summary=btrim(p_summary),details=coalesce(p_details,''),location_label=nullif(btrim(coalesce(p_location_label,'')),''),
    status=p_status,published_at=case when p_status='published' then coalesce(published_at,now()) else null end,updated_at=now()
  where id=p_opportunity_id and owner_id=auth.uid();
  get diagnostics v_count = row_count; return v_count=1;
end; $$;

create or replace function public.idea_lab_submit_resource_request(p_offer_id uuid,p_project_id uuid,p_request_note text,p_requested_quantity text)
returns uuid language plpgsql security invoker set search_path = ''
as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  insert into idea_app.resource_requests(offer_id,requester_id,project_id,request_note,requested_quantity,status,owner_note,reviewed_at)
  values(p_offer_id,auth.uid(),p_project_id,coalesce(p_request_note,''),coalesce(p_requested_quantity,''),'submitted','',null)
  returning id into v_id; return v_id;
end; $$;

create or replace function public.idea_lab_submit_partnership_enquiry(p_opportunity_id uuid,p_project_id uuid,p_message text)
returns uuid language plpgsql security invoker set search_path = ''
as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  insert into idea_app.partnership_enquiries(opportunity_id,requester_id,project_id,message,status,owner_note,reviewed_at)
  values(p_opportunity_id,auth.uid(),p_project_id,btrim(p_message),'submitted','',null)
  returning id into v_id; return v_id;
end; $$;

revoke all on function public.idea_lab_upsert_profile(text,text,text,text,text,text,text) from public,anon;
revoke all on function public.idea_lab_upsert_specialist_profile(text,text,text,text[],text[],text,text,text[],text,text[],text) from public,anon;
revoke all on function public.idea_lab_create_organization(text,text,text,text,text,text,text) from public,anon;
revoke all on function public.idea_lab_update_organization(uuid,text,text,text,text,text,text,text,text) from public,anon;
revoke all on function public.idea_lab_invite_organization_member(uuid,uuid,text) from public,anon;
revoke all on function public.idea_lab_accept_organization_invite(uuid) from public,anon;
revoke all on function public.idea_lab_create_resource_offer(uuid,text,text,text,text,text,text,text,text,text) from public,anon;
revoke all on function public.idea_lab_update_resource_offer(uuid,uuid,text,text,text,text,text,text,text,text,text) from public,anon;
revoke all on function public.idea_lab_create_partnership_opportunity(uuid,text,text,text,text,text,text,text) from public,anon;
revoke all on function public.idea_lab_update_partnership_opportunity(uuid,uuid,text,text,text,text,text,text,text) from public,anon;
revoke all on function public.idea_lab_submit_resource_request(uuid,uuid,text,text) from public,anon;
revoke all on function public.idea_lab_submit_partnership_enquiry(uuid,uuid,text) from public,anon;

grant execute on function public.idea_lab_upsert_profile(text,text,text,text,text,text,text) to authenticated;
grant execute on function public.idea_lab_upsert_specialist_profile(text,text,text,text[],text[],text,text,text[],text,text[],text) to authenticated;
grant execute on function public.idea_lab_create_organization(text,text,text,text,text,text,text) to authenticated;
grant execute on function public.idea_lab_update_organization(uuid,text,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.idea_lab_invite_organization_member(uuid,uuid,text) to authenticated;
grant execute on function public.idea_lab_accept_organization_invite(uuid) to authenticated;
grant execute on function public.idea_lab_create_resource_offer(uuid,text,text,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.idea_lab_update_resource_offer(uuid,uuid,text,text,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.idea_lab_create_partnership_opportunity(uuid,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.idea_lab_update_partnership_opportunity(uuid,uuid,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.idea_lab_submit_resource_request(uuid,uuid,text,text) to authenticated;
grant execute on function public.idea_lab_submit_partnership_enquiry(uuid,uuid,text) to authenticated;