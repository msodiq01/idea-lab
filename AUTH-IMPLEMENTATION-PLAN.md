# IDEA LAB — Auth implementatsiya bosqichlari

Sana: 2026-11-15  
Holat: email/parol va telefon/SMS UI hamda adapter tayyor; real loyiha bilan ulanish hozircha offline rejimda.

## 1. Hozir qo'shilgan imkoniyat

`assets/idea-auth.js` yagona Auth adapter interfeysini beradi:

- `configure(config, sdk)` — faqat aniq `mode: "supabase"`, HTTPS Supabase project URL va public anon/publishable key bilan SDK mijozini yaratadi.
- `getStatus()` — `offline-demo` yoki `supabase` konfiguratsiya holatini qaytaradi.
- `getSession()`, `signUp()`, `signIn()`, `signOut()` — Supabase Auth operatsiyalariga xavfsiz wrapper.
- `resetPassword(email, redirectTo)` — email orqali tiklash xatini so'raydi; email va HTTPS redirect manzilini tekshiradi.
- `updatePassword(password)` — faqat adapterda tasdiqlangan sessiya mavjud bo'lsa yangi parolni yuboradi.
- `onAuthStateChange()` obyekti `unsubscribe()` yordamchisini ham beradi.
- `onAuthStateChange(callback)` — session holati o'zgarishini kuzatadi.
- `sendPhoneSignupOtp(phone)` / `sendPhoneLoginOtp(phone)` — telefon uchun SMS OTP so'raydi; signup yangi akkaunt yaratishga ruxsat beradi, login esa bermaydi.
- `verifyPhoneOtp(phone, token)` — telefon raqami va 6 xonali SMS kodni tekshiradi.

`auth.html` sahifasida email/parol va telefon/SMS usullari mavjud. Supabase JS SDK sahifada versiyasi mahkamlangan CDN orqali yuklanadi; `assets/idea-config.js` esa hozircha `offline-demo` holatida. Adapter mavjud profil yoki localStorage yozuvlarini o'zgartirmaydi.

## 2. Konfiguratsiya shartnomasi

Brauzer konfiguratsiyasi keyinchalik alohida deploy sozlamasidan berilishi mumkin:

```js
window.IDEALAB_CONFIG = {
  mode: "supabase",
  url: "https://YOUR_PROJECT_REF.supabase.co",
  anonKey: "YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY"
};
```

Bu faqat namuna. Haqiqiy qiymatlar Git repository'ga yozilmasin. Brauzerda faqat public anon/publishable key bo'lishi mumkin. `service_role`, database password, JWT secret va boshqa maxfiy kalitlar hech qachon frontendga berilmaydi.

## 3. Identifikatsiya qoidalari

1. Serverdagi yagona autentifikatsiya identifikatori — Supabase Auth `auth.users.id`.
2. `profiles.id` Auth UID bilan bir xil bo'lishi kerak.
3. Hozirgi `userProfile.id` faqat legacy identifikator; Auth UID sifatida ishlatilmaydi.
4. Legacy profilni yangi akkauntga bog'lash faqat foydalanuvchi egaligini tasdiqlagach va alohida mapping jarayonida bajariladi.
5. Email mosligi server ruxsatini belgilamaydi.
6. UI'dagi foydalanuvchi tanlaydigan role/interests privileged permissions emas.

## 4. Keyingi implementatsiya ketma-ketligi

| Bosqich | Ish | Qabul mezoni |
|---|---|---|
| A | Supabase staging project egasi va ref tasdiqlash | Production emasligi aniq |
| B | Public config va SDK yuklash usulini belgilash | Secret frontendga chiqmaydi |
| C | Email va telefon OTP login/signup/reset UI | Validatsiya, xatolar va session holati sinovdan o'tgan |
| D | Profile upsert trigger/policy tekshiruvi | `profiles.id = auth.uid()` |
| E | Legacy profile link flow | Egalik isboti va takroriy mapping himoyasi |
| F | Ikki akkauntli RLS sinovlari | Boshqa foydalanuvchi ma'lumoti yopiq |
| G | Avatar Storage va privacy | Faqat ruxsatli object access |
| H | Stagingdan keyin production qarori | Backup, rollback va aniq tasdiq |

## 5. Hozircha ataylab qilinmagan ishlar

- Haqiqiy Supabase URL va public kalit hali kiritilmadi.
- SMS provayder va email SMTP hali sozlanmadi.
- Haqiqiy URL yoki kalit kiritilmadi.
- SQL migration ishga tushirilmadi.
- Legacy profil va boshqa localStorage ma'lumotlari ko'chirilmadi yoki o'chirilmadi.
- Server authorization yoqildi deb da'vo qilinmaydi.

## 6. Tekshiruv

`tests/auth-adapter.test.cjs` offline holat, noto'g'ri konfiguratsiya, SDK yo'qligi, signup/login, parolni tiklash validatsiyasi, xavfsiz redirect, parol yangilash sharti, sign-out holati, listener unsubscribe va xatolarni tozalashni tekshiradi. Bu avtomatlashtirilgan unit test; jonli Supabase yoki brauzer staging sinovi emas.
