# IDEA LAB — Unified Global Ecosystem Architecture

Version: 2.0.0  
Date: 2026-11-15  
Branch: feature/unified-ecosystem  
Status: target architecture; frontend implementation is staged and backend is not connected.

## 1. Product decision

IDEA LAB is one connected ecosystem, not a collection of unrelated portals. The existing Global Market capabilities remain part of the product. The new personal-cabinet and idea/project workflows are added as the organizing layer.

The user sees one account and one personal cabinet. A person may act in several capacities at once: project founder, entrepreneur, employer, job seeker, specialist, supplier, buyer, investor, volunteer, or organization representative. These are capabilities, not separate accounts and not security permissions.

The interface is purpose-led: after choosing a primary direction and goal, the cabinet prioritizes only relevant workspaces, records, suggested next steps, and incoming requests. Other capabilities remain available through a deliberate “add another activity” action; they are not forced into the user's default view.

## 2. Preserve and integrate existing Global Market assets

Do not delete or replace existing pages, data keys, or working flows during the first integration stage.

| Existing capability | Existing page/data | Unified ecosystem role |
|---|---|---|
| Global marketplace | `marketplace.html` | Public discovery surface for products, services, projects and offers |
| Demand / supply exchange | `exchange.html`, `ideaLabExchangeItems` | Unified needs and offers registry |
| Projects and ideas | `projects.html`, `project-detail.html`, `projects` | Idea-to-project lifecycle |
| Investors and funding | `investors.html`, `investors`, `investmentApplications` | Capital and investment opportunities |
| Teams and jobs | `teams.html`, `teams`, `jobs`, `jobApplications`, `teamApplications` | Talent, recruitment and project teams |
| Specialists | `specialists.html`, `ideaLabSpecialists` | Specialist capability profiles |
| Offers and messages | `offers.html`, `offers`, `offerApplications`, `offerMessages` | Service/partner offers and their requests |
| Personal profile/activity | `profile.html`, `dashboard.html`, `userProfile` | Unified user cabinet and activity overview |
| Organizations | `organizations.html` | Company, institution and team identity |

The current `marketplace.html` is a limited demo and mainly re-renders projects; it is not yet a complete product/order marketplace. The current frontend uses browser localStorage. Cross-user visibility, server notifications, real authentication and real-time matching are not available until a backend is implemented.

## 3. One account, multiple capabilities

A single Account has one primary Profile and zero or more ProfileCapabilities.

Initial capability vocabulary:
- `project_owner`
- `entrepreneur`
- `employer`
- `job_seeker`
- `specialist`
- `supplier`
- `buyer`
- `investor`
- `resource_owner`
- `volunteer`
- `organization_representative`

Capabilities describe what a person does. They must never grant admin, moderator, financial, or private-data access. Authorization is enforced separately by ownership, organization membership, and server-side policies.

Onboarding asks for one primary direction and a concrete goal. Secondary capabilities can be added later without creating another account.

## 4. Personal cabinet is the operating center

The cabinet is not another marketplace. It is the user's private command center and the single place where their activity is managed.

Core cabinet areas:
1. Overview — next action, recent activity, open requests and status counts.
2. My profile and capabilities — skills, experience, organization links and visibility controls.
3. My ideas and projects — drafts, published projects, stages, milestones and required inputs.
4. My offers and resources — products, services, equipment, materials, capacity and expertise the user can provide.
5. My needs — people, jobs, resources, products, services, funding or partners the user is looking for.
6. Applications — incoming and outgoing requests in one unified inbox.
7. Notifications — request received, status changed, match found, message received, deadline or project update.
8. Conversations — private discussions linked to an application or collaboration.
9. Settings and privacy — profile visibility, notification preferences, account and data controls.

The default navigation is contextual. A job seeker sees their work profile, suitable vacancies, applications and messages first. An entrepreneur sees their projects, offers, resource needs, customer requests and business conversations first. The remaining areas stay accessible but do not dominate the initial screen.

## 5. One registry for market objects

All market-facing records are normalized as Listings, while retaining typed detail fields.

Listing types:
- `project` / `idea`
- `product`
- `service`
- `resource` / `equipment` / `material`
- `job`
- `specialist` / `talent`
- `investment_opportunity`
- `need`
- `offer`
- `partnership`
- `event`

Every listing has a stable ID, owner, optional organization, type, category, title, description, location or service area, visibility, status, created/updated timestamps and structured details. The same underlying listing can appear in a relevant marketplace category and in its owner's cabinet; it must not be duplicated into separate independent records.

A Need is a first-class record, not just a search query. It describes what is required, quantity/scope, preferred location, budget/range when relevant, deadline, required qualifications and visibility. An Offer describes what is available, capacity/quantity, price/range when relevant, location, availability and conditions.

## 6. Matching and application lifecycle

The matching engine compares structured Needs with compatible Offers and profiles. It should consider type/category, skills, quantity/capacity, location, availability, budget/price, deadline and stated preferences. Matching is explainable: show the main reasons for a suggested match and let users control whether they receive such suggestions.

