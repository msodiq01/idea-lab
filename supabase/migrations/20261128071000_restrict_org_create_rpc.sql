-- Restrict organization creation RPC to authenticated users only.
begin;
revoke all on function public.idea_lab_create_active_organization(text,text,text,text,text,text,text) from public, anon;
grant execute on function public.idea_lab_create_active_organization(text,text,text,text,text,text,text) to authenticated;
commit;
