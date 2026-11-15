# IDEA LAB — Supabase xavfsizlik ko'rigi

Sana: 2026-11-15  
Ko'rilgan fayllar: `supabase/schema.sql`, `supabase/migrations/20261115_security_hardening.sql`.  
Holat: statik kod ko'rigi; jonli Supabase loyihasida bajarilmagan.

## Ijobiy himoyalar

- Asosiy jadvallarda Row Level Security yoqilgan.
- Owner va application participant doirasi uchun alohida policy'lar mavjud.
- Security migration kataloglar uchun kontakt maydonlarini chetlab o'tuvchi view'lar yaratadi.
- Profil `roles` maydonini oddiy foydalanuvchi o'zgartirishiga trigger to'siq qo'yadi.
- Application insert qoidalari arizachi ID'sini `auth.uid()` bilan tekshiradi.
- Draft/inactive loyiha, vakansiya, taklif va resursga yangi ariza yuborish cheklanadi.
- Task project/creator identifikatorini o'zgartirish va assignee tomonidan qayta tayinlash trigger bilan to'siladi.

## Tekshirish talab qilinadigan nuqtalar

1. Public view'lar `security_invoker=false` bilan owner huquqida ishlaydi. Bu maxfiy ustunlarni ataylab chiqarib tashlashga tayangan. View egasining vakolati, `search_path`, view grantlari va RLS bypass holati test bazada tekshirilsin.
2. `teams_public` view barcha jamoalarni chiqaradi; teams jadvalida status yo'q. Yopiq yoki shaxsiy jamoa tushunchasi qo'shilsa, view'ga visibility/status filtri kerak.
3. Application status update policy'lari target ownerga update beradi. Qaysi ustunlarni o'zgartira olishi, applicant ID va target FK o'zgarmasligi alohida sinovdan o'tsin.
4. `resource_orders` va boshqa application jadvallarida status o'tishlari hozir to'liq state machine emas; server-side transition qo'shilishi kerak.
5. `profiles` jadvalidagi `phone` maydoni oddiy profil ustunida turibdi. Telefon public view'ga chiqarilmagan, ammo alohida contact jadvaliga ajratish keyingi yaxshilanish.
6. RLS policy'larida mavjud va yangi policy nomlari, grants hamda default privileges staging'da qayta ko'rilsin.
7. `offer_messages` sender va application participant shartlari ikki akkauntli test bilan tekshirilsin.

## Majburiy xavfsizlik sinovlari

- User A User B profilini yoki application'ini o'qiy olmaydi.
- Applicant target egasi bo'lib ko'rinmaydi va o'z arizasini qabul qila olmaydi.
- Target owner boshqa targetga tegishli arizani o'zgartira olmaydi.
- Anon roli public view'larni o'qiy olmaydi; authenticated foydalanuvchi faqat belgilangan ustunlarni ko'radi.
- Draft targetga application insert rad etiladi.
- Assignee task project_id, created_by yoki assigned_to qiymatini o'zgartira olmaydi.
- Oddiy user o'z roles maydonini o'zgartira olmaydi.

## Cheklov

Bu ko'rik penetration test emas, jonli DB audit emas va migration'ni bajarishga ruxsat bermaydi. Supabase project ref va backup hali tasdiqlanmagan.


## 2026-11-15 — ulangan Supabase loyihasida jonli read-only tekshiruv

Ushbu tekshiruv Supabase MCP orqali loyiha holati, public schema, migration tarixi, RLS policy'lari, API grantlari va advisor natijalarini o‘qish bilan bajarildi. Hech qanday SQL o‘zgartirish, migration, foydalanuvchi yaratish yoki Auth sozlamasini almashtirish bajarilmadi.

### Tasdiqlangan holat
- Supabase loyiha holati: `ACTIVE_HEALTHY`; PostgreSQL 17.11.
- `public` sxemasida 9 ta jadval bor: `profiles`, `user_roles`, `resource_types`, `resources`, `resource_accounts`, `investments`, `money_transfers`, `transfer_allocations`, `audit_logs`.
- Ushbu 9 jadvalning barchasida RLS yoqilgan.
- Database migration tarixida 4 ta migration qo‘llangan: foundation schema, foundation hardening, internal function restriction va RLS/grants.
- `anon` va `authenticated` rollariga berilgan jadval grantlari faqat SELECT bo‘ldi. Hozircha client orqali INSERT/UPDATE/DELETE huquqi yo‘q; shu sababli real yozish oqimlari ataylab ishga tushmagan.
- `audit_logs` jadvalida RLS yoqilgan, lekin client policy yo‘q. Bu client uchun barcha qatorlarni yopiq qoldiradi; advisor buni INFO sifatida ko‘rsatadi.
- Security advisor boshqa topilma qaytarmadi. Performance advisor 18 ta ishlatilmagan indeksni qayd etdi; jadvallar hozir bo‘sh/traffic yo‘qligi sababli ularni shoshilinch o‘chirish kerak emas.
- Edge Functions ro‘yxati bo‘sh.
- Supabase Auth provayderlari, SMTP va SMS provider sozlamalari ushbu ulangan boshqaruv vositalari orqali o‘qilmadi; ular sozlangan deb hisoblanmaydi.


### Qo‘shimcha DB obyektlari tekshiruvi
- `public` sxemasida SQL view topilmadi. Demak, hozircha maxsus public katalog view'lari yaratilmagan.
- `public` sxemasida ikki trigger funksiyasi topildi: `handle_new_user_profile` va `set_updated_at`.
- `handle_new_user_profile` faqat `auth.users` insert triggeriga biriktirilgan; `SECURITY DEFINER` ishlatadi, lekin `search_path` bo‘sh qilib belgilangan va jadvalga murojaat `public.profiles` deb to‘liq ko‘rsatilgan.
- Ikkala funksiyada ham `anon` va `authenticated` uchun EXECUTE huquqi yo‘q; huquq faqat `postgres` va `service_role` da.
- Profil triggeri `raw_user_meta_data` dan faqat ism maydonini oladi; bu ma’lumot ruxsat/rol qarorida ishlatilmaydi.

### Keyingi xavfsiz qadamlar
1. Email confirmation, password reset uchun Site URL va aniq redirect allowlist sozlamalarini Supabase Auth dashboardida tekshirish.
2. Telefon OTP uchun Auth Phone provider va SMS gateway sozlamalarini alohida tasdiqlash.
3. Staging akkauntlar bilan ikki foydalanuvchili RLS testlarini bajarish.
4. Har bir jadval uchun ustun darajasidagi ruxsat va server-side status transition qoidalarini tasdiqlashdan oldin frontendga backend write imkoniyatini bermaslik.

**Xulosa:** Supabase loyihasi mavjud va sog‘lom, lekin IDEA LAB hozircha xavfsiz read-only/backend-draft holatida. Bu jonli foydalanuvchilar uchun tayyor ishlab chiqarish tizimi degani emas.
