# Verified Profile Identity Bridge

## Purpose
Prepare a safe review of the relationship between the existing browser-only `userProfile.id` and a signed-in Supabase Auth user's `auth.users.id`.

## Current behavior
- `userProfile` remains a legacy browser profile.
- Supabase Auth UID is a separate identity.
- Email similarity is not proof of ownership and is never used to link records.
- User-selected profile roles are descriptive labels, not server permissions.

## New adapter
`assets/idea-profile-bridge.js` exposes `IDEALAB_PROFILE_BRIDGE.inspect()`. It accepts injected readers for the legacy profile and Auth session and returns either:
- `no-legacy-profile`
- `sign-in-required`
- `ready-for-explicit-review` with a minimal pair of IDs.

The Auth session proves only that someone is signed in to that Auth account; it does not prove ownership of the legacy browser profile. The proposal explicitly sets `legacyOwnershipVerified: false` and `requiresLegacyOwnershipProof: true`. The adapter does not persist, migrate, overwrite, delete, or transmit anything. It does not copy profile fields or roles. The returned proposal is not a completed link and must not be treated as authorization.

The profile cabinet now shows this state in a read-only review panel. The panel updates after Auth session changes and after the local profile is saved. It offers no linking action.

## Next gated stage
Only after a Supabase staging project and tested RLS policies exist should a separate, explicitly confirmed server-side linking flow be designed. That flow must verify ownership and use the authenticated user's session; it must not trust a client-supplied Auth UID. No service-role key belongs in browser code.
