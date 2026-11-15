# IDEA LAB — Jonli Supabase sxemasi va integratsiya mosligi

Audit sanasi: 2026-11-16  
Loyiha: mavjud `idea-lab` Supabase loyihasi  
Holat: **faqat metadata/read-only tekshiruv; hech qanday SQL o‘zgarishi bajarilmadi.**

## 1. Muhim xulosa

IDEA LAB repository'sidagi ilova sxemasi bilan ulangan Supabase bazasidagi amaldagi sxema **bir xil emas**. Shu sababli `supabase/schema.sql` yoki repository migratsiyalarini hozirgi bazaga to‘g‘ridan-to‘g‘ri qo‘llash mumkin emas. Bu hujjat integratsiya uchun majburiy to‘siq (compatibility gate) hisoblanadi.

## 2. Jonli bazada tasdiqlangan holat

Read-only metadata auditida `public` sxemasida quyidagi 9 jadval topildi:

| Jadval | RLS |
|---|---|
| `profiles` | yoqilgan |
| `user_roles` | yoqilgan |
| `resource_types` | yoqilgan |
| `resources` | yoqilgan |
| `resource_accounts` | yoqilgan |
| `investments` | yoqilgan |
| `money_transfers` | yoqilgan |
| `transfer_allocations` | yoqilgan |
| `audit_logs` | yoqilgan |

Audit vaqtida faqat `resource_types` jadvalida 5 ta boshlang‘ich yozuv bor edi; qolgan sakkiz jadval bo‘sh edi. Bu hisoblar keyingi o‘zgarishlarni ifodalamaydi.

Jonli migration tarixida 4 ta yozuv bor:

- `20261115180838 — idea_lab_foundation_schema_v1`
- `20261115180902 — idea_lab_foundation_hardening_v1`
- `20261115180930 — idea_lab_restrict_internal_functions_v1`
- `20261115181211 — idea_lab_rls_and_grants_v1`

## 3. Repository ilova sxemasi

Repository'dagi `supabase/schema.sql` esa 18 ta ilova jadvalini belgilaydi:

`profiles`, `projects`, `teams`, `job_posts`, `specialist_profiles`, `offers`, `investors`, `resources`, `project_investment_applications`, `team_applications`, `job_applications`, `offer_applications`, `offer_messages`, `resource_orders`, `project_members`, `project_tasks`, `project_updates`, `events`, `event_registrations`.

Ro‘yxatda `profiles` va `resources` nomlari o‘xshash bo‘lsa-da, nomning bir xil bo‘lishi ustunlar, cheklovlar, ma’no yoki RLS mosligini anglatmaydi.

## 4. Aniqlangan muhim nomuvofiqliklar

- Jonli `profiles` jadvalida `status` bor, repository sxemasida esa `roles` massivi bor. Bu ikkisi bir-birining o‘rnini bosmaydi.
- Jonli `resources` jadvali `owner_id`, `resource_type_id`, `parent_resource_id`, `visibility`, `target_amount` va resurs holatlari bilan resurs/investitsiya modeliga tegishli.
- Repository `resources` jadvali esa `title`, `category`, `price`, `contact`, `metadata` va boshqa ilova katalog maydonlariga mo‘ljallangan.
- Jonli bazada `projects`, `teams`, `job_posts`, `specialist_profiles`, `offers`, `investors` va ilova arizalari jadvallari topilmadi.
- Jonli bazadagi barcha jadvallarda RLS yoqilgan. Client rollariga yozish ruxsatlari siyosat va table grantlari bilan alohida tekshirilishi kerak; oldingi auditda client INSERT/UPDATE/DELETE grantlari berilmagani qayd etilgan.

## 5. Auth va frontend holati

- `assets/idea-config.js` ataylab `offline-demo` holatida qoladi.
- Brauzerga faqat public anon/publishable kalit berilishi mumkin. Service-role yoki boshqa maxfiy kalit frontendga kiritilmaydi.
- Email confirmation/reset uchun SMTP va telefon OTP uchun SMS provider hamda Auth sozlamalari kerak.
- Auth UI yoki unit testlarning mavjudligi jonli login, profil yaratish yoki RLS xavfsizligi tasdiqlanganini anglatmaydi.
- Legacy localStorage profillari Auth UID bilan avtomatik bog‘lanmaydi; egalikni tasdiqlash va alohida mapping jarayoni talab qilinadi.

## 6. Hozir bajarilmasligi kerak bo‘lgan ishlar

1. `supabase/schema.sql` ni jonli SQL Editor'ga to‘liq joylash.
2. Repository migratsiyalarini jonli migration tarixiga tekshirmasdan qo‘llash.
3. Mavjud `profiles` yoki `resources` jadvallarini drop/rename/recreate qilish.
4. Frontendni `mode: "supabase"` ga o‘tkazish yoki real foydalanuvchi yozuvlarini yoqish.
5. Ikki foydalanuvchili RLS sinovini ishlab turgan yagona loyiha ustida o‘tkazish.

## 7. Keyingi xavfsiz ketma-ketlik

1. Jonli sxema uchun qayta tiklanadigan, versiyalangan baseline olish; migration history va repository SQL'ni birma-bir solishtirish.
2. Mavjud 9 jadvalni saqlagan holda, ilova uchun alohida nomlangan jadval va FK dizaynini ishlab chiqish. `profiles` va `resources` kabi nomlar bo‘yicha qaror alohida qabul qilinadi.
3. Har bir yangi jadval uchun RLS, table grants, indekslar va ikki-foydalanuvchi test matritsasini oldindan tayyorlash.
4. Alohida staging muhiti mavjud bo‘lgandagina migration va Auth oqimini sintetik ma’lumotlar bilan sinash.
5. Staging sinovlari muvaffaqiyatli bo‘lgachgina backup/rollback rejasi va aniq rozilik bilan live rollout haqida qaror qilish.

## 8. Qabul mezoni

Bu compatibility gate faqat schema farqlari, Auth talablari va xavfsiz keyingi qadamlar hujjatlashtirilganini bildiradi. **Backend ulandi, Auth ishlayapti, migration qo‘llandi yoki ikki-user RLS sinovi o‘tdi degani emas.**
