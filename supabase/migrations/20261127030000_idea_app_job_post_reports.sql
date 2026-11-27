-- IDEA LAB: authenticated users can report suspicious public vacancies.
begin;

create table if not exists idea_app.job_post_reports (
  id uuid primary key default gen_random_uuid(),
  job_post_id uuid not null references idea_app.job_posts(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('scam','misleading','inappropriate','duplicate','expired','other')),
  details text not null check (char_length(btrim(details)) between 10 and 1000),
  status text not null default 'open' check (status in ('open','in_review','resolved','dismissed')),
  moderator_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  unique(job_post_id,reporter_id),
  check (moderator_note is null or char_length(moderator_note)<=1000)
);

alter table idea_app.job_post_reports enable row level security;
drop policy if exists job_post_reports_insert_own on idea_app.job_post_reports;
create policy job_post_reports_insert_own on idea_app.job_post_reports
 for insert to authenticated
 with check (reporter_id=(select auth.uid()));
drop policy if exists job_post_reports_moderator_read on idea_app.job_post_reports;
create policy job_post_reports_moderator_read on idea_app.job_post_reports
 for select to authenticated
 using (exists(select 1 from public.user_roles ur where ur.user_id=(select auth.uid()) and ur.role in ('admin','moderator')));
drop policy if exists job_post_reports_moderator_update on idea_app.job_post_reports;
create policy job_post_reports_moderator_update on idea_app.job_post_reports
 for update to authenticated
 using (exists(select 1 from public.user_roles ur where ur.user_id=(select auth.uid()) and ur.role in ('admin','moderator')))
 with check (exists(select 1 from public.user_roles ur where ur.user_id=(select auth.uid()) and ur.role in ('admin','moderator')));

grant insert,select,update on idea_app.job_post_reports to authenticated;

create or replace function public.idea_lab_create_job_post_report(
 p_job_post_id uuid,p_category text,p_details text
)
returns boolean language plpgsql security invoker set search_path=''
as $function$
declare v_count integer;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_category not in ('scam','misleading','inappropriate','duplicate','expired','other')
  or p_details is null or char_length(btrim(p_details)) not between 10 and 1000 then
  raise exception 'Invalid report details' using errcode='22023';
 end if;
 if not exists(select 1 from idea_app.job_posts j where j.id=p_job_post_id and j.status='published' and j.created_by<>(select auth.uid())) then
  raise exception 'Vacancy cannot be reported' using errcode='22023';
 end if;
 insert into idea_app.job_post_reports(job_post_id,reporter_id,category,details)
 values(p_job_post_id,(select auth.uid()),p_category,btrim(p_details))
 on conflict(job_post_id,reporter_id) do nothing;
 get diagnostics v_count=row_count;
 return v_count=1;
end;
$function$;

create or replace function public.idea_lab_list_job_post_reports()
returns table(report_id uuid,job_post_id uuid,company_name text,job_title text,category text,details text,status text,moderator_note text,created_at timestamptz)
language plpgsql stable security invoker set search_path=''
as $function$
begin
 if auth.uid() is null or not exists(select 1 from public.user_roles ur where ur.user_id=(select auth.uid()) and ur.role in ('admin','moderator')) then
  raise exception 'Moderator access required' using errcode='42501';
 end if;
 return query
 select r.id,r.job_post_id,o.name,j.title,r.category,r.details,r.status,r.moderator_note,r.created_at
 from idea_app.job_post_reports r
 join idea_app.job_posts j on j.id=r.job_post_id
 join idea_app.organizations o on o.id=j.organization_id
 order by case r.status when 'open' then 0 when 'in_review' then 1 else 2 end,r.created_at asc
 limit 200;
end;
$function$;

create or replace function public.idea_lab_update_job_post_report(
 p_report_id uuid,p_status text,p_moderator_note text default null
)
returns boolean language plpgsql security invoker set search_path=''
as $function$
declare v_count integer; v_note text:=nullif(btrim(coalesce(p_moderator_note,'')),'');
begin
 if auth.uid() is null or not exists(select 1 from public.user_roles ur where ur.user_id=(select auth.uid()) and ur.role in ('admin','moderator')) then
  raise exception 'Moderator access required' using errcode='42501';
 end if;
 if p_status not in ('in_review','resolved','dismissed') or coalesce(char_length(v_note),0)>1000 then
  raise exception 'Invalid report review status or note' using errcode='22023';
 end if;
 update idea_app.job_post_reports
 set status=p_status,moderator_note=v_note,reviewed_at=now(),reviewed_by=(select auth.uid())
 where id=p_report_id and status in ('open','in_review');
 get diagnostics v_count=row_count;
 return v_count=1;
end;
$function$;

revoke all on function public.idea_lab_create_job_post_report(uuid,text,text) from public,anon;
revoke all on function public.idea_lab_list_job_post_reports() from public,anon;
revoke all on function public.idea_lab_update_job_post_report(uuid,text,text) from public,anon;
grant execute on function public.idea_lab_create_job_post_report(uuid,text,text) to authenticated;
grant execute on function public.idea_lab_list_job_post_reports() to authenticated;
grant execute on function public.idea_lab_update_job_post_report(uuid,text,text) to authenticated;

commit;
