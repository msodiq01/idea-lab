-- Allow authenticated employers to insert the structured vacancy fields
-- used by idea_lab_create_job_post. Keep the grant column-scoped.
GRANT INSERT (required_skills, experience_years_min, schedule_label)
ON TABLE idea_app.job_posts TO authenticated;
