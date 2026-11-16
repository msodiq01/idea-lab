-- IDEA LAB: resolve published project slugs server-side for safe investment applications
-- Additive migration; no private identifiers are exposed to the browser.
begin;

create or replace function public.submit_project_application_by_slug(
  p_project_slug text,
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
  v_project_id uuid;
begin
  if p_project_slug is null
     or p_project_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
     or pg_catalog.char_length(p_project_slug) > 160 then
    raise exception 'Project address is invalid' using errcode = '22023';
  end if;

  select l.project_id
    into v_project_id
  from idea_app.project_listings l
  join idea_app.projects p on p.id = l.project_id
  where l.slug = p_project_slug
    and l.listing_status = 'published'
    and p.visibility = 'public'
    and p.status = 'recruiting'
  limit 1;

  if v_project_id is null then
    raise exception 'Project is unavailable for applications' using errcode = '22023';
  end if;

  return idea_app.submit_project_application(
    v_project_id, p_applicant_note, p_offer_amount, p_currency_code
  );
end;
$function$;

revoke all on function public.submit_project_application_by_slug(text,text,numeric,text)
  from public, anon, authenticated;
grant execute on function public.submit_project_application_by_slug(text,text,numeric,text)
  to authenticated;

comment on function public.submit_project_application_by_slug(text,text,numeric,text) is
  'Resolves a published recruiting project by public slug and submits for auth.uid(); does not disclose project UUIDs.';

commit;