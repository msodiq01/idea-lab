# IDEA LAB — Profil maxfiyligi va RLS auditi

Sana: 2026-11-15  
Holat: `main` dagi frontend va `supabase/schema.sql` statik auditi. SQL Supabase'ga qo'llanmagan deb hisoblanadi; bu PR hech qanday real ma'lumotni o'zgartirmaydi.

## Qisqa xulosa

**Hozirgi profil va katalog oqimini production akkauntlar uchun xavfsiz deb bo'lmaydi.** Sabab: SQL draftdagi ayrim katalog jadvallari barcha autentifikatsiyalangan foydalanuvchilarga to'liq satrni ko'rishga ruxsat beradi, satr ichida esa telefon/email kabi kontakt maydonlari bor. Shuningdek, profil egasi o'z `roles` massivini o'zi yangilashi mumkin; bu maydonni server ruxsati sifatida ishlatish mumkin emas.

## Aniqlangan xavflar

| Daraja | Joy | Aniqlangan holat | Xavfsiz qaror |
|---|---|---|---|
| Yuqori | `projects` | `Authenticated users can view projects` siyosati `using (true)`; jadvalda `owner_email` va `owner_phone` mavjud. | Ommaviy loyiha ko'rinishi uchun alohida public view/projection; kontaktlar faqat egasining roziligi va ruxsatli workflow orqali. |
| Yuqori | `specialist_profiles` | Barcha authenticated foydalanuvchilar select qila oladi; jadvalda `email` va `phone` bor. | Public mutaxassis kartasi va private kontakt ma'lumotlarini ajratish. |
| Yuqori | `teams` | Keng select siyosati; jadvalda `phone` va `telegram` bor. | Public team ma'lumotlari va a'zolarga/egaga tegishli kontaktlarni ajratish. |
| Yuqori | `investors` | Keng select siyosati; jadvalda `phone` va `telegram` bor. | Investor katalogida faqat oshkor etishga ruxsat berilgan maydonlarni chiqarish. |
| Yuqori | `job_posts` | Keng select siyosati; jadvalda `phone` bor. | Vakansiya kartasida kontaktni yashirish; murojaat yoki egasi tasdiqlagan aloqa kanali orqali ochish. |
| Yuqori | `offers`, `resources` | Keng select siyosati; `contact` maydonlari mavjud. | `contact`ni public selectdan ajratish. |
| Yuqori | `profiles.roles` | Profil egasi o'z `roles` massivini update qila oladi. Frontendda rollar checkbox bilan tanlanadi. | Buni faqat qiziqish/faoliyat teglari deb qarash. Admin, moderator, investor-verifier kabi imtiyozlar server-side alohida boshqarilsin. |
| O'rta | `project_investment_applications`, `team_applications`, `job_applications`, `resource_orders` | Ishtirokchi/egaga asoslangan select bor, lekin kontakt maydonlari yozuvlarda saqlanadi. | Faqat tegishli ishtirokchilarga ko'rsatish; log, analytics va public API'dan chiqarish. |
| O'rta | Frontend `userProfile` | `id` brauzerda yaratiladi; `email` va `phone` localStorage'da. Bu Auth UID emas. | Eski IDni faqat legacy mapping sifatida saqlash; server authorizationda ishlatmaslik. |
| O'rta | `identity.matches()` | ID mos kelmasa email mosligi bilan ham yozuvni joriy profilga bog'laydi. | Faqat local demo ko'rsatish uchun; server ruxsati yoki migratsiya egasini aniqlash uchun hech qachon ishlatmaslik. |

## Tasdiqlangan frontend xatti-harakati

- Profil `userProfile` kalitida saqlanadi.
- `userProfile.id` mavjud bo'lmasa, brauzerda yangi ID yaratiladi.
- `roles[]` foydalanuvchi checkboxlari orqali tanlanadi.
- `identity.stamp()` ariza/yozuvlarga profil ID, ism, email va ayrim holatlarda telefonni qo'shishi mumkin.
- `identity.matches()` email fallback ishlatadi.
- Avatar `avatarData` sifatida base64 ko'rinishida localStorage'ga saqlanadi.
- Profil ma'lumotlari qurilmalar orasida avtomatik sinxronlanmaydi.

## Tavsiya etiladigan tuzatish arxitekturasi

1. **Public projection:** har bir katalog uchun aniq ruxsat etilgan maydonlar ro'yxati. `email`, `phone`, `telegram`, `contact`, private bio va fayl yo'llari default bo'yicha chiqarilmaydi.
2. **Private contact:** aloqa ma'lumotlari alohida jadval yoki private view'da; faqat egasi va tegishli ariza ishtirokchilari uchun RLS.
3. **Role separation:** `profile_tags` (foydalanuvchi tanlaydi) va `platform_roles` (faqat server/admin boshqaradi) tushunchalarini ajratish. Foydalanuvchi o'zi privileged rol bera olmaydi.
4. **Identity:** barcha server yozuvlari `auth.uid()` bilan bog'lanadi. `legacy_profile_id` alohida, tasdiqlangan mapping bo'ladi.
5. **Avatar:** base64 o'rniga private/public Storage siyosati bilan object path; faylga kirish ham RLS yoki signed URL bilan nazorat qilinadi.
6. **Staging test:** ikki alohida akkaunt bilan katalog select, kontakt maxfiyligi, ariza ishtirokchilari, rolni oshirishga urinish, logout va session expiry testlari.

## Keyingi implementatsiya tartibi

1. Public/private field matrixni har bir jadval uchun tasdiqlash.
2. SQL'da public view/projection va private contact access siyosatini yozish.
3. RLS testlarini staging Supabase'da ikki akkaunt bilan bajarish.
4. Frontend kataloglarini public projectionga moslash.
5. Faqat shundan keyin Auth va server ma'lumotlarini ulash.

## Ushbu PR doirasi

- Faqat audit hujjati va statik regressiya testlari.
- SQL policy, jadval, frontend sahifalari va localStorage ma'lumotlari o'zgartirilmadi.
- Supabase'ga ulanish, migration yoki production xavfsizlik tasdig'i bajarilmadi.
