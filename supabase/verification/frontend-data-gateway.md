# IDEA LAB frontend data gateway

## Status

- Repository implementation only; no production database change.
- The dashboard loads the shared Supabase JS v2 client, public config, Auth adapter, and assets/idea-data.js.
- assets/idea-config.js remains mode: offline-demo with empty URL and public key.
- No Supabase project is activated from the browser.
- No Data API schema exposure is enabled.

## Allowed read operations

The gateway is intentionally read-only and uses only the reviewed invoker views:

| Method | View | Purpose |
| --- | --- | --- |
| listPublicProjects() | idea_app.public_project_directory | Published public projects |
| listProjectUpdates(slug) | idea_app.public_project_updates | Published public updates for one project |
| listPublicSpecialists() | idea_app.public_specialist_directory | Public specialist profiles |
| listPublicResources() | idea_app.public_resource_catalogue | Published resource offers |
| listPublicPartnerships() | idea_app.public_partnership_directory | Published partnership opportunities |

All list limits are clamped to 1–50. Project slugs are validated before a request. Provider errors are normalized so database details are not shown to end users.

## Deliberately excluded

- No generic table selector.
- No direct writes, updates, deletes, or upserts.
- No service-role or secret key.
- No access to private contact, owner, or Auth identity columns.
- No project/team membership management from the browser yet.

## Activation prerequisites

Before enabling this gateway against the hosted project:

1. Complete migration review and apply the approved migrations only after explicit project-owner authorization.
2. Run two-user JWT runtime tests against a disposable staging project. Static tests do not prove runtime RLS.
3. Review every invoker view's base-table column grants and RLS policies.
4. Expose idea_app through the Data API only after confirming that the exact public invoker views and their base-table dependencies are safe.
5. Configure the project URL and publishable key in assets/idea-config.js. A publishable/anon key is public by design; never put a service-role/secret key there.
6. Verify the public catalogue requests and signed-in session behavior in a browser.

Until all gates pass, keep the offline-demo configuration unchanged. The gateway will return a safe, normalized unavailable/error result if the backend is not configured or the schema is not exposed.