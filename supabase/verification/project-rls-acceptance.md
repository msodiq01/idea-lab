# IDEA LAB — Projects RLS acceptance matrix

Status: test plan only. No production or staging data has been changed.

## Roles
- Owner: projects.created_by.
- Manager: active project_members row with role manager.
- Contributor: active member with role contributor.
- Viewer: active member with role viewer.
- Applicant: signed-in user with no membership; may only create a pending request for a public recruiting project.
- Anonymous: no authenticated JWT.

## Required two-user / multi-role checks

| Scenario | Expected |
|---|---|
| Anonymous reads any idea_app project table | Denied at schema/table privilege boundary |
| User B reads User A private project | No rows |
| User B reads User A public recruiting/active/completed project | Visible only after deliberate schema/table access enablement |
| User B reads User A draft/private project | No rows |
| Owner reads project and all project members | Allowed |
| Active manager reads project and team members | Allowed |
| Contributor reads project and team list | Project allowed; team list not exposed |
| Viewer reads project and tasks | Read allowed |
| Viewer creates or edits task/update | Denied |
| Applicant requests to join public recruiting project | Pending contributor/viewer request only |
| Applicant attempts active membership or manager role | Denied |
| Manager invites contributor/viewer | Allowed as invited, not active |
| Manager attempts to invite/promote another manager | Denied |
| Manager attempts to delete owner or manager membership | Denied |
| Member updates membership role/status directly | Denied; server transition operation required |
| Contributor creates task assigned to self or unassigned | Allowed |
| Contributor assigns task to another user | Denied until dedicated server operation exists |
| User outside project reads tasks/team updates | Denied |
| Public reader reads team-only or draft update | Denied |
| Public reader reads published public update on public active/recruiting/completed project | Allowed only after explicit Data API and table grant phase |
| Project creator links a project to an organization they do not own | Denied |
| Project creator links project to an organization they own | Allowed |

## Before staging execution
1. Identify a dedicated staging project; do not use production for cross-user write tests.
2. Review the three prerequisite migrations and take a recoverable backup.
3. Keep idea_app out of Data API exposed schemas for the first RLS test pass.
4. Use two separate test accounts/sessions; never share credentials or tokens.
5. Verify behavior with JWT simulation or a disposable staging client.
6. Only after the matrix passes, separately plan schema exposure and least-privilege table grants.
7. Verify the existing nine public tables and migration history are unchanged.

## Deliberate restrictions
- Profile, profile_contacts, organizations, and organization_members remain closed.
- Membership status changes use the guarded column-level update and invoker trigger in migration 20261116150000; do not grant table-wide UPDATE.
- Invited users may accept/decline their own invite; owners/managers may decide pending requests, but only owners may change an active member role.
- Task assignment to another user is available only to owner/manager and only for the project owner or an active member; contributors cannot reassign another person.
- Public reads are policy-ready but not Data API reachable until exposure and grants are reviewed.
- Three narrowly scoped SECURITY DEFINER helpers are in the unexposed idea_app schema, pin search_path, contain no dynamic SQL, bind decisions to auth.uid(), and grant EXECUTE only to authenticated.


## Follow-on command migration (20261116150000)

The command migration adds:
- guarded membership transitions: invite accept/decline, pending request approval/rejection, voluntary leave, and owner-only active role changes;
- immutable membership identity/invitation columns;
- column-level UPDATE privileges only, with RLS still required for row access;
- owner/manager task assignment to the project owner or an active member;
- SECURITY INVOKER triggers; only the private cross-row membership lookup is SECURITY DEFINER, uses an empty search_path, and remains outside exposed schemas.

It is still a repository draft. No schema exposure, table-wide grants, live migration, or two-user test has occurred.
