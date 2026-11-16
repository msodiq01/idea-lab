-- IDEA LAB: owner-only public project listing publication
begin;
create or replace function idea_app.publish_project_listing(
  p_project_id uuid,p_slug text,p_title text,p_summary text,p_category text default 'other'
)
returns text language plpgsql security invoker set search_path = ''
as $function$
declare v_project_id uuid; v_category text := coalesce(p_category,'other');
begin
  if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_project_id is null then raise exception 'Project identifier is required' using errcode='22023'; end if;
  if p_slug is null or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or pg_catalog.char_length(p_slug) not between 3 and 100 then raise exception 'Project slug is invalid' using errcode='22023'; end if;
  if p_title is null or pg_catalog.char_length(pg_catalog.btrim(p_title)) not between 3 and 160 then raise exception 'Project title is invalid' using errcode='22023'; end if;
  if p_summary is null or pg_catalog.char_length(pg_catalog.btrim(p_summary)) not between 1 and 600 then raise exception 'Project summary is invalid' using errcode='22023'; end if;
  if v_category not in ('startup','social','research','education','technology','creative','community','other') then v_category := 'other'; end if;
  update idea_app.projects set visibility='public',status='recruiting',updated_at=pg_catalog.now()
  where id=p_project_id returning id into v_project_id;
  if v_project_id is null then raise exception 'Project not found or not owned by this account' using errcode='42501'; end if;
  insert into idea_app.project_listings(project_id,slug,title,summary,category,listing_status,published_at)
  values(v_project_id,p_slug,p_title,pg_catalog.btrim(p_summary),v_category,'published',pg_catalog.now())
  on conflict(project_id) do update set slug=excluded.slug,title=excluded.title,summary=excluded.summary,
    category=excluded.category,listing_status='published',published_at=pg_catalog.now(),updated_at=pg_catalog.now();
  return p_slug;
end;
$function$;
revoke all on function idea_app.publish_project_listing(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function idea_app.publish_project_listing(uuid,text,text,text,text) to authenticated;
create or replace function public.idea_lab_publish_project_listing(
  p_project_id uuid,p_slug text,p_title text,p_summary text,p_category text default 'other'
)
returns text language sql security invoker set search_path = ''
as $function$ select idea_app.publish_project_listing(p_project_id,p_slug,p_title,p_summary,p_category); $function$;
revoke all on function public.idea_lab_publish_project_listing(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.idea_lab_publish_project_listing(uuid,text,text,text,text) to authenticated;
commit;