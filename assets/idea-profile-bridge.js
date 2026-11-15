/* IDEA LAB — verified legacy profile identity bridge
 * This module only inspects local profile + Auth session and prepares a proposal.
 * It never writes to localStorage or Supabase and never links by email.
 */
((global) => {
  "use strict";
  if (global.IDEALAB_PROFILE_BRIDGE) return;

  function safeId(value) {
    return typeof value === "string" && value.trim() ? value.trim() : "";
  }

  function inspect(options = {}) {
    const readProfile = options.readLegacyProfile;
    const readSession = options.readSession;
    if (typeof readProfile !== "function" || typeof readSession !== "function") {
      return { ok: false, state: "unavailable", reason: "DEPENDENCIES_MISSING" };
    }

    let profile;
    let session;
    try {
      profile = readProfile();
      session = readSession();
    } catch (_) {
      return { ok: false, state: "unavailable", reason: "INSPECTION_FAILED" };
    }

    const legacyProfileId = safeId(profile && profile.id);
    const authUserId = safeId(session && session.user && session.user.id);
    if (!legacyProfileId) {
      return { ok: true, state: "no-legacy-profile", proposal: null };
    }
    if (!authUserId) {
      return { ok: true, state: "sign-in-required", proposal: null };
    }

    return {
      ok: true,
      state: "ready-for-explicit-review",
      proposal: Object.freeze({
        legacyProfileId,
        authUserId,
        legacyEmailPresent: Boolean(profile && typeof profile.email === "string" && profile.email.trim()),
        authenticatedEmailPresent: Boolean(session.user.email),
        identityEvidence: "authenticated-session-only",
        legacyOwnershipVerified: false,
        requiresLegacyOwnershipProof: true,
        requiresExplicitConfirmation: true,
        rolesTransferred: false,
        profileDataTransferred: false
      })
    };
  }

  global.IDEALAB_PROFILE_BRIDGE = Object.freeze({ inspect });
})(typeof window !== "undefined" ? window : globalThis);
