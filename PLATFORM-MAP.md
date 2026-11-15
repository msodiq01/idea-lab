# IDEA LAB — Platform Map and Implementation Status

Last reviewed: 2026-11-15
Repository: `msodiq01/idea-lab`
Branch: `main`

## 1. Product direction

IDEA LAB is planned as a modular project-to-market ecosystem. A person or organization should be able to move from an idea to a team, resources, specialists, partners, customers and a sustainable operating business through connected modules.

The platform must be delivered in stages. A module shown in the interface is not automatically a live service; each capability must be marked as prototype, backend-ready, integrated, or operational.

## 2. Current repository inventory

| Module / page | Current state in repository | Notes |
|---|---|---|
| Home / ecosystem entry | UI exists | `index.html`; project creation currently uses browser storage |
| Dashboard | UI exists | `dashboard.html`; metrics are local/demo, IoT is not connected |
| Projects catalogue | UI exists | `projects.html`; current browser-side project data |
| Project detail | UI exists | `project-detail.html`; project and application workflows need shared backend integration |
| Needs & offers exchange | UI exists | `exchange.html`; browser-local listings, not shared between users |
| Investors | UI exists | `investors.html`; catalogue and requests need real accounts/data |
| Offers & collaboration | UI exists | `offers.html`; applications/chat are not yet a verified server-backed service |
| Global marketplace | UI exists | `marketplace.html`; currently reads project data, not a full trading system |
| Teams | UI exists | `teams.html`; team creation and membership need backend integration |
| Jobs / vacancies | Partial | Vacancy section is inside `teams.html`; there is no separate `jobs.html` |
| Specialists | UI exists | `specialists.html`; profiles and matching are not yet server-backed |
| Personal cabinet | UI exists | `profile.html`; profile/activity data is browser-side |
| Shared design & navigation | Implemented in source | `assets/idea-shell.css` and `assets/idea-shell.js` |
| Legacy project route | Redirect | `project.html` redirects to `projects.html` |

## 3. Data and backend status

A Supabase schema draft exists at `supabase/schema.sql`. It defines these data areas:

- Profiles
- Projects
- Teams and job posts
- Specialist profiles
- Offers and investors
- Resources
- Investment, team, job and offer applications
- Offer messages and resource orders
- Project members, tasks and updates
- Events and event registrations

The schema includes row-level security policies. This is a **repository-level SQL draft only**. This review does not verify that it has been applied to the live Supabase project, that policies have been tested, or that the website is connected to Supabase.

The current HTML pages do not load a Supabase client. Browser storage is still used by several workflows. Browser-local records are not shared between different users or devices.

## 4. Capabilities not yet verified as operational

- Sign-up, sign-in, session management and role-based access
- Shared server database connected to all pages
- Secure document storage and permission-controlled sharing
- Live cross-user messaging and notifications
- Payment-provider and bank integrations
- Accounting, invoices and settlement workflows
- Verified investor onboarding and regulated investment workflows
- Full product/service catalogue, orders, delivery and logistics
- Separate property / land / premises marketplace
- Real IoT device ingestion, monitoring and alerts
- AI-powered matching and automation
- Internationalization, multi-currency and country-specific compliance

Payments and regulated financial services must be delivered through appropriately licensed providers and compliant integrations; the platform must not imply that a prototype can hold or transfer customer funds.

## 5. Target module architecture

1. **Identity & access** — accounts, profiles, organizations, roles and permissions.
2. **Projects** — idea intake, project lifecycle, milestones, team and document access.
3. **People & talent** — teams, vacancies, specialists, applications and professional profiles.
4. **Capital & partnerships** — investor discovery, collaboration proposals and controlled due diligence.
5. **Needs, resources & marketplace** — goods, services, equipment, raw materials, suppliers, requests and offers.
6. **Operations** — orders, procurement, logistics, work tracking and organization workflows.
7. **Finance integrations** — invoices, payment-provider handoff, receipts and accounting records.
8. **Property & infrastructure** — land, premises, offices, warehouses, rentals and related services.
9. **Knowledge & community** — education, events, research and social initiatives.
10. **Intelligence & connected systems** — matching, analytics, automation and IoT integrations.
11. **Platform administration** — moderation, verification, support, audit logs and system settings.

## 6. Delivery sequence

### Stage A — Structure and consistency
- Maintain one shared navigation and design system.
- Keep a verified inventory of pages, data flows and incomplete modules.
- Avoid duplicate pages and dead navigation links.

### Stage B — Identity and shared data
- Confirm Supabase project configuration and environment handling.
- Review the SQL schema, relationships, constraints and row-level security.
- Build authentication and profile flows.
- Connect one vertical slice (create project → list project → open project detail) and test it end-to-end.

### Stage C — Core collaboration
- Connect teams, vacancies, specialist profiles, applications and offers.
- Add notifications and secure document access.

### Stage D — Marketplace and operations
- Connect needs/offers, resources, products/services, orders and logistics.
- Add property and equipment workflows as separate well-defined modules.

### Stage E — Regulated and advanced integrations
- Integrate licensed payment providers and banks.
- Add finance/accounting integrations, IoT, analytics and AI matching only after security, consent and data governance are in place.

## 7. Definition of done for every module

A module is not marked complete until:
- its user roles and permissions are defined;
- its data model and validation are reviewed;
- its interface works on mobile and desktop;
- data persists on the server and is shared only with authorized users;
- loading, empty, error and success states are handled;
- security rules and access boundaries are tested;
- the main user journey is tested from start to finish;
- prototype/demo limitations are clearly disclosed.

## 8. Immediate next implementation task

After this map is reviewed, make the home page a true ecosystem hub: group the modules by user journey and role, show what is available now versus planned, and link every card to an existing route. Do not claim unavailable integrations are live.


## 8. Identity model hujjati

Yagona Account/Profile/Organization/OrganizationMembership/ProjectMembership modeli `IDENTITY-MODEL.md` hujjatida belgilangan. Profil faoliyat yo'nalishlari platforma yoki tashkilot ruxsatlari emas. Bu maqsadli arxitektura bo'lib, joriy frontend yoki Supabase'ga hali qo'llanmagan.


## 9. Unified Global Ecosystem — 2.0

The existing Global Market is retained and becomes the discovery layer of one ecosystem. The personal cabinet becomes the signed-in operating center. Existing pages are not deleted during integration.

| Unified layer | Existing components retained | New connection |
|---|---|---|
| Identity & personal cabinet | `profile.html`, `dashboard.html`, `organizations.html` | One account, one profile, multiple activity capabilities, contextual home |
| Idea & project lifecycle | `index.html`, `projects.html`, `project-detail.html` | Project needs, people, resources, funding and applications linked to one project |
| Global Market | `marketplace.html`, `exchange.html`, `offers.html` | Unified listings for products, services, resources, needs and offers |
| Talent & employment | `teams.html`, `specialists.html` | Worker profiles, vacancies, specialist offers and applications |
| Capital & partnerships | `investors.html`, project investment requests | Funding requests and partnership proposals surfaced in the project owner's cabinet |
| Matching & applications | Existing application stores | One inbox, shared status vocabulary, recipient-specific notifications |
| Conversations & collaboration | Existing offer messages and project/team flows | Conversations and agreements tied to a specific application or project |

### Experience rule

The user chooses a primary direction and goal. The cabinet prioritizes only the relevant work. A business user sees business projects, offers, product demand, suppliers, team and funding requests first; a job seeker sees their skills, matching vacancies, applications and messages first. Other capabilities remain available on demand and can be added without a second account.

### Core data flow

`Account/Profile → Capability → Project or Listing → Need/Offer → Matching → Application → Notification → Conversation → Agreement/Order/Project work → Outcome`

A match is a suggestion, not consent or a contract. Users explicitly submit, accept, decline and negotiate. Private contact details remain protected.

### Delivery order

1. Preserve and audit current pages, legacy keys and data formats.
2. Make the personal cabinet the single signed-in home and reduce top-level navigation.
3. Connect existing Global Market, Exchange, Projects, Jobs, Specialists, Offers and Investors using stable IDs and compatibility adapters.
4. Add unified incoming/outgoing applications and browser-local demo notifications.
5. Connect project resources, team, investment and tasks to one project workspace.
6. Only after frontend flows are tested, implement real authentication, server persistence, access policies, matching and live notifications.

See `ECOSYSTEM-ARCHITECTURE.md` for the detailed data contract, user journeys, privacy rules and acceptance criteria.


## 10. Finance, management and intelligence expansion — 2026-11-15

A detailed target specification is now recorded in `FINANCE-MANAGEMENT-ARCHITECTURE.md`. It defines separate personal, business/organization and project finance workspaces; cash-flow and budget reporting; invoices and receivables/payables; management tasks, objectives, decisions, risks and KPIs; future-project portfolio tracking; and financial/operational analytics.

**Current state:** specification only. No live accounting, bank connection, payment processing, organization finance workspace or management dashboard is claimed as operational. Existing demo/localStorage behavior remains unchanged.

**Implementation order:** (1) agree data scopes and permissions, (2) build a read-only dashboard prototype using clearly labelled sample data, (3) implement secure server-side finance records and audit events in a test environment, (4) connect project/organization budgets and management workflows, (5) add reports and exports, and only then (6) evaluate licensed bank/payment/accounting integrations.

Financial data must be isolated by personal, organization and project ownership. Payment execution, custody of funds and bank access require suitable providers, legal review and explicit authorization. AI may analyze authorized data but cannot approve or execute financial actions.
