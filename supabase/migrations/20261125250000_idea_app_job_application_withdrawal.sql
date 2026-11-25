-- IDEA LAB: allow applicants to withdraw their own submitted job application.
create or replace function public.idea_lab_withdraw_job_application(p_application_id uuid)
returns boolean language plpgsql security invoker set search_path=''
as $function$
declare v_count integer;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 update idea_app.job_applications set status='withdrawn',updated_at=now()
 where id=p_application_id and applicant_id=auth.uid() and status='submitted';
 get diagnostics v_count=row_count;return v_count=1;
end;$function$;
revoke all on function public.idea_lab_withdraw_job_application(uuid) from public,anon;
grant execute on function public.idea_lab_withdraw_job_application(uuid) to authenticated;
