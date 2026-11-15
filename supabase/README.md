# Supabase tayyorlash

Bu papkadagi SQL — IDEA LAB umumiy backendini tayyorlash uchun. Ulangan Supabase loyihasi mavjud, ammo hozirgi frontend hali offline-demo rejimida va ushbu papkadagi keng schema/migrationlar jonli bazaga qo‘llanmagan.

## Migrationlar tartibi va holati

- `migrations/20261116120000_idea_app_identity_organizations.sql` — IDEA LAB uchun alohida `idea_app` sxemasida profil, maxfiy kontakt, tashkilot va tashkilot a'zoligi poydevori. **Repository draft; Supabase'ga qo'llanmagan.** RLS yoqilgan, browser rollariga grant va policy berilmagan.
- `schema.sql` — avvalgi umumiy schema loyihasi; jonli `public` sxemaga qo'llash taqiqlanadi.
- `migrations/20261115_security_hardening.sql` va keyingi supplier/application migrationlari — alohida arxitektura va staging tekshiruvini talab qiladi; ularni ushbu yangi migration bilan avtomatik qo'llangan deb hisoblamang.

## Birinchi migration qarorlari

- Mavjud `public` jadvallariga tegilmaydi; barcha yangi obyektlar `idea_app` ichida.
- `profiles.user_id` va tashkilot a'zolari `auth.users(id)` ga bog'lanadi.
- Profil roli yoki admin vakolati profil maydonlarida saqlanmaydi.
- Aloqa ma'lumotlari alohida `profile_contacts` jadvalida.
- Tashkilot egasi `organizations.owner_id`; a'zolik rollari faqat `admin`, `editor`, `member`.
- Barcha to'rt jadvalda RLS yoqilgan. Policy va browser grantlari ataylab yo'q: hozircha browser/Data API orqali hech kim kira olmaydi.
- `idea_app` Data API exposed schema ro'yxatiga qo'shilmagan va qo'shilmasligi kerak, toki keyingi RLS va ikki foydalanuvchili sinovlar tugamaguncha.

## Ishga tushirishdan oldin

- To'g'ri Supabase project ref va uning egasi tasdiqlansin.
- Mavjud baza bo'lsa, backup va restore imkoniyati tasdiqlansin.
- Migration SQL'ni ko'rmasdan production'da Run bosmang.
- Avval alohida staging muhitida qo'llab, metadata, RLS va ikki foydalanuvchi testlarini bajaring.
- Ushbu migration hozircha jonli `idea-lab` loyihasiga qo'llanmaydi.

## Kalitlar

Faqat frontend uchun mo'ljallangan publishable/anon key ishlatilishi mumkin. Service-role key, database password va access token hech qachon HTML, JS, GitHub repository yoki brauzerga kiritilmaydi.

## Hozirgi holat

- Jonli Supabase loyiha read-only audit uchun mavjud.
- Jonli loyihaning avvalgi 9 ta `public` jadvali alohida resurs/investitsiya poydevori; ushbu yangi ilova sxemasi ulardan ajratilgan.
- Frontend `offline-demo` rejimida qoladi.
- Auth provider, SMTP, SMS, Data API exposure va frontend ulanish sozlamalari o'zgartirilmagan.
- LocalStorage import qilinmagan.
