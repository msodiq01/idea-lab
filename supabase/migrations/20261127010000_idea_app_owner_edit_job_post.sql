-- IDEA LAB: owner edits a vacancy; published edits return to moderator review.
begin;
create or replace function public.idea_lab_update_job_post(
 p_job_post_id uuid,p_title text,p_description text,p_salary_label text,p_location_label text,p_employment_type text
)
returns boolean language plpgsql security invoker set search_path=''
as $function$
declare v_count integer;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_title is null or char_length(btrim(p_title)) not between 3 and 100
  or p_description is null or char_length(btrim(p_description)) not between 10 and 3000
  or p_location_label is null or char_length(btrim(p_location_label)) not between 2 and 120
  or coalesce(char_length(p_salary_label),0)>120
  or p_employment_type is null or p_employment_type not in ('full_time','part_time','remote','internship','freelance') then
  raise exception 'Invalid job post fields' using errcode='22023';
 end if;
 update idea_app.job_posts
 set title=btrim(p_title),description=btrim(p_description),salary_label=coalesce(btrim(p_salary_label),''),
  location_label=btrim(p_location_label),employment_type=p_employment_type,
  status=case when status='published' then 'pending_review' else status end,
  updated_at=now()
 where id=p_job_post_id and created_by=auth.uid() and status in ('published','closed','pending_review');
 get diagnostics v_count=row_count; return v_count=1;
end;$function$;
revoke all on function public.idea_lab_update_job_post(uuid,text,text,text,text,text) from public,anon;
grant execute on function public.idea_lab_update_job_post(uuid,text,text,text,text,text) to authenticated;
commit;
