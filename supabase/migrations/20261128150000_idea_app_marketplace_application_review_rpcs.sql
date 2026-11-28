-- Secure, participant-scoped status actions for non-career market applications.
-- These RPCs intentionally avoid granting broad UPDATE access on the underlying tables.
begin;

create or replace function public.idea_lab_review_resource_request(p_request_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare v_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_status not in ('accepted','rejected','cancelled') then raise exception 'Invalid resource request status' using errcode = '22023'; end if;
  update idea_app.resource_requests r
     set status = p_status, reviewed_at = pg_catalog.now(), updated_at = pg_catalog.now()
   where r.id = p_request_id
     and r.status = 'submitted'
     and (
       (p_status = 'cancelled' and r.requester_id = auth.uid())
       or
       (p_status in ('accepted','rejected') and exists (
          select 1 from idea_app.resource_offers o
           where o.id = r.offer_id and o.owner_id = auth.uid()
       ))
     );
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$function$;

create or replace function public.idea_lab_review_partnership_enquiry(p_enquiry_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare v_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_status not in ('in_review','accepted','declined','withdrawn') then raise exception 'Invalid partnership enquiry status' using errcode = '22023'; end if;
  update idea_app.partnership_enquiries e
     set status = p_status, reviewed_at = pg_catalog.now(), updated_at = pg_catalog.now()
   where e.id = p_enquiry_id
     and (
       (p_status = 'withdrawn' and e.requester_id = auth.uid() and e.status in ('submitted','in_review'))
       or
       (p_status in ('in_review','accepted','declined') and e.status in ('submitted','in_review') and exists (
          select 1 from idea_app.partnership_opportunities o
           where o.id = e.opportunity_id and o.owner_id = auth.uid()
       ))
     );
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$function$;

create or replace function public.idea_lab_review_specialist_request(p_request_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare v_count integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_status not in ('accepted','declined','cancelled') then raise exception 'Invalid specialist request status' using errcode = '22023'; end if;
  update idea_app.specialist_requests r
     set status = p_status, responded_at = pg_catalog.now(), updated_at = pg_catalog.now()
   where r.id = p_request_id
     and r.status = 'submitted'
     and (
       (p_status = 'cancelled' and r.requested_by = auth.uid())
       or
       (p_status in ('accepted','declined') and exists (
          select 1 from idea_app.specialist_profiles p
           where p.id = r.specialist_id and p.user_id = auth.uid()
       ))
     );
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$function$;

revoke all on function public.idea_lab_review_resource_request(uuid,text) from public;
revoke all on function public.idea_lab_review_partnership_enquiry(uuid,text) from public;
revoke all on function public.idea_lab_review_specialist_request(uuid,text) from public;
grant execute on function public.idea_lab_review_resource_request(uuid,text) to authenticated, service_role;
grant execute on function public.idea_lab_review_partnership_enquiry(uuid,text) to authenticated, service_role;
grant execute on function public.idea_lab_review_specialist_request(uuid,text) to authenticated, service_role;

commit;
