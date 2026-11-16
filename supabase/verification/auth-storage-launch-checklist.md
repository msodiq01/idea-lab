# IDEA LAB — Auth and Storage launch checklist

Status: preparation only. This document does not change the live Supabase project.
Current project: `hfxkiudvlmibpffrppzc`.
Current frontend mode must remain `offline-demo` until the gates below are completed.

## 1. Email authentication

- [ ] Keep email confirmation enabled.
- [ ] Configure a custom SMTP sender before public sign-up. Supabase's built-in SMTP is restricted to team-authorized addresses and is not a production mail service.
- [ ] Verify the sender domain's SPF, DKIM, and DMARC records with the chosen mail provider.
- [ ] Configure the correct application Site URL and exact redirect allow-list entries.
- [ ] Review confirmation, recovery, email-change, and invitation templates.
- [ ] Test delivery and one-time links with at least two synthetic accounts.
- [ ] Keep SMTP credentials only in Supabase Auth settings / a trusted secret store; never in the browser, repository, or `idea-config.js`.

Reference: https://supabase.com/docs/guides/auth/auth-smtp

## 2. Phone authentication

- [ ] Do not advertise phone/SMS OTP as active until a supported SMS provider is configured.
- [ ] Verify sender identity, destination-country coverage, delivery, provider limits, and account-level costs.
- [ ] Test OTP request throttling, expiry, invalid-code handling, and resend cooldown.
- [ ] Keep SMS provider credentials server-side only.
- [ ] If SMS delivery is not ready, hide or disable the phone sign-in option in the production UI.

Phone authentication is a provider-dependent feature; enabling the UI alone does not make SMS delivery operational.

## 3. Abuse and account protection

- [ ] Enable CAPTCHA for sign-up, sign-in, and password recovery.
- [ ] Review Auth rate limits and OTP expiry.
- [ ] Keep email confirmation enabled; do not disable it to work around SMTP delivery problems.
- [ ] Configure a strong password policy and review leaked-password protection availability.
- [ ] Test password reset, secure email change, sign-out, session expiry, and refresh behavior.
- [ ] Restrict redirect URLs to the real IDEA LAB origins; do not use broad wildcards.
- [ ] Protect the Supabase organization and GitHub accounts with MFA.

Reference: https://supabase.com/docs/guides/auth/auth-captcha

## 4. Storage policy

The draft migration `20261116180000_idea_app_storage_private_assets.sql` creates a private `idea-user-assets` bucket with:
- 10 MiB maximum object size;
- JPEG, PNG, WebP, and PDF MIME allow-list;
- canonical object path `<auth.uid()>/<avatars|organization-logos|project-files>/<uuid>.<extension>`;
- authenticated-only SELECT, INSERT, UPDATE, and DELETE policies;
- both old and replacement object paths constrained for UPDATE/upsert.

The bucket is private. It does not provide anonymous/public image delivery. Signed URL generation and organization/project-member sharing are intentionally deferred until a server-side authorization path and membership rules are implemented.

## 5. Required verification before activation

- [ ] Apply all draft migrations only to a disposable staging project after review.
- [ ] Run database migration tests and the read-only preflight SQL.
- [ ] Test with two synthetic users: own-file access succeeds; cross-user list/read/update/delete all fail.
- [ ] Test wrong bucket, wrong first folder, unsupported folder, invalid extension, oversized file, and disallowed MIME type.
- [ ] Test upload, download, replacement/upsert, and delete.
- [ ] Confirm there are no anonymous Storage policies and the bucket remains private.
- [ ] Verify public profile and organization pages do not leak private storage paths.
- [ ] Review Supabase Security Advisor and logs after tests.
- [ ] Confirm rollback and backup approach before any production migration.

## 6. Activation gate

Do not:
- apply these draft migrations to the live project;
- expose `idea_app` through the Data API;
- place a service-role/secret key, database password, JWT secret, SMTP password, or SMS token in frontend code;
- change billing or create a paid staging branch;
- switch the frontend out of `offline-demo` until staging tests and the user's explicit production activation approval are complete.

The public publishable/anon key is designed for browser use only after the schema exposure, grants, and RLS review is complete. It is not a substitute for RLS.
