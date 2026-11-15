/* IDEA LAB — read-only local data diagnostics
 * v1.0.0 | Does not write, delete, migrate, or transmit browser data.
 */
((global) => {
  "use strict";
  if (global.IDEALAB_DATA_AUDIT) return;

  const DEFAULT_KEYS = Object.freeze([
    "projects", "investmentApplications", "investmentOffers", "investorRequests",
    "jobApplications", "teamApplications", "resourceOrders", "ideaLabExchangeItems",
    "offers", "userProfile", "ideaLabSpecialists", "ideaLabProfile", "ideaLabCurrentUser",
    "teams", "jobs", "specialists", "profile", "investors", "offerApplications", "offerMessages"
  ]);
  const MAX_ENTRY_BYTES = 1024 * 1024;

  function bytes(value) {
    try { return new TextEncoder().encode(value).length; }
    catch (_) { return unescape(encodeURIComponent(value)).length; }
  }
  function finding(code, severity, message, count = 1) {
    return Object.freeze({ code, severity, message, count });
  }
  function audit(options = {}) {
    const storage = options.storage || global.localStorage;
    const keys = Array.isArray(options.keys) ? [...new Set(options.keys)] : [...DEFAULT_KEYS];
    const allowed = new Set(DEFAULT_KEYS);
    const findings = [];
    const inventory = [];
    let totalBytes = 0;
    let totalRecords = 0;
    let parsedCount = 0;

    if (!storage || typeof storage.getItem !== "function") {
      return Object.freeze({
        ok: false, readOnly: true, summary: { checkedKeys: 0, foundKeys: 0, totalRecords: 0, totalBytes: 0 },
        findings: [finding("STORAGE_UNAVAILABLE", "error", "Brauzer xotirasiga o‘qish imkoni yo‘q.")], inventory: []
      });
    }
    const unknown = keys.filter(key => !allowed.has(key));
    if (unknown.length) findings.push(finding("UNKNOWN_KEY_REQUEST", "warning", "Ruxsat etilmagan kalit so‘rovi e’tiborsiz qoldirildi.", unknown.length));

    for (const key of keys.filter(key => allowed.has(key))) {
      let raw;
      try { raw = storage.getItem(key); }
      catch (_) {
        findings.push(finding("KEY_READ_FAILED", "error", "Ayrim ma’lumot kalitini o‘qib bo‘lmadi."));
        inventory.push({ key, exists: null, validJson: null, valueType: "unreadable", itemCount: null, bytes: null });
        continue;
      }
      if (raw === null) {
        inventory.push({ key, exists: false, validJson: null, valueType: "missing", itemCount: 0, bytes: 0 });
        continue;
      }
      const size = bytes(String(raw));
      totalBytes += size;
      if (size > MAX_ENTRY_BYTES) findings.push(finding("LARGE_STORAGE_ENTRY", "warning", "Katta hajmli yozuv aniq migratsiya tekshiruvini talab qiladi."));
      let value;
      try { value = JSON.parse(raw); }
      catch (_) {
        findings.push(finding("INVALID_JSON", "error", "JSON formati buzilgan ma’lumot topildi."));
        inventory.push({ key, exists: true, validJson: false, valueType: "invalid-json", itemCount: null, bytes: size });
        continue;
      }
      parsedCount++;
      const type = Array.isArray(value) ? "array" : value === null ? "null" : typeof value;
      const count = Array.isArray(value) ? value.length : value && type === "object" ? Object.keys(value).length : 1;
      totalRecords += Array.isArray(value) ? value.length : (value && type === "object" ? 1 : 0);
      if (value === null) findings.push(finding("NULL_ROOT_VALUE", "warning", "Kalitda null qiymat saqlangan."));
      if (Array.isArray(value) && value.length === 0) findings.push(finding("EMPTY_COLLECTION", "info", "Bo‘sh ro‘yxat topildi."));
      if (Array.isArray(value)) {
        const objects = value.filter(item => item && typeof item === "object" && !Array.isArray(item));
        const malformed = value.length - objects.length;
        if (malformed) findings.push(finding("NON_OBJECT_RECORD", "warning", "Ro‘yxatda obyekt bo‘lmagan elementlar bor.", malformed));
        const missingIds = objects.filter(item => item.id === undefined || item.id === null || String(item.id).trim() === "").length;
        if (missingIds) findings.push(finding("MISSING_RECORD_ID", "warning", "Ayrim yozuvlarda ID yo‘q.", missingIds));
        const ids = objects.map(item => String(item.id)).filter(id => id && id !== "undefined");
        const duplicateIds = ids.length - new Set(ids).size;
        if (duplicateIds) findings.push(finding("DUPLICATE_RECORD_ID", "error", "Takrorlangan yozuv IDlari aniqlandi.", duplicateIds));
        const emptyRecords = objects.filter(item => Object.keys(item).length === 0).length;
        if (emptyRecords) findings.push(finding("EMPTY_RECORD", "warning", "Bo‘sh obyekt yozuvlari topildi.", emptyRecords));
        const largeRecords = objects.filter(item => {
          try { return bytes(JSON.stringify(item)) > 100 * 1024; } catch (_) { return true; }
        }).length;
        if (largeRecords) findings.push(finding("LARGE_RECORD", "warning", "Hajmi katta alohida yozuvlar topildi.", largeRecords));
      } else if (type === "object") {
        if (!Object.keys(value).length) findings.push(finding("EMPTY_OBJECT", "info", "Bo‘sh obyekt topildi."));
      } else if (type !== "string" && type !== "number" && type !== "boolean") {
        findings.push(finding("UNEXPECTED_ROOT_TYPE", "warning", "Kutilmagan ma’lumot turi topildi."));
      }
      inventory.push({ key, exists: true, validJson: true, valueType: type, itemCount: count, bytes: size });
    }

    if (!inventory.some(item => item.exists === true)) findings.push(finding("NO_LEGACY_DATA", "info", "Tekshirilgan kalitlarda eski ma’lumot topilmadi."));
    if (totalBytes > 5 * 1024 * 1024) findings.push(finding("LARGE_TOTAL_DATASET", "warning", "Umumiy ma’lumot hajmi 5 MB dan oshadi."));
    const errorCount = findings.filter(item => item.severity === "error").length;
    const warningCount = findings.filter(item => item.severity === "warning").length;
    return Object.freeze({
      ok: errorCount === 0,
      readOnly: true,
      summary: Object.freeze({
        checkedKeys: inventory.length,
        foundKeys: inventory.filter(item => item.exists === true).length,
        parsedKeys: parsedCount,
        totalRecords,
        totalBytes,
        errorCount,
        warningCount,
        infoCount: findings.filter(item => item.severity === "info").length
      }),
      findings: Object.freeze(findings),
      inventory: Object.freeze(inventory)
    });
  }

  global.IDEALAB_DATA_AUDIT = Object.freeze({ version: "1.0.0", allowedKeys: DEFAULT_KEYS, audit });
})(window);
