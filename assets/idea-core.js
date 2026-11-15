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
    "teams", "teamApplications", "jobs", "jobApplications", "specialists", "profile", "investors", "offerApplications", "offerMessages"
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

  const coreApi = Object.freeze({
    version: VERSION,
    environment: Object.freeze({ backend: "offline-demo", authenticated: false }),
    events: EVENTS,
    status: STATUS,
    store,
    legacy,
    subscribe,
    emit,
    createId,
    escapeHtml,
    formatDate,
    isValidEmail,
    isValidPhone,
    statusLabel,
    storageAvailable
  });

  Object.defineProperty(global, "IDEALAB", {
    value: coreApi,
    writable: false,
    configurable: false,
    enumerable: true
  });
})(window);
