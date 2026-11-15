/* IDEA LAB — markaziy frontend yadro
 * v1.0.0 | Hozircha backendga ulanmagan, brauzer demo adapteri.
 * Mavjud localStorage kalitlarini avtomatik ko'chirmaydi yoki o'zgartirmaydi.
 */
((global) => {
  "use strict";

  if (global.IDEALAB) {
    console.warn("[IDEA LAB] Core already initialized.");
    return;
  }

  const VERSION = "1.0.0";
  const PREFIX = "ideaLab.core.";
  const listeners = new Map();

  const STATUS = Object.freeze({
    listing: Object.freeze({
      draft: "Qoralama",
      pending_review: "Tekshiruvda",
      active: "Faol",
      paused: "To'xtatilgan",
      closed: "Yopilgan",
      rejected: "Rad etilgan",
      archived: "Arxiv"
    }),
    application: Object.freeze({
      submitted: "Yuborildi",
      reviewing: "Ko'rib chiqilmoqda",
      interview: "Suhbat belgilandi",
      accepted: "Qabul qilindi",
      rejected: "Rad etildi",
      withdrawn: "Bekor qilindi"
    }),
    project: Object.freeze({
      draft: "Qoralama",
      active: "Faol",
      paused: "To'xtatilgan",
      completed: "Yakunlangan",
      cancelled: "Bekor qilingan",
      archived: "Arxiv"
    }),
    membership: Object.freeze({
      invited: "Taklif etilgan",
      pending: "Kutilmoqda",
      active: "Faol",
      declined: "Rad etilgan",
      removed: "Chiqarilgan"
    })
  });

  const EVENTS = Object.freeze({
    storageChanged: "storage:changed",
    error: "system:error"
  });

  function emit(name, detail) {
    const callbacks = listeners.get(name);
    if (!callbacks) return;
    callbacks.forEach((callback) => {
      try { callback(detail); }
      catch (error) { console.error("[IDEA LAB] Event listener error:", error); }
    });
  }

  function subscribe(name, callback) {
    if (typeof callback !== "function") throw new TypeError("Callback function kerak.");
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name).add(callback);
    return () => listeners.get(name)?.delete(callback);
  }

  function reportError(code, message, cause) {
    const error = { code, message, cause: cause || null, at: new Date().toISOString() };
    console.error("[IDEA LAB]", error);
    emit(EVENTS.error, error);
    return { ok: false, error };
  }

  function storageAvailable() {
    try {
      const testKey = PREFIX + "availability";
      global.localStorage.setItem(testKey, "1");
      global.localStorage.removeItem(testKey);
      return true;
    } catch (_) {
      return false;
    }
  }

  const store = Object.freeze({
    get(key, fallback = null) {
      if (typeof key !== "string" || !key.trim()) return fallback;
      try {
        const raw = global.localStorage.getItem(PREFIX + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (error) {
        reportError("STORAGE_READ_FAILED", "Mahalliy ma'lumotni o'qib bo'lmadi.", error.message);
        return fallback;
      }
    },
    set(key, value) {
      if (typeof key !== "string" || !key.trim()) {
        return reportError("INVALID_STORAGE_KEY", "Ma'lumot kaliti noto'g'ri.");
      }
      try {
        global.localStorage.setItem(PREFIX + key, JSON.stringify(value));
        emit(EVENTS.storageChanged, { key, value });
        return { ok: true };
      } catch (error) {
        return reportError("STORAGE_WRITE_FAILED", "Ma'lumotni saqlab bo'lmadi.", error.message);
      }
    },
    remove(key) {
      if (typeof key !== "string" || !key.trim()) {
        return reportError("INVALID_STORAGE_KEY", "Ma'lumot kaliti noto'g'ri.");
      }
      try {
        global.localStorage.removeItem(PREFIX + key);
        emit(EVENTS.storageChanged, { key, removed: true });
        return { ok: true };
      } catch (error) {
        return reportError("STORAGE_REMOVE_FAILED", "Mahalliy ma'lumotni o'chirib bo'lmadi.", error.message);
      }
    }
  });

  // Legacy localStorage: faqat ko'rish va foydalanuvchi aniq chaqirganda zaxiralash.
  const LEGACY_KEYS = Object.freeze([
    "projects", "investmentApplications", "investmentOffers", "investorRequests",
    "jobApplications", "teamApplications", "resourceOrders", "ideaLabExchangeItems",
    "offers", "userProfile", "ideaLabSpecialists", "ideaLabProfile", "ideaLabCurrentUser",
    "teams", "jobs", "specialists", "profile", "investors", "offerApplications", "offerMessages"
  ]);

  const legacy = Object.freeze({
    keys: LEGACY_KEYS,
    read(key, fallback = null) {
      if (!LEGACY_KEYS.includes(key)) {
        return reportError("UNKNOWN_LEGACY_KEY", "Ruxsat etilmagan eski ma'lumot kaliti bor.");
      }
      try {
        const raw = global.localStorage.getItem(key);
        if (raw === null) return fallback;
        return JSON.parse(raw);
      } catch (error) {
        reportError("LEGACY_READ_FAILED", "Eski ma'lumotni o'qib bo'lmadi.", { key, cause: error.message });
        return fallback;
      }
    },
    write(key, value) {
      if (!LEGACY_KEYS.includes(key)) {
        return reportError("UNKNOWN_LEGACY_KEY", "Ruxsat etilmagan eski ma'lumot kaliti bor.");
      }
      try {
        global.localStorage.setItem(key, JSON.stringify(value));
        emit("legacy:changed", { key, operation: "write", at: new Date().toISOString() });
        return { ok: true };
      } catch (error) {
        return reportError("LEGACY_WRITE_FAILED", "Eski ma'lumot kalitiga saqlab bo'lmadi.", { key, cause: error.message });
      }
    },
    inspect(keys = LEGACY_KEYS) {
      if (!Array.isArray(keys)) return reportError("INVALID_LEGACY_KEYS", "Eski kalitlar ro'yxati noto'g'ri.");
      const selected = [...new Set(keys)];
      const unknown = selected.filter((key) => !LEGACY_KEYS.includes(key));
      if (unknown.length) return reportError("UNKNOWN_LEGACY_KEY", "Ruxsat etilmagan eski ma'lumot kaliti bor.");
      try {
        const items = selected.map((key) => {
          const raw = global.localStorage.getItem(key);
          if (raw === null) return { key, exists: false, validJson: null, itemCount: 0, valueType: null };
          try {
            const value = JSON.parse(raw);
            return {
              key, exists: true, validJson: true,
              itemCount: Array.isArray(value) ? value.length : (value && typeof value === "object" ? Object.keys(value).length : 1),
              valueType: Array.isArray(value) ? "array" : (value === null ? "null" : typeof value)
            };
          } catch (_) {
            return { key, exists: true, validJson: false, itemCount: null, valueType: "invalid-json" };
          }
        });
        return { ok: true, items, totalFound: items.filter((item) => item.exists).length };
      } catch (error) {
        return reportError("LEGACY_INSPECT_FAILED", "Eski ma'lumotlarni tekshirib bo'lmadi.", error.message);
      }
    },
    createBackup(keys) {
      if (!Array.isArray(keys) || keys.length === 0) {
        return reportError("BACKUP_KEYS_REQUIRED", "Zaxira uchun kalitlar ro'yxatini aniq ko'rsating.");
      }
      const selected = [...new Set(keys)];
      const unknown = selected.filter((key) => !LEGACY_KEYS.includes(key));
      if (unknown.length) return reportError("UNKNOWN_LEGACY_KEY", "Ruxsat etilmagan eski ma'lumot kaliti bor.");
      try {
        const records = {};
        selected.forEach((key) => {
          const raw = global.localStorage.getItem(key);
          if (raw !== null) records[key] = raw;
        });
        const backupId = createId();
        const snapshot = {
          id: backupId,
          createdAt: new Date().toISOString(),
          source: "localStorage",
          records
        };
        const saved = store.set("migration.backup." + backupId, snapshot);
        if (!saved.ok) return saved;
        return { ok: true, backupId, backedUpKeys: Object.keys(records), recordCount: Object.keys(records).length };
      } catch (error) {
        return reportError("LEGACY_BACKUP_FAILED", "Zaxira nusxa yaratilmadi; eski ma'lumotlar o'zgartirilmadi.", error.message);
      }
    },
    readBackup(backupId) {
      if (typeof backupId !== "string" || !backupId.trim()) {
        return reportError("BACKUP_ID_REQUIRED", "Zaxira ID raqami kerak.");
      }
      const snapshot = store.get("migration.backup." + backupId, null);
      return snapshot ? { ok: true, snapshot } : { ok: false, error: { code: "BACKUP_NOT_FOUND", message: "Zaxira topilmadi." } };
    }
  });

  function createId() {
    if (global.crypto && typeof global.crypto.randomUUID === "function") {
      return global.crypto.randomUUID();
    }
    return "il-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function formatDate(value, locale = "uz-UZ") {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "Sana ko'rsatilmagan";
    return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(date);
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  function isValidPhone(value) {
    const digits = String(value || "").replace(/\D/g, "");
    return digits.length >= 9 && digits.length <= 15;
  }

  function statusLabel(group, value) {
    return STATUS[group]?.[value] || "Noma'lum holat";
  }

  function currentProfile() {
    const profile = legacy.read("userProfile", null);
    if (!profile || typeof profile !== "object" || !profile.id) return null;
    return profile;
  }

  const identity = Object.freeze({
    current: currentProfile,
    stamp(record, role = "applicant") {
      if (!record || typeof record !== "object") {
        return reportError("INVALID_IDENTITY_RECORD", "Yozuv obyekti noto'g'ri.");
      }
      const profile = currentProfile();
      if (!profile) return { ...record };
      const fields = role === "owner"
        ? { ownerId: profile.id, ownerName: profile.fullName || "", ownerEmail: profile.email || "" }
        : { applicantId: profile.id, applicantName: record.applicantName || profile.fullName || "", applicantEmail: profile.email || "", applicantPhone: record.applicantPhone || profile.phone || "" };
      return { ...record, ...fields };
    },
    matches(record, role = "owner") {
      const profile = currentProfile();
      if (!profile || !record || typeof record !== "object") return false;
      const idField = role === "owner" ? "ownerId" : "applicantId";
      if (record[idField] && String(record[idField]) === String(profile.id)) return true;
      const emailField = role === "owner" ? "ownerEmail" : "applicantEmail";
      return Boolean(profile.email && record[emailField] &&
        String(record[emailField]).trim().toLowerCase() === String(profile.email).trim().toLowerCase());
    }
  });


  // Shared platform foundation: client-side quality helpers only.
  // These checks improve UX but never replace server validation or RLS.
  const APPLICATION_TRANSITIONS = Object.freeze({
    submitted: Object.freeze(["reviewing", "interview", "accepted", "rejected", "withdrawn"]),
    reviewing: Object.freeze(["interview", "accepted", "rejected", "withdrawn"]),
    interview: Object.freeze(["accepted", "rejected", "withdrawn"]),
    accepted: Object.freeze(["negotiating", "agreed", "cancelled"]),
    negotiating: Object.freeze(["agreed", "rejected", "cancelled"]),
    agreed: Object.freeze(["in_progress", "cancelled"]),
    in_progress: Object.freeze(["completed", "cancelled"]),
    completed: Object.freeze([]),
    rejected: Object.freeze([]),
    withdrawn: Object.freeze([]),
    cancelled: Object.freeze([])
  });

  function safeJsonParse(raw, fallback = null) {
    if (typeof raw !== "string") return fallback;
    try { return JSON.parse(raw); } catch (_) { return fallback; }
  }

  function cleanText(value, maxLength = 5000) {
    if (typeof value !== "string") return "";
    return value.replace(/[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]/g, "").trim().slice(0, Math.max(0, maxLength));
  }

  function isValidMoney(value, options = {}) {
    const amount = typeof value === "number" ? value : Number(String(value ?? "").replace(/\\s/g, "").replace(",", "."));
    const maximum = Number.isFinite(options.maximum) ? options.maximum : 1e12;
    return Number.isFinite(amount) && amount >= 0 && amount <= maximum && Number.isSafeInteger(Math.round(amount * 100));
  }

  function isValidIsoDate(value) {
    if (typeof value !== "string" || !/^\\d{4}-\\d{2}-\\d{2}(?:T\\d{2}:\\d{2}(?::\\d{2}(?:\\.\\d{1,3})?)?(?:Z|[+-]\\d{2}:\\d{2})?)?$/.test(value)) return false;
    return !Number.isNaN(Date.parse(value));
  }

  function validateFields(record, rules = {}) {
    const errors = {};
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      return { valid: false, errors: { _form: "Ma’lumot formati noto‘g‘ri." } };
    }
    Object.entries(rules).forEach(([field, rule]) => {
      const value = record[field];
      const label = rule.label || field;
      if (rule.required && (value === undefined || value === null || String(value).trim() === "")) {
        errors[field] = label + " majburiy.";
      } else if (value !== undefined && value !== null && value !== "") {
        if (rule.type === "text" && (typeof value !== "string" || value.trim().length < (rule.minLength || 0) || value.length > (rule.maxLength || 5000))) {
          errors[field] = label + " matn uzunligi noto‘g‘ri.";
        } else if (rule.type === "email" && !isValidEmail(value)) {
          errors[field] = label + " email formati noto‘g‘ri.";
        } else if (rule.type === "phone" && !isValidPhone(value)) {
          errors[field] = label + " telefon formati noto‘g‘ri.";
        } else if (rule.type === "money" && !isValidMoney(value, rule)) {
          errors[field] = label + " miqdori noto‘g‘ri.";
        } else if (rule.type === "date" && !isValidIsoDate(value)) {
          errors[field] = label + " sanasi noto‘g‘ri.";
        } else if (rule.type === "enum" && (!Array.isArray(rule.values) || !rule.values.includes(value))) {
          errors[field] = label + " qiymati ruxsat etilmagan.";
        }
      }
    });
    return { valid: Object.keys(errors).length === 0, errors };
  }

  function normalizeApiError(input, status) {
    const source = input && typeof input === "object" ? input : {};
    const nested = source.error && typeof source.error === "object" ? source.error : source;
    const known = new Set(["AUTH_REQUIRED", "FORBIDDEN", "NOT_FOUND", "VALIDATION_ERROR", "CONFLICT", "RATE_LIMITED", "NETWORK_ERROR", "BACKEND_NOT_CONFIGURED", "BACKEND_UNAVAILABLE", "UNKNOWN_ERROR"]);
    let code = typeof nested.code === "string" && known.has(nested.code) ? nested.code : "UNKNOWN_ERROR";
    if (status === 401) code = "AUTH_REQUIRED";
    else if (status === 403) code = "FORBIDDEN";
    else if (status === 404) code = "NOT_FOUND";
    else if (status === 409) code = "CONFLICT";
    else if (status === 422) code = "VALIDATION_ERROR";
    else if (status === 429) code = "RATE_LIMITED";
    else if (status >= 500) code = "BACKEND_UNAVAILABLE";
    const messages = {
      AUTH_REQUIRED: "Davom etish uchun tizimga kiring.",
      FORBIDDEN: "Bu amal uchun ruxsat yo‘q.",
      NOT_FOUND: "So‘ralgan ma’lumot topilmadi.",
      VALIDATION_ERROR: "Kiritilgan ma’lumotlarni tekshiring.",
      CONFLICT: "Ma’lumot yangilangan yoki takroriy so‘rov yuborilgan.",
      RATE_LIMITED: "So‘rovlar soni chegaralandi. Birozdan keyin urinib ko‘ring.",
      NETWORK_ERROR: "Tarmoq bilan aloqa yo‘q. Kiritilgan ma’lumotni saqlab, qayta urinib ko‘ring.",
      BACKEND_NOT_CONFIGURED: "Server hali sozlanmagan. Demo rejimida ishlayapsiz.",
      BACKEND_UNAVAILABLE: "Server vaqtincha ishlamayapti.",
      UNKNOWN_ERROR: "Kutilmagan xatolik yuz berdi."
    };
    const fields = nested.fields && typeof nested.fields === "object" && !Array.isArray(nested.fields) ? nested.fields : {};
    return { code, message: messages[code], fields, requestId: typeof nested.requestId === "string" ? cleanText(nested.requestId, 100) : "" };
  }

  function normalizePagination(input = {}) {
    const page = Math.max(1, Math.floor(Number(input.page) || 1));
    const pageSize = Math.min(100, Math.max(1, Math.floor(Number(input.pageSize) || 20)));
    const total = Math.max(0, Math.floor(Number(input.total) || 0));
    const totalPages = Math.ceil(total / pageSize);
    return { page: totalPages ? Math.min(page, totalPages) : 1, pageSize, total, totalPages, hasPrevious: totalPages > 0 && page > 1, hasNext: totalPages > 0 && page < totalPages };
  }

  function canTransitionApplication(application, nextStatus, actorId, targetOwnerId) {
    if (!application || typeof application !== "object" || !actorId) return false;
    const allowed = APPLICATION_TRANSITIONS[application.status] || [];
    if (!allowed.includes(nextStatus)) return false;
    if (String(actorId) === String(application.applicantId)) return nextStatus === "withdrawn";
    if (targetOwnerId && String(actorId) === String(targetOwnerId)) {
      return ["reviewing", "interview", "accepted", "rejected"].includes(nextStatus);
    }
    return false;
  }

  const PRIVATE_PROFILE_FIELDS = Object.freeze(["email", "phone", "ownerEmail", "ownerPhone", "applicantEmail", "applicantPhone", "resume_path", "resumePath", "accessToken", "password", "roles", "role"]);
  function publicProfile(profile) {
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) return {};
    const allowed = ["id", "fullName", "profession", "skills", "experience", "education", "about", "portfolio", "location", "avatarUrl"];
    const result = {};
    allowed.forEach(key => {
      if (profile[key] !== undefined && !PRIVATE_PROFILE_FIELDS.includes(key)) result[key] = profile[key];
    });
    return result;
  }

  function createOfflineAdapter() {
    const unavailable = () => ({ ok: false, error: normalizeApiError({ code: "BACKEND_NOT_CONFIGURED" }) });
    return Object.freeze({
      mode: "offline-demo",
      authenticated: false,
      list: unavailable,
      get: unavailable,
      create: unavailable,
      updateStatus: unavailable
    });
  }

  const validation = Object.freeze({
    safeJsonParse, cleanText, isValidMoney, isValidIsoDate, validateFields,
    normalizeApiError, normalizePagination
  });
  const applications = Object.freeze({
    transitions: APPLICATION_TRANSITIONS,
    canTransition: canTransitionApplication
  });
  const privacy = Object.freeze({ publicProfile });
  const backend = Object.freeze({ createOfflineAdapter });

  const coreApi = Object.freeze({
    version: VERSION,
    environment: Object.freeze({ backend: "offline-demo", authenticated: false }),
    events: EVENTS,
    status: STATUS,
    store,
    legacy,
    identity,
    subscribe,
    emit,
    createId,
    escapeHtml,
    formatDate,
    isValidEmail,
    isValidPhone,
    statusLabel,
    storageAvailable,
    validation,
    applications,
    privacy,
    backend
  });

  Object.defineProperty(global, "IDEALAB", {
    value: coreApi,
    writable: false,
    configurable: false,
    enumerable: true
  });
})(window);
