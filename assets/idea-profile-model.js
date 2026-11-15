/* IDEA LAB — descriptive profile persona model.
 * Self-declared activity roles are for discovery and recommendations only.
 * They are never authorization, account verification, or access-control claims.
 */
((global) => {
  "use strict";
  if (global.IDEALAB_PROFILE_MODEL) return;
  const ROLE_GROUPS = Object.freeze([
    Object.freeze({ label: "G‘oya va loyiha yaratuvchisi", roles: ["Loyiha egasi"] }),
    Object.freeze({ label: "Investitsiya", roles: ["Investor"] }),
    Object.freeze({ label: "Ish va karyera", roles: ["Ish beruvchi", "Ish izlovchi"] }),
    Object.freeze({ label: "Savdo va ishlab chiqarish", roles: ["Yetkazib beruvchi", "Ishlab chiqaruvchi", "Xaridor"] }),
    Object.freeze({ label: "Mutaxassislik", roles: ["Mutaxassis"] }),
    Object.freeze({ label: "Ko‘ngillilik va jamiyat", roles: ["Ko‘ngilli"] }),
    Object.freeze({ label: "Tashkilotlar", roles: ["Tashkilot vakili"] }),
    Object.freeze({ label: "Hamkorlik", roles: ["Hamkor"] })
  ]);
  function summarize(input) {
    const data = input && typeof input === "object" ? input : {};
    const selected = Array.isArray(data.roles) ? [...new Set(data.roles.filter(value => typeof value === "string"))] : [];
    const segments = ROLE_GROUPS.filter(group => group.roles.some(role => selected.includes(role))).map(group => group.label);
    const skills = Array.isArray(data.skills) ? data.skills : String(data.skills || "").split(",");
    const cleanSkills = [...new Set(skills.map(value => String(value).trim()).filter(Boolean))].slice(0, 12);
    const primaryGoal = typeof data.primaryGoal === "string" ? data.primaryGoal.trim().slice(0, 180) : "";
    const description = segments.length ? "Sizning profilingiz " + segments.join(" • ") + " yo‘nalishlariga mos." : "Faoliyat rollaringiz tanlanganda platformadagi yo‘nalishlaringiz shu yerda ko‘rinadi.";
    return Object.freeze({ segments, selectedRoles: selected, primaryGoal, skills: cleanSkills, description, isDescriptiveOnly: true });
  }
  global.IDEALAB_PROFILE_MODEL = Object.freeze({ summarize, roleGroups: ROLE_GROUPS });
})(typeof window !== "undefined" ? window : globalThis);