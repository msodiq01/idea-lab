# IDEA LAB: specialists, resource exchange, and partnerships

Status: repository draft only. Migration `20261116170000_idea_app_specialists_resources_partnerships.sql` has NOT been applied to Supabase.

## Specialist directory
- A person creates and controls their own specialist profile.
- A profile is discoverable only when its owner explicitly sets visibility to `public`.
- Public fields are display name, headline, bio, skills/categories, location label, portfolio URLs, availability, and engagement modes.
- Phone, email, Telegram, authentication identifiers, and private profile contacts are not part of the public directory.
- A project owner or active manager may send a private request to a public specialist.
- The specialist can accept/decline; the project owner/manager can cancel. The request is visible only to the specialist and project owner/active managers.

## Resource exchange
- Resource offers are owned by one account and can optionally be associated with a project.
- Only published offers appear in the public catalogue.
- Resource requests are private to the requester and resource owner.
- Requester may cancel; resource owner may accept/reject.
- The module records requests and status only; it does not collect payments or bank credentials.

## Partnership opportunities
- Types: mentorship, collaboration, sponsorship, grant support, community partner, other.
- Opportunities are published by their owner and visible in the public directory only while published.
- Enquiries are private to the requester and opportunity owner.
- Requester may withdraw; owner may review, accept, or decline.
- These are discovery and non-binding enquiry records, not investment contracts, financial advice, payment instructions, or fund transfers.

## Security acceptance matrix (must run with real JWTs on disposable staging)
| Actor | Action | Expected |
|---|---|---|
| Anonymous | Read public specialist directory | Only opted-in public profiles |
| Anonymous | Read private/unlisted specialist profile | No rows |
| Specialist | Edit another person's profile | Denied |
| Project manager | Invite public specialist | Allowed |
| Unrelated user | Read specialist request | Denied |
| Specialist | Accept/decline own request | Allowed |
| Resource owner | Publish/update own offer | Allowed |
| Unrelated user | Edit another owner's offer | Denied |
| Anonymous | Read published resource catalogue | Allowed; safe fields only |
| Requester | Read own resource request | Allowed |
| Other requester | Read another request | Denied |
| Resource owner | Accept/reject request | Allowed |
| Anonymous | Read published partnership directory | Allowed; safe fields only |
| Requester | Read own partnership enquiry | Allowed |
| Opportunity owner | Review enquiry | Allowed |
| Unrelated user | Read or alter enquiry | Denied |
| Any browser user | Access private contacts or bank/payment data through these modules | No such data is included |

## Deployment gates
1. Apply only to a disposable staging database after verifying the full migration chain and snapshot.
2. Run the read-only preflight and actual anon + two-user JWT-backed RLS tests.
3. Review trigger behavior, column grants, row policies, and invoker views with real database roles.
4. Do not expose the `idea_app` schema through the Data API. Invoker views depend on underlying table grants, and the base tables contain internal user/project/owner identifiers.
5. Keep frontend `offline-demo` until a separate safe API schema/route and Auth pilot are approved.
6. Production rollout requires explicit approval, backup/restore validation, and rollback plan.

Static repository tests are not a substitute for live PostgreSQL execution or two-user RLS acceptance.