Matching does not automatically create a contract or expose private contact details.

Unified Application lifecycle:
- `new`
- `viewed`
- `in_review`
- `accepted`
- `declined`
- `negotiating`
- `agreed`
- `in_progress`
- `completed`
- `cancelled`
- `closed`

An application references exactly one target listing/project and records applicant, recipient/owner, message, relevant structured answers, status and timestamps. Existing specialized application stores remain untouched until a tested migration is approved. UI can progressively normalize their display through adapters.

A notification is generated for both parties when a request is submitted, status changes, a message arrives, or a relevant match is found. Notifications are private to their recipient and include a deep link to the relevant cabinet record.

## 7. Example end-to-end journeys

### Entrepreneur / product supplier
1. Selects Business as the primary direction.
2. Completes business profile and creates a product/service/resource Offer.
3. Adds a Need if they require raw material, equipment, staff, partner or funding.
4. Compatible buyers or suppliers discover the listing through Global Market.
5. A buyer submits an Application/Request.
6. The entrepreneur receives a cabinet notification, reviews the request and accepts, declines or negotiates.
7. Conversation and any later order are linked to that application.
8. Completion updates both parties' activity records.

### Job seeker / specialist
1. Selects Employment or Professional Services.
2. Adds skills, experience, availability, preferred work and portfolio.
3. Employer publishes a Job listing.
4. Matching suggests the vacancy to the worker and the worker to the employer, subject to visibility settings.
5. Worker receives a notification and applies.
6. Employer reviews the application and updates its status.
7. Conversation, interview and outcome remain linked to the same application.

### Idea / project founder
1. Creates an Idea and develops it into a Project.
2. Defines stage, plan, team roles, product/service, required resources and funding needs.
3. The platform connects the project to relevant specialists, suppliers, investors and partners.
4. Each interested party submits a typed application linked to the project and requested role/resource.
5. Founder reviews all incoming applications from the cabinet.
6. Accepted collaborators become project members only after explicit approval.
7. Tasks, updates, milestones and outcomes are tracked in the project workspace.

## 8. Navigation model

Public entry:
- Home
- Explore Global Market
- Sign in / Create account

After sign-in:
- My Workspace (default)
- My activity (contextual shortcuts)
- Global Market (search/discovery)
- Notifications

The global navigation stays intentionally small. Detailed functions live inside the relevant workspace, project, listing or application. Do not put every feature in the top navigation.

Primary direction is a personalization choice, not a locked identity. A user can switch context or add another capability at any time.

## 9. Data and privacy principles

- Collect only data needed for the user's declared activity and matching.
- Separate public listing data from private contact/profile data.
- Never expose a private phone, email, CV or document merely because a match exists.
- Require explicit user action before an application, team membership, investment discussion or order becomes an accepted relationship.
- Keep ownership and organization authorization checks server-side.
- Do not describe localStorage demo records as global Big Data or as visible to other users.
- Use aggregate analytics only with appropriate access controls and privacy safeguards.
- Provide deletion/export and visibility controls when the real backend is implemented.

## 10. Implementation sequence

### Stage 0 — audit and preservation
- Inventory all existing pages, localStorage keys, forms, links and tests.
- Keep a backup and preserve legacy JSON formats.
- Identify duplicate navigation and overlapping functions.

### Stage 1 — unified frontend shell and cabinet
- Introduce a small global navigation.
- Make the personal cabinet the signed-in landing page.
- Add primary direction and capability selection.
- Display contextual dashboard cards without removing existing pages.

### Stage 2 — unified listing and need/offer experience
- Connect Global Market, Exchange, Jobs, Specialists, Offers, Projects and Investors through stable record IDs and adapters.
- Add create/edit flows for Offers and Needs.
- Reuse existing data where possible; do not silently migrate or delete.

### Stage 3 — applications and notifications
- Add a unified inbox view over existing application sources.
- Standardize status labels and action patterns.
- Add local demo notifications first; clearly label them as browser-local.

### Stage 4 — project workspace
- Connect project requirements, team, specialists, resources, investment requests, tasks and updates to one project record.

### Stage 5 — backend and real multi-user behavior
- Only after frontend flows and data contracts are tested, implement authentication, database, row-level authorization, server-side matching, real notifications, file storage and transaction-provider integrations.
- Review and approve migrations and backups before applying any schema changes.

## 11. Acceptance criteria

- Existing Global Market and resource records remain intact.
- A user has one account and one cabinet even when they have several capabilities.
- The first screen prioritizes the user's chosen direction.
- A user can create an Offer and a Need without duplicating the same record across pages.
- Relevant matches can be opened from the cabinet.
- Applications have one consistent status lifecycle and remain linked to their target.
- Both parties can see their own application status and related notifications.
- Private contact details are not exposed by matching alone.
- Current offline-demo limitations are clearly disclosed until backend integration.
- Existing tests pass and new tests cover capability selection, listing/need matching, application transitions and notification recipient privacy.
