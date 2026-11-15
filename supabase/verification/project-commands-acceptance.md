# IDEA LAB — Project commands acceptance matrix

Status: test plan only. The migration is repository draft; no Supabase project has been changed.

## Membership transitions

| Actor and starting state | Action | Expected |
|---|---|---|
| Invited user, invited | Accept | Active; joined_at set by database |
| Invited user, invited | Decline | Declined; joined_at null |
| Invited user | Change own role while accepting | Denied |
| Unrelated user | Accept another user's invitation | Denied |
| Applicant, pending | Approve by owner | Active; owner may choose manager/contributor/viewer |
| Applicant, pending | Approve by manager | Active as existing contributor/viewer role only |
| Manager | Promote applicant to manager | Denied |
| Contributor/viewer, active | Leave project | Removed |
| Manager, active | Leave project | Removed; role unchanged |
| Owner | Change active member role | Allowed |
| Manager | Change active member role | Denied |
| Any member | Change project_id/user_id/invited_by/invited_at | Denied |
| Any member | Directly set arbitrary membership status | Denied by transition trigger |

## Task assignment

| Actor | Action | Expected |
|---|---|---|
| Owner | Assign task to self | Allowed |
| Owner/manager | Assign task to active member | Allowed |
| Owner/manager | Assign task to non-member | Denied |
| Owner/manager | Assign task to removed/declined member | Denied |
| Contributor creating task | Assign to self or leave unassigned | Allowed by existing insert policy |
| Contributor | Assign an existing task to another member | Denied |
| Viewer | Update task | Denied |
| Any user | Move task to another project by UPDATE | Denied |

## Before any staging run

1. Apply only to a disposable staging project after reviewing all prerequisite migrations.
2. Use separate test accounts for owner, manager, contributor, viewer, invited user, and applicant.
3. Confirm idea_app and idea_private remain unexposed.
4. Verify column-level grants, policies, and trigger definitions using the read-only preflight.
5. Exercise each transition with real JWT sessions; static tests are not a substitute.
6. Run Supabase Security Advisor and resolve relevant findings.
7. Confirm existing production public tables and migration history remain unchanged.

## Security design

- No exposed SECURITY DEFINER RPC endpoints are created.
- State transitions use SECURITY INVOKER triggers and narrow column-level UPDATE grants.
- Cross-row role lookups reuse the existing non-exposed idea_private helpers.
- RLS controls which rows can be updated; triggers enforce the allowed state machine.
- Task assignee must be project owner or an active project member.
- No table-wide grants, SELECT grants, INSERT grants, DELETE grants, schema exposure, or frontend connection changes are added.
