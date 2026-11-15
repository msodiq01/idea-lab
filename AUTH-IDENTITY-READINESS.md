# IDEA LAB — Auth va foydalanuvchi identifikatsiyasi auditi

Sana: 2026-11-15  
Holat: statik kod auditi; Auth providerga ulanish yoki ma'lumot o'zgartirish amalga oshirilmadi.

## 1. Tasdiqlangan hozirgi holat

- Alohida login/registration/auth HTML sahifasi topilmadi; HTML/JS fayllar ichida hozirgi oqim profilni yaratish/tahrirlashga asoslangan.
- `profile.html` foydalanuvchi profilini `userProfile` localStorage kalitiga yozadi.
- Profilning `id` qiymati avvalgi profil IDsi saqlanadi, aks holda `IDEALAB.createId()` yoki timestamp asosida browserda yaratiladi.
- Profil maydonlari: `id`, `fullName`, `email`, `phone`, `roles[]`, `primaryGoal`, `bio`, `skills[]`, `avatarData`, `updatedAt`.
- Profil sahifasida foydalanuvchi `roles[]` qiymatlarini checkbox orqali o‘zi belgilaydi.
- IDEA LAB core `identity.current()` orqali `userProfile`ni o‘qiydi. `identity.stamp()` application/recordga browser profile ID, ism, email va telefonni qo‘shishi mumkin.
- `identity.matches()` ID mos kelmasa email mosligi bilan ham yozuvni foydalanuvchiga bog‘laydi.
- Profil sahifasidagi xabar ma'lumotlar hozircha shu brauzerda saqlanishini aniq bildiradi.

## 2. Supabase bilan asosiy nomuvofiqlik

Supabase SQL'da `profiles.id` `auth.users(id)`ga foreign key. Ya'ni bu ustun Supabase Auth UUID bo‘lishi kerak.

Hozirgi `userProfile.id` esa browserda yaratilgan ID. U Supabase Auth UID emas. Shu sababli uni to‘g‘ridan-to‘g‘ri `profiles.id`, `projects.owner_id`, `project_investment_applications.investor_user_id` yoki boshqa auth foreign key maydonlariga yozish mumkin emas.

| Hozirgi browser profil | Kelajakdagi server modeli | Qaror |
|---|---|---|
| `id` | `profiles.id` = `auth.uid()` | Eski ID alohida `legacy_profile_id` mapping sifatida saqlansin, Auth UIDga almashtirilmasin. |
| `fullName` | `profiles.full_name` | Auth metadata yoki profil formasi orqali yangilanadi. |
| `email` | Auth email + `profiles.email` (agar schema kengaysa) | Auth provider tasdiqlagan email manbasi ustun. |
| `phone` | `profiles.phone` | Telefon tasdiqlash siyosati belgilanmaguncha faqat profil kontakti. |
| `roles[]` | server tomonidan boshqariladigan role/claims | Foydalanuvchi o‘zi privileged role tayinlay olmasligi shart. |
| `avatarData` | Supabase Storage object path | Base64 rasmni profiles jadvalida saqlamaslik; maxsus upload oqimi kerak. |
| `bio`, `skills[]`, `primaryGoal` | profile columns / JSONB | Maxfiylik va public profile maydonlari alohida ajratilsin. |

## 3. Xavfsizlik va biznes xavflari

1. **Soxta identifikatsiya:** localStorage profilini foydalanuvchi o‘zi tahrirlashi mumkin; bu login emas.
2. **Email fallback:** email o‘zgarsa yoki bir xil email yozuvi bo‘lsa, `identity.matches()` noto‘g‘ri yozuvni bog‘lashi mumkin. Serverda authorization uchun email fallback taqiqlanadi.
3. **Role self-assignment:** `roles[]` foydalanuvchi tomonidan boshqariladi. UI role checkboxlari server ruxsati hisoblanmaydi.
4. **Cross-device:** localStorage boshqa brauzer/qurilmaga ko‘chmaydi; hozirgi profil va ma'lumotlar global hisobga sinxron emas.
5. **Avatar:** `avatarData` katta Base64 matn bo‘lishi mumkin; Storage upload, MIME/size validation va signed/public URL siyosati kerak.
6. **Shaxsiy ma'lumot:** telefon/emailni katalogda ko‘rsatish mumkin emas. Public view faqat zarur display maydonlarini chiqarishi kerak.

## 4. Tavsiya etiladigan xavfsiz Auth arxitekturasi

1. Supabase Auth signup/login oqimini qo‘shish.
2. Auth sessiondan `auth.uid()` olish; browser `userProfile.id`ni server identity sifatida ishlatmaslik.
3. `profiles.id` trigger orqali `auth.users.id` bilan bog‘lash.
4. Eski browser profil uchun alohida migration mapping: `legacy_profile_id → auth_user_id`. Mapping faqat foydalanuvchi o‘z akkauntini tasdiqlaganidan keyin.
5. Role'larni oddiy profile formadan ajratish: public/user-selectable interests alohida, privileged permissions server-side admin flow orqali.
6. `identity.matches()` email fallbackini UI legacy ko‘rsatishidan chiqarib, backend authorizationdan butunlay olib tashlash.
7. Avatarni Supabase Storage'ga yuklash; profiles jadvalida faqat object path saqlash.
8. A/B test akkauntlar bilan profile privacy, role escalation, session expiry, logout va cross-user RLS testlarini bajarish.

## 5. Pilotga kirishdan oldingi blockerlar

- [ ] Auth provider va login/signup UX qarori.
- [ ] Browser legacy ID va Supabase Auth UID mapping strategiyasi.
- [ ] Role taxonomy: user-selectable role tags va privileged platform roles ajratilishi.
- [ ] Email/telefon verification talablari.
- [ ] Profile public/private field matrix.
- [ ] Avatar Storage bucket va access policy.
- [ ] Session refresh/logout va account recovery oqimi.
- [ ] RLS test planini haqiqiy staging loyihada bajarish.

## 6. Hozircha bajarilmagan ishlar

Supabase Auth yoqilmadi; schema/migration bajarilmadi; browser profil yozuvlari ko‘chirilmagan; role'lar o‘zgartirilmagan. Bu audit faqat repodagi kodni o‘qish asosida tuzildi.

**Qaror:** Auth va ID mapping hal qilinmaguncha real cross-user ariza, loyiha yaratish yoki role-based access yoqilmasin. LocalStorage demo sifatida qolishi mumkin, lekin u autentifikatsiya qilingan tizim deb taqdim etilmasin.
