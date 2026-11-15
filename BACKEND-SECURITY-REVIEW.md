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
