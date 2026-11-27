-- IDEA LAB: mandatory moderation checklist with an auditable decision record.
begin;

create table if not exists idea_app.job_post_moderation_reviews (
  id uuid primary key default gen_random_uuid(),
  job_post_id uuid not null references idea_app.job_posts(id) on delete cascade,
  moderator_id uuid not null references auth.users(id),
  decision text not null check (decision in ('published','rejected')),
  checklist jsonb not null check (jsonb_typeof(checklist)='object'),
  rejection_reason text,
  reviewed_at timestamptz not null default now(),
  check (rejection_reason is null or char_length(btrim(rejection_reason)) between 10 and 500)
);

alter table idea_app.job_post_moderation_reviews enable row level security;
drop policy if exists job_post_moderation_reviews_moderator_read on idea_app.job_post_moderation_reviews;
create policy job_post_moderation_reviews_moderator_read on idea_app.job_post_moderation_reviews
 for select to authenticated
 using (exists(select 1 from public.user_roles ur where ur.user_id=(select auth.uid()) and ur.role in ('admin','moderator')));
drop policy if exists job_post_moderation_reviews_moderator_insert on idea_app.job_post_moderation_reviews;
create policy job_post_moderation_reviews_moderator_insert on idea_app.job_post_moderation_reviews
 for insert to authenticated
 with check (moderator_id=(select auth.uid()) and exists(select 1 from public.user_roles ur where ur.user_id=(select auth.uid()) and ur.role in ('admin','moderator')));
grant select,insert on idea_app.job_post_moderation_reviews to authenticated;

drop function if exists public.idea_lab_review_job_post(uuid,boolean,text);
drop function if exists public.idea_lab_review_job_post(uuid,boolean);
create function public.idea_lab_review_job_post(
 p_job_post_id uuid,
 p_approve boolean,
 p_reason text,
 p_checklist jsonb
)
returns boolean language plpgsql security invoker set search_path=''
as $function$
declare
 v_count integer;
 v_reason text:=nullif(btrim(coalesce(p_reason,'')),'');
 v_keys text[]:=array[
  'employer_verified','job_details_clear','salary_terms_clear',
  'work_conditions_clear','age_requirements_checked','no_upfront_fees','no_suspicious_requests'
 ];
begin
 if auth.uid() is null or not exists(
  select 1 from public.user_roles ur
  where ur.user_id=(select auth.uid()) and ur.role in ('admin','moderator')
 ) then
  raise exception 'Moderator access required' using errcode='42501';
 end if;
 if p_approve is null or p_checklist is null or jsonb_typeof(p_checklist)<>'object'
   or jsonb_object_length(p_checklist)<>7
   or not (p_checklist ?& v_keys)
   or exists(select 1 from unnest(v_keys) as keys(key) where p_checklist->>keys.key not in ('true','false')) then
  raise exception 'A complete moderation checklist is required' using errcode='22023';
 end if;
 if p_approve and exists(select 1 from unnest(v_keys) as keys(key) where p_checklist->>keys.key<>'true') then
  raise exception 'All safety checks must pass before approval' using errcode='22023';
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
 if v_count=1 then
  insert into idea_app.job_post_moderation_reviews(job_post_id,moderator_id,decision,checklist,rejection_reason)
  values(p_job_post_id,(select auth.uid()),case when p_approve then 'published' else 'rejected' end,p_checklist,case when p_approve then null else v_reason end);
 end if;
 return v_count=1;
end;
$function$;

revoke all on function public.idea_lab_review_job_post(uuid,boolean,text,jsonb) from public,anon;
grant execute on function public.idea_lab_review_job_post(uuid,boolean,text,jsonb) to authenticated;

commit;
