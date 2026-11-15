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
