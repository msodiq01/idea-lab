# IDEA LAB — Unified market application routing design

Status: **design only; not deployed and not applied to Supabase**.
Target branch: `feature/investment-application-routing`.
Scope: route investor and other market enquiries for projects and all published resource-market listings into the existing Applications Center without replacing that center.

## 1. Confirmed product scope

One submission flow must support:
- Projects listed in the project marketplace.
- Physical and digital resources, equipment, spaces, materials, software, expertise, and services listed as resource offers.
- Partnership, sponsorship, grant-support, collaboration, and other published opportunities.
- Specialist profiles when a user is requesting a paid or non-paid engagement.

A standalone business/company listing is not currently a distinct entity in the inspected `idea_app` migrations. Until a dedicated business-listing entity is approved, business-related offers should be represented by an appropriate resource offer or partnership opportunity, not by inventing a table or treating every business as a project.

## 2. Existing backend building blocks (repository review)

The repository already contains draft-only objects in `idea_app`:
- `projects`, `project_listings`, and project `applications`.
- `resource_offers` and `resource_requests`.
- `partnership_opportunities` and `partnership_enquiries`.
- `specialist_profiles` and `specialist_requests`.

These are separate domain request tables. The existing Applications Center should remain the user-facing inbox/outbox; it should consume a unified, privacy-safe application feed rather than create a second center.

## 3. Proposed unified workflow

1. A signed-in user opens a published target from any supported marketplace.
2. The submission form identifies the target type and target ID from the server-backed listing, not from a user-supplied owner ID.
3. The user selects the intent (investment, resource request, service engagement, partnership, sponsorship, mentorship, or collaboration), enters a message, and optionally enters amount + currency only where relevant.
4. The backend resolves the listing owner from the canonical target record. It ignores client-supplied owner identity.
5. The submission is stored as one private application record and becomes visible to:
   - the applicant in their outgoing Applications Center;
   - the target owner (and explicitly authorized manager, if applicable) in incoming Applications Center.
6. Owner responds with review / negotiation / accept / reject. The applicant can withdraw while the request is still eligible.
7. Both participants see the same status and event history. A server-generated activity record or notification is created for the other participant.

## 4. Canonical application contract

Recommended record:
- `id`: server UUID.
- `target_type`: allowlisted type: `project`, `resource_offer`, `partnership_opportunity`, `specialist_profile`.
- `target_id`: UUID referencing the selected canonical record; the backend validates the target exists and is published/eligible.
- `applicant_id`: always `auth.uid()`; never trusted from browser payload.
- `owner_id`: resolved by the backend from the canonical target row; never accepted from the browser.
- `intent_type`: allowlisted business intent.
- `amount` + `currency`: nullable and only valid for monetary proposals; amount must be positive and currency must be an explicit ISO code (no assumed UZS).
- `message`: required, bounded text.
- `status`: canonical enum: `submitted`, `in_review`, `negotiating`, `accepted`, `rejected`, `withdrawn`, `completed`.
- `created_at`, `updated_at`: server timestamps.
- `legacy_id`: optional import-only key; no browser ID becomes an authorization identity.

A normalized target relation or explicit foreign-key columns should be chosen during SQL implementation. Do not use an unchecked polymorphic `target_id` without server-side target validation and ownership checks.

## 5. Applications Center integration

Do not replace `applications.html` or create a parallel Applications Center.
Add a unified read model/API that merges the supported request domains and normalizes:
- application ID and type;
- target title, target type, and safe public summary;
- applicant/owner display names (only if available and privacy-approved);
- amount/currency where applicable;
- status and timestamps;
- viewer perspective (`incoming` or `outgoing`).

Never expose private email, phone, owner IDs, applicant IDs, internal notes, or storage paths in a public marketplace response. Participant-only fields must be protected by RLS.

## 6. Security and deployment gates

The inspected Auth adapter currently defaults to `offline-demo`; browser profile IDs are not Supabase Auth UIDs. The existing project/investment data contract explicitly blocks live application writes until Auth UID mapping is complete.

Before any real submission is enabled:
1. Confirm Auth signup/login and session are configured in the target Supabase project.
2. Bind applicant identity to `auth.uid()`; resolve target owner on the server.
3. Implement participant-only RLS and immutable target/applicant fields.
4. Add guarded status transitions and server-generated activity/notification records.
5. Add duplicate/rate-limit policy and server-side validation.
6. Add read-only preflight, migration rollback, and data backup plan.
7. Apply migrations only to disposable staging, then run JWT-backed tests with at least two separate users and anonymous access.
8. Only after staging acceptance and explicit deployment approval, schedule production rollout.

## 7. Live environment observation

The connected Supabase project currently reports only four applied foundation migrations (2026-11-15). The later `idea_app` migration files in the repository are drafts and are not listed as applied. The live database currently exposes public foundation tables such as `projects`, `resources`, and `investments`; it does not currently show the `idea_app` schema or the draft `resource_offers` / `partnership_opportunities` objects.

Therefore this design must not be mistaken for a live backend feature. No database objects or user records were changed during this design step.

## 8. Implementation sequence

- Stage A — freeze the supported target types and canonical application contract.
- Stage B — design additive SQL migration with foreign-key integrity, RLS, status guard, activity history, and unified center read model.
- Stage C — add backend gateway methods using the existing Supabase Auth adapter; keep offline-demo clearly disabled for cross-user delivery.
- Stage D — connect existing investor submission form and existing Applications Center UI to the gateway, preserving the legacy demo path without mixing it with live data.
- Stage E — test static contracts, SQL preflight, two-user staging flows, and cross-device visibility.
- Stage F — deploy only after staging passes and explicit approval.

No production deployment is authorized by this design document.
