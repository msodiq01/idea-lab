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
