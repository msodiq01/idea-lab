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
        const authError = response.error;
        const code = String(authError.code || "");
        const status = Number(authError.status || authError.statusCode || 0);
        if (code === "over_email_send_rate_limit" || status === 429) {
          return resultError("EMAIL_RATE_LIMIT", "Email yuborish limiti vaqtincha tugagan. Qayta-qayta urinmang; biroz kutib, keyin bir marta qayta urinib ko‘ring.");
        }
        if (code === "invalid_credentials") {
          return resultError("INVALID_CREDENTIALS", "Email yoki parol noto‘g‘ri. Email yozilishini tekshiring.");
        }
        if (code === "email_not_confirmed") {
          return resultError("EMAIL_NOT_CONFIRMED", "Avval emailingizga yuborilgan tasdiqlash havolasini oching.");
        }
        return resultError("AUTH_REQUEST_FAILED", "Kirish yoki ro‘yxatdan o‘tish so‘rovi bajarilmadi. Kiritilgan ma’lumotlarni tekshiring.");
      }
      return { ok: true, data: response && response.data ? response.data : null };
    } catch (_) {
      return resultError("AUTH_REQUEST_FAILED", "Auth xizmati bilan bog'lanib bo'lmadi.");
    }
  }

  const api = Object.freeze({
    configure,
    getStatus() { return status; },
    getClient() { return client && status.configured ? client : null; },
    async getSession() {
      const result = await invoke("getSession");
      if (result.ok) {
        const session = result.data && result.data.session;
        status = Object.freeze({
          mode: status.mode, configured: true,
          authenticated: Boolean(session && session.user && session.user.id),
          reason: null
        });
      }
      return result;
    },
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
    async sendPhoneOtp(phone, purpose) {
      const normalizedPhone = typeof phone === "string" ? phone.replace(/[\s()-]/g, "") : "";
      if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
        return resultError("INVALID_PHONE", "Telefon raqamini xalqaro formatda kiriting. Masalan: +998901234567.");
      }
      if (purpose !== "signup" && purpose !== "login") {
        return resultError("INVALID_PHONE_PURPOSE", "SMS so'rovi turi noto'g'ri.");
      }
      return invoke("signInWithOtp", {
        phone: normalizedPhone,
        options: { shouldCreateUser: purpose === "signup" }
      });
    },
    sendPhoneSignupOtp(phone) {
      return api.sendPhoneOtp(phone, "signup");
    },
    sendPhoneLoginOtp(phone) {
      return api.sendPhoneOtp(phone, "login");
    },
    async verifyPhoneOtp(phone, token) {
      const normalizedPhone = typeof phone === "string" ? phone.replace(/[\s()-]/g, "") : "";
      const normalizedToken = typeof token === "string" ? token.replace(/\s/g, "") : "";
      if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
        return resultError("INVALID_PHONE", "Telefon raqamini xalqaro formatda kiriting.");
      }
      if (!/^\d{6}$/.test(normalizedToken)) {
        return resultError("INVALID_OTP", "SMS orqali kelgan 6 xonali kodni kiriting.");
      }
      const result = await invoke("verifyOtp", {
        phone: normalizedPhone,
        token: normalizedToken,
        type: "sms"
      });
      if (result.ok) {
        const session = result.data && result.data.session;
        status = Object.freeze({
          mode: "supabase", configured: true,
          authenticated: Boolean(session && session.user && session.user.id),
          reason: null
        });
      }
      return result;
    },
    async resetPassword(email, redirectTo) {
      if (typeof email !== "string" || !email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return resultError("INVALID_EMAIL", "Parolni tiklash uchun to'g'ri email kiriting.");
      }
      const options = {};
      if (redirectTo !== undefined && redirectTo !== null && redirectTo !== "") {
        try {
          const target = new URL(redirectTo);
          if (target.protocol !== "https:" && target.hostname !== "localhost") {
            return resultError("INVALID_REDIRECT", "Tiklash havolasi uchun xavfsiz HTTPS manzil kerak.");
          }
          options.redirectTo = target.toString();
        } catch (_) {
          return resultError("INVALID_REDIRECT", "Tiklash manzili noto'g'ri.");
        }
      }
      return invoke("resetPasswordForEmail", email.trim(), options);
    },
    async updatePassword(password) {
      if (typeof password !== "string" || password.length < 8) {
        return resultError("INVALID_CREDENTIALS", "Yangi parol kamida 8 belgidan iborat bo'lishi kerak.");
      }
      if (!status.authenticated) {
        return resultError("AUTH_REQUIRED", "Parolni yangilash uchun akkauntga kirilgan bo'lishi kerak.");
      }
      return invoke("updateUser", { password });
    },
    async getProfileData() {
      if (!status.authenticated) {
        return resultError("AUTH_REQUIRED", "Profil ma’lumotlarini olish uchun akkauntga kirish kerak.");
      }
      const result = await invoke("getUser");
      if (!result.ok) return result;
      const user = result.data && result.data.user;
      if (!user || !user.id) return resultError("PROFILE_UNAVAILABLE", "Akkaunt profilini olish imkoni bo‘lmadi.");
      return {
        ok: true,
        data: {
          id: user.id,
          email: user.email || "",
          metadata: user.user_metadata && typeof user.user_metadata === "object" ? user.user_metadata : {}
        }
      };
    },
    async updateProfileData(profile = {}) {
      if (!status.authenticated) {
        return resultError("AUTH_REQUIRED", "Profilni serverda saqlash uchun akkauntga kiring.");
      }
      const data = {};
      const textFields = [
        ["full_name", profile.fullName, 120],
        ["phone", profile.phone, 32],
        ["profile_goal", profile.primaryGoal, 100],
        ["profile_bio", profile.bio, 2000]
      ];
      for (const [key, value, max] of textFields) {
        if (value !== undefined) {
          if (typeof value !== "string" || value.length > max) {
            return resultError("INVALID_PROFILE", "Profil maydonlaridan biri noto‘g‘ri yoki juda uzun.");
          }
          data[key] = value.trim();
        }
      }
      for (const [key, value, maxItems, maxLength] of [
        ["profile_roles", profile.roles, 10, 40],
        ["profile_skills", profile.skills, 30, 60]
      ]) {
        if (value !== undefined) {
          if (!Array.isArray(value) || value.length > maxItems ||
              value.some(item => typeof item !== "string" || item.trim().length > maxLength)) {
            return resultError("INVALID_PROFILE", "Profil ro‘yxatlaridan biri noto‘g‘ri.");
          }
          data[key] = value.map(item => item.trim()).filter(Boolean);
        }
      }
      if (!Object.keys(data).length) {
        return resultError("INVALID_PROFILE", "Saqlash uchun profil ma’lumotlari topilmadi.");
      }
      // These fields are user-editable display metadata only. Never use them for
      // authorization, roles, ownership, or RLS decisions.
      return invoke("updateUser", { data });
    },
    async signOut() {
      const result = await invoke("signOut");
      if (result.ok) {
        status = Object.freeze({ mode: status.mode, configured: true, authenticated: false, reason: null });
      }
      return result;
    },
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
      const handle = subscription && subscription.data ? subscription.data.subscription : null;
      return { ok: true, subscription: handle, unsubscribe() {
        if (handle && typeof handle.unsubscribe === "function") handle.unsubscribe();
      } };
    }
  });

  global.IDEALAB_AUTH = api;
})(typeof window !== "undefined" ? window : globalThis);
