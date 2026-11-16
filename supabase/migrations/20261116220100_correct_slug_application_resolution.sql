-- IDEA LAB: correct slug resolver to rely on the applications INSERT RLS policy
-- Applied to production after validating the least-privilege column grants.
create or replace function public.submit_project_application_by_slug(
  p_project_slug text,
  p_applicant_note text,
  p_offer_amount numeric,
  p_currency_code text default 'UZS'
)
returns uuid language plpgsql security invoker set search_path = ''
as $function$
declare v_project_id uuid;
begin
  if p_project_slug is null
     or p_project_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
     or pg_catalog.char_length(p_project_slug) > 160 then
    raise exception 'Project address is invalid' using errcode = '22023';
  end if;
  select l.project_id into v_project_id
  from idea_app.project_listings l
  where l.slug = p_project_slug and l.listing_status = 'published'
  limit 1;
  if v_project_id is null then
    raise exception 'Project is unavailable for applications' using errcode = '22023';
  end if;
  -- Underlying INSERT RLS checks visibility, recruiting status, applicant identity and owner exclusion.
  return idea_app.submit_project_application(v_project_id,p_applicant_note,p_offer_amount,p_currency_code);
end;
$function$;