-- IDEA LAB: persist moderator rejection reasons for vacancy owners.
begin;

alter table idea_app.job_posts
  add column if not exists moderation_reason text;

alter table idea_app.job_posts
  drop constraint if exists job_posts_moderation_reason_check;
alter table idea_app.job_posts
  add constraint job_posts_moderation_reason_check
  check (
    moderation_reason is null
    or char_length(btrim(moderation_reason)) between 10 and 500
  );

drop function if exists public.idea_lab_review_job_post(uuid,boolean);
create function public.idea_lab_review_job_post(
  p_job_post_id uuid,
  p_approve boolean,
  p_reason text default null
)
returns boolean
language plpgsql
security invoker
set search_path=''
as $function$
declare
  v_count integer;
  v_reason text := nullif(btrim(coalesce(p_reason,'')),'');
begin
  if auth.uid() is null
    or not exists (
      select 1 from public.user_roles ur
      where ur.user_id=(select auth.uid())
        and ur.role in ('admin','moderator')
    ) then
    raise exception 'Moderator access required' using errcode='42501';
  end if;

  if p_approve is null then
    raise exception 'Review decision is required' using errcode='22023';
  end if;

  if not p_approve and (v_reason is null or char_length(v_reason) not between 10 and 500) then
    raise exception 'A rejection reason of 10 to 500 characters is required' using errcode='22023';
  end if;

  update idea_app.job_posts
  set status=case when p_approve then 'published' else 'rejected' end,
      moderation_reason=case when p_approve then null else v_reason end,
      published_at=case when p_approve then now() else published_at end,
      updated_at=now()
  where id=p_job_post_id and status='pending_review';

  get diagnostics v_count=row_count;
  return v_count=1;
end;
$function$;

revoke all on function public.idea_lab_review_job_post(uuid,boolean,text) from public,anon;
grant execute on function public.idea_lab_review_job_post(uuid,boolean,text) to authenticated;

drop function if exists public.idea_lab_list_my_job_posts();
create function public.idea_lab_list_my_job_posts()
returns table(
  job_post_id uuid,
  organization_id uuid,
  company_name text,
  title text,
  description text,
  salary_label text,
  location_label text,
  employment_type text,
  status text,
  published_at timestamptz,
  required_skills text[],
  experience_years_min smallint,
  schedule_label text,
  moderation_reason text
)
language sql
stable
security invoker
set search_path=''
as $function$
  select
    j.id,j.organization_id,o.name,j.title,j.description,j.salary_label,
    j.location_label,j.employment_type,j.status,j.published_at,
    j.required_skills,j.experience_years_min,j.schedule_label,j.moderation_reason
  from idea_app.job_posts j
  join idea_app.organizations o on o.id=j.organization_id
  where j.created_by=(select auth.uid())
  order by j.created_at desc
  limit 100;
$function$;

revoke all on function public.idea_lab_list_my_job_posts() from public,anon;
grant execute on function public.idea_lab_list_my_job_posts() to authenticated;

commit;
