-- Allow authenticated owners to create and update organizations; RLS policies enforce ownership.
grant insert, update on table idea_app.organizations to authenticated;
