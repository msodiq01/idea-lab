-- IDEA LAB: employer organization review gate.
-- Owners may submit an organization for review, but cannot self-activate a public employer profile.
begin;
alter table idea_app.organizations drop constraint if exists organizations_status_check;
alter table idea_app.organizations add constraint organizations_status_check
  check (status in ('draft','pending_review','active','archived'));

create or replace function public.idea_lab_update_organization(
 p_organization_id uuid,p_name text,p_slug text,p_organization_type text,p_description text,
 p_location_label text,p_website_url text,p_visibility text,p_status text
) returns boolean language plpgsql security invoker set search_path=''
as $function$
declare v_count integer; v_can_remain_public boolean;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_status not in ('draft','pending_review','active','archived') then
  raise exception 'Invalid organization status' using errcode='22023';
 end if;
 select exists(select 1 from idea_app.organizations o
  where o.id=p_organization_id and o.owner_id=auth.uid()
    and o.status='active' and o.visibility='public') into v_can_remain_public;
 if p_status='active' and (not v_can_remain_public or p_visibility<>'public') then
  raise exception 'Only an already verified public organization can remain active. Submit draft organizations for review.' using errcode='42501';
 end if;
 update idea_app.organizations set
  name=btrim(p_name),slug=nullif(lower(btrim(coalesce(p_slug,''))), ''),
  organization_type=p_organization_type,description=coalesce(p_description,''),
  location_label=nullif(btrim(coalesce(p_location_label,'')),''),
  website_url=nullif(btrim(coalesce(p_website_url,'')),''),
  visibility=p_visibility,status=p_status,updated_at=now()
 where id=p_organization_id and owner_id=auth.uid();
 get diagnostics v_count=row_count;
 return v_count=1;
end;
$function$;
commit;
