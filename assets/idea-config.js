/* IDEA LAB public browser configuration.
 * Publishable key is intentionally public. Live backend uses only the public Supabase key; all private tables are protected by RLS.
 * Two-account isolation is the next required acceptance test.
 * Never place service_role, database passwords, JWT secrets, or provider secrets here.
 */
window.IDEALAB_CONFIG = Object.freeze({
  mode: "supabase",
  url: "https://hfxkiudvlmibpffrppzc.supabase.co",
  anonKey: "sb_publishable_KoLvG97lhYOuDGxTZH9D4A_Slz3gGjJ"
});
