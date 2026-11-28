-- Allow authenticated users to read job posts through RLS-protected functions/views.
-- Existing SELECT policies restrict access to published jobs, owned jobs, closed jobs
-- with an application, and moderators. This table grant is required by invoker RPCs.
GRANT SELECT ON TABLE idea_app.job_posts TO authenticated;

-- Allow authenticated employers to insert the structured vacancy fields
-- used by idea_lab_create_job_post. Keep the grant column-scoped.
GRANT INSERT (required_skills, experience_years_min, schedule_label)
ON TABLE idea_app.job_posts TO authenticated;
