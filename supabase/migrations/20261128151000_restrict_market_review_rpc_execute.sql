-- Restrict the market application review RPCs to authenticated sessions only.
begin;
revoke all on function public.idea_lab_review_resource_request(uuid,text) from public, anon, service_role;
revoke all on function public.idea_lab_review_partnership_enquiry(uuid,text) from public, anon, service_role;
revoke all on function public.idea_lab_review_specialist_request(uuid,text) from public, anon, service_role;
grant execute on function public.idea_lab_review_resource_request(uuid,text) to authenticated;
grant execute on function public.idea_lab_review_partnership_enquiry(uuid,text) to authenticated;
grant execute on function public.idea_lab_review_specialist_request(uuid,text) to authenticated;
commit;
