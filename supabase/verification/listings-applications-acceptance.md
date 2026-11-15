# IDEA LAB: public listings and applications acceptance plan

Status: repository draft only. Migration `20261116160000_idea_app_listings_applications.sql` has not been applied to Supabase.

## Public project directory
- A project appears only when its listing is `published`, its project visibility is `public`, and project status is `recruiting`, `active`, or `completed`.
- Public directory views use PostgreSQL `security_invoker = true`.
- Public projections return listing slug/title/summary/category, project type/status/dates, and publication time only.
- Internal project IDs, owner IDs, contact details, private profile fields, and storage paths are not projected.
- Public project updates require both update visibility `public` and publication status `published`, plus a published listing and public project.

## Applications
- One application per applicant/project pair; duplicate submissions are rejected by a unique constraint.
- Applicants can create an application only for a published listing attached to a public project in `recruiting` status.
- Applicant identity is bound to `auth.uid()`; client-supplied identity is not trusted.
- Applications are visible only to the applicant, project owner, and active project managers.
- Applicants may withdraw a submitted/in-review application. Owners/managers may move submitted applications to in-review/accepted/rejected, and in-review applications to accepted/rejected.
- Applicant note and identity fields are immutable after submission. Reviewer note and review timestamps are only available through narrow update grants and the transition trigger.
- Application rows contain no phone, email, Telegram, bank, or other direct contact details.

## Two-user acceptance matrix (must run on disposable staging)
| Actor | Action | Expected |
|---|---|---|
| Anonymous | Read published public directory | Allowed; safe projection only |
| Anonymous | Read draft/unlisted/private listing | No rows |
| Authenticated applicant | Submit to published recruiting project | Allowed |
| Applicant | Submit duplicate for same project | Rejected |
| Applicant | Read own application | Allowed |
| Applicant | Read another applicant's application | Denied |
| Applicant | Change applicant_id/project_id/note | Rejected |
| Applicant | Withdraw submitted/in-review application | Allowed |
| Applicant | Accept/reject own application | Rejected |
| Project owner | Read project applications | Allowed |
| Active project manager | Read and review applications | Allowed |
| Contributor/viewer | Read project applications | Denied |
| Unrelated user | Read/review application | Denied |
| Owner/manager | Accept/reject after review | Allowed |
| Anonymous | Read public published project updates | Allowed; no author/internal IDs |
| Anonymous | Read team-only or draft updates | No rows |

## Deployment gate
1. Apply only to a disposable staging database after checking migration dependencies and snapshot.
2. Run SQL preflight and actual JWT-backed tests using at least two independent users plus anon.
3. Verify views obey RLS, grants are column-limited, and no contact/private columns are exposed.
4. Do not expose `idea_app` through the Data API until the full schema/grant/RLS review passes.
5. Keep frontend `offline-demo` until the Auth adapter and server integration have a separately approved pilot.
6. Production rollout requires explicit approval, backup/restore plan, and rollback migration.

This document does not claim that live Supabase, Auth, Data API exposure, or two-user RLS tests are complete.
