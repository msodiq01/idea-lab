# IDEA LAB — Real-World Readiness Roadmap

This roadmap moves IDEA LAB from a growing prototype toward a trustworthy platform. It prioritizes verification and complete user journeys over adding isolated features.

## Working rules
- Never claim a module is production-ready based only on static tests.
- Keep demo/localStorage data clearly separated from server-backed data.
- Do not expose private contact fields in public listings or APIs.
- Avoid destructive database changes; schema changes must be reviewed migrations.
- Every feature should include tests, empty/loading/error states, mobile checks, and a documented data source.

## Phase 1 — Baseline and release safety
- [ ] Inventory all routes and identify duplicate, broken, or unreachable navigation.
- [ ] For each module, record: server/local/demo status, read/write source, auth requirement, data owner, privacy risk.
- [ ] Run `node --test tests/*.test.cjs` and record the result.
- [ ] Check GitHub Actions on the current default branch.
- [ ] Verify deployment URL, HTTPS, assets, and browser console on desktop and mobile.
- [ ] Review pending PRs; merge only after checks and scope review.

**Exit criteria:** a repeatable baseline report, no broken core navigation, CI green, and known limitations clearly labeled.

## Phase 2 — Identity, permissions, and data boundaries
- [ ] Create a controlled test-user setup (two independent accounts, no real personal data).
- [ ] Validate sign-in, sign-out, session expiry, and recovery flows.
- [ ] Run the two-user RLS acceptance matrix for projects, applications, teams, careers, and uploads.
- [ ] Confirm owner, contributor, viewer, applicant, and public roles cannot read or modify unauthorized rows.
- [ ] Inspect RPC grants, views, policies, and storage bucket policies for least privilege.
- [ ] Confirm private uploads cannot be accessed through public URLs.

**Exit criteria:** actual authenticated requests demonstrate cross-user isolation; static tests alone do not count.

## Phase 3 — Core user journeys
- [ ] Project owner creates a project and saves it.
- [ ] Project owner publishes/unpublishes and sees correct public visibility.
- [ ] A second user browses and applies to a project.
- [ ] Owner reviews applications and updates statuses; applicant sees only their own status.
- [ ] Team owner posts an opportunity; member applies; owner reviews.
- [ ] Employer posts a vacancy; applicant applies; both see the correct permitted status.
- [ ] Organization profile is clearly labeled prototype until server sync and authorization are implemented.
- [ ] Resources flow is clearly labeled local inventory vs public server catalog.
- [ ] Investor demo does not imply real funding, payments, or commitments.

**Exit criteria:** each journey passes with two test accounts and no local-only data presented as shared server data.

## Phase 4 — UX and accessibility quality
- [ ] Test widths from narrow phones through desktop; no overflow or clipped controls.
- [ ] Ensure forms have labels, validation, helpful errors, and submission feedback.
- [ ] Keyboard-only navigation, visible focus, Escape handling, and accessible names.
- [ ] Respect reduced-motion preferences.
- [ ] Check empty states, loading states, offline/failed requests, and retry behavior.
- [ ] Ensure no private contact information is rendered in public cards or search results.

**Exit criteria:** documented mobile/desktop smoke-test checklist completed.

## Phase 5 — Operational readiness
- [ ] Document deployment and rollback procedures.
- [ ] Confirm secrets are not committed and browser bundles contain no service-role keys.
- [ ] Define safe backups and recovery process for database/storage.
- [ ] Add minimal monitoring for critical failures without collecting unnecessary personal data.
- [ ] Document support/contact and feedback paths.
- [ ] Publish a release note describing real capabilities and limitations.

**Exit criteria:** another maintainer can deploy, verify, and recover the app using written instructions.

## Priority order
1. Current baseline + pending PR review.
2. Two-user auth/RLS and storage security validation.
3. Complete core project/application journey.
4. Team and career server journeys.
5. Organization/resources/investor demo boundaries.
6. UX/accessibility and operational readiness.

## Next implementation batch
Start with a non-destructive audit of route/module status and test coverage, then close the highest-risk gaps. Do not bulk-convert localStorage modules or apply database migrations without review and acceptance tests.
