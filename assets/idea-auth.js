/* IDEA LAB — Supabase Auth adapter
 * Safe default: offline-demo. This module does not load an SDK, read secrets,
 * modify legacy profiles, or enable authentication without explicit public config.
 * Expected browser SDK: window.supabase.createClient (Supabase JS v2).
 */
((global) => {
  "use strict";

  if (global.IDEALAB_AUTH) return;

  const OFFLINE = Object.freeze({
    mode: "offline-demo",
    configured: false,
    authenticated: false,
    reason: "BACKEND_NOT_CONFIGURED"
  });

  let client = null;
  let status = OFFLINE;

  function resultError(code, message) {
    return { ok: false, error: { code, message } };
  }

  function validConfig(config) {
    if (!config || config.mode !== "supabase") return false;
    if (typeof config.url !== "string" || typeof config.anonKey !== "string") return false;
    if (!config.url.trim() || !config.anonKey.trim()) return false;
    try {
      const parsed = new URL(config.url);
      return parsed.protocol === "https:" && parsed.hostname.endsWith(".supabase.co");
    } catch (_) {
      return false;
    }
  }

  function configure(config, sdk) {
    if (!validConfig(config)) {
      client = null;
      status = OFFLINE;
      return { ok: false, status, error: { code: "BACKEND_NOT_CONFIGURED", message: "Supabase uchun xavfsiz public konfiguratsiya topilmadi." } };
    }
    const provider = sdk || global.supabase;
    if (!provider || typeof provider.createClient !== "function") {
      client = null;
      status = OFFLINE;
      return { ok: false, status, error: { code: "SUPABASE_SDK_MISSING", message: "Supabase brauzer SDK yuklanmagan." } };
    }
    try {
      client = provider.createClient(config.url, config.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      status = Object.freeze({ mode: "supabase", configured: true, authenticated: false, reason: null });
      return { ok: true, status };
    } catch (_) {
      client = null;
      status = OFFLINE;
      return resultError("SUPABASE_INIT_FAILED", "Supabase mijozini ishga tushirib bo'lmadi.");
    }
  }

  async function invoke(method, ...args) {
    if (!client || !client.auth || typeof client.auth[method] !== "function") {
      return resultError("BACKEND_NOT_CONFIGURED", "Auth hozircha offline demo rejimida.");
    }
    try {
      const response = await client.auth[method](...args);
      if (response && response.error) {
        return resultError("AUTH_REQUEST_FAILED", "Kirish so'rovi bajarilmadi. Ma'lumotlarni tekshirib qayta urinib ko'ring.");
      }
      return { ok: true, data: response && response.data ? response.data : null };
    } catch (_) {
      return resultError("AUTH_REQUEST_FAILED", "Auth xizmati bilan bog'lanib bo'lmadi.");
    }
  }

  const api = Object.freeze({
    configure,
    getStatus() { return status; },
    getSession() { return invoke("getSession"); },
    signUp(email, password, options) {
      if (typeof email !== "string" || !email.trim() || typeof password !== "string" || password.length < 8) {
        return Promise.resolve(resultError("INVALID_CREDENTIALS", "Email va kamida 8 belgili parol kiriting."));
      }
      return invoke("signUp", { email: email.trim(), password, options: options || {} });
    },
    signIn(email, password) {
      if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password) {
        return Promise.resolve(resultError("INVALID_CREDENTIALS", "Email va parolni kiriting."));
      }
      return invoke("signInWithPassword", { email: email.trim(), password });
    },
    signOut() { return invoke("signOut"); },
    onAuthStateChange(callback) {
      if (typeof callback !== "function") {
        return { ok: false, error: { code: "INVALID_CALLBACK", message: "Callback funksiyasi kerak." } };
      }
      if (!client || !client.auth || typeof client.auth.onAuthStateChange !== "function") {
        return resultError("BACKEND_NOT_CONFIGURED", "Auth hozircha offline demo rejimida.");
      }
      const subscription = client.auth.onAuthStateChange((event, session) => {
        status = Object.freeze({
          mode: "supabase", configured: true,
          authenticated: Boolean(session && session.user && session.user.id),
          reason: null
        });
        callback({ event, session });
      });
      return { ok: true, subscription: subscription && subscription.data ? subscription.data.subscription : null };
    }
  });

  global.IDEALAB_AUTH = api;
})(typeof window !== "undefined" ? window : globalThis);
