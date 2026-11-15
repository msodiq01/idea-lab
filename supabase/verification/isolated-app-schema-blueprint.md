# IDEA LAB — izolyatsiyalangan ilova sxemasi blueprint'i

Versiya: 1.0  
Sana: 2026-11-16  
Holat: arxitektura taklifi; SQL qo'llanmagan, Auth sozlamalari o'zgartirilmagan.

## 1. Qaror

IDEA LAB ilovasining yangi ma'lumotlari jonli bazadagi mavjud `public` jadvallari bilan nom va ma'no jihatidan to'qnashmasligi uchun alohida `idea_app` PostgreSQL sxemasida joylashtiriladi.

- Hozirgi `public` sxemadagi 9 jadval o'z holicha saqlanadi.
- Yangi ilova obyektlari `idea_app` ichida bo'ladi; `public.profiles` va `public.resources` nomlari qayta ishlatilmaydi.
- `idea_app` Data API uchun faqat alohida tekshiruvdan keyin expose qilinadi.
- Har bir jadvalda RLS yoqiladi; kerakli table grantlar aniq va minimal beriladi.
- Frontend `supabase.schema('idea_app')` orqali ishlaydi, lekin faqat schema exposure, grant, RLS va Auth sinovlaridan keyin.
- Hozircha bu taklif; hech qanday DDL bajarilmaydi.

Bu yondashuv mavjud resurs/investitsiya tizimini IDEA LAB'ning loyiha, jamoa, ish va ariza modullaridan ajratadi. Keyinchalik ikki tizim o'rtasida aniq integratsiya shartnomasi bo'lishi mumkin, lekin jadval nomlari tasodifan bir-biriga ulanmaydi.

## 2. Jonli bazaning o'zgarmas chegarasi

2026-11-16 read-only auditida `public` sxemada 9 ta jadval va ularning barchasida RLS yoqilgan:

| Jonli jadval | Ma'nosi |
|---|---|
| `public.profiles` | Resurs/investitsiya tizimi foydalanuvchi profili |
| `public.user_roles` | investor/resource_owner/admin/moderator rollari |
| `public.resource_types` | Resurs turlari |
| `public.resources` | Resurs/investitsiya obyektlari |
| `public.resource_accounts` | Resursga bog'langan hisob manzillari |
| `public.investments` | Investitsiya yozuvlari |
| `public.money_transfers` | Pul o'tkazmasi qaydlari |
| `public.transfer_allocations` | O'tkazma taqsimotlari |
| `public.audit_logs` | Audit jurnali |

Audit paytida `resource_types` da 5 ta yozuv, qolgan jadvallarda 0 ta yozuv bor edi. Bu faqat audit paytidagi ko'rsatkich.

Jonli migration tarixida 4 ta qo'llangan versiya bor:

- `20261115180838 — idea_lab_foundation_schema_v1`
- `20261115180902 — idea_lab_foundation_hardening_v1`
- `20261115180930 — idea_lab_restrict_internal_functions_v1`
- `20261115181211 — idea_lab_rls_and_grants_v1`

Repository'dagi `supabase/migrations/` fayllari jonli migration history bilan bir xil emas. Ularni qo'llangan deb hisoblash mumkin emas.

## 3. Yangi `idea_app` sxemasi uchun obyektlar

Birinchi iteratsiyada ilova jadvallari quyidagi nomlash va mas'uliyat bo'yicha loyihalanadi:

| Jadval | Vazifasi | Asosiy bog'lanish |
|---|---|---|
| `idea_app.profiles` | Ilova profili va ommaviy bio | `auth.users.id` |
| `idea_app.profile_contacts` | Maxfiy aloqa ma'lumotlari | profile + egasi |
| `idea_app.organizations` | Tashkilot, ta'lim muassasasi yoki korxona | owner user |
| `idea_app.organization_members` | Tashkilot a'zoligi va holati | organization + user |
| `idea_app.projects` | Loyiha va uning holati | owner user yoki organization |
| `idea_app.project_members` | Loyiha jamoasi | project + user |
| `idea_app.project_tasks` | Vazifalar | project + creator + assignee |
| `idea_app.project_updates` | Loyiha yangiliklari | project + author |
| `idea_app.listings` | Ish, taklif, talab, resurs, mahsulot/xizmat e'lonlari | owner + optional organization |
| `idea_app.listing_details` | Listing turiga xos xavfsiz metadata | listing |
| `idea_app.specialist_profiles` | Mutaxassislik va ko'nikmalar | profile |
| `idea_app.applications` | Loyiha/ish/jamoa/taklif/resursga murojaat | applicant + target |
| `idea_app.conversations` | Ariza ishtirokchilari suhbati | application |
| `idea_app.conversation_participants` | Suhbat qatnashchilari | conversation + user |
| `idea_app.messages` | Suhbat xabarlari | conversation + sender |
| `idea_app.events` | Tadbirlar | owner + optional project |
| `idea_app.event_registrations` | Tadbir ro'yxati | event + user |
| `idea_app.activity_events` | Ishtirokchilarga ko'rinadigan faoliyat tarixi | actor + recipient + target |
| `idea_app.audit_events` | Muhim xavfsizlik va boshqaruv amallari | actor + action + target |

Profil va tashkilotlar uchun birinchi draft migration `20261116120000_idea_app_identity_organizations.sql`, loyiha/jamoa moduli uchun ikkinchi draft migration `20261116130000_idea_app_projects_teams.sql` faylida saqlanadi. Ikkalasi ham faqat repository'da; jonli Supabase'ga qo'llanmagan.

### Projects va project teams

- `projects.created_by` — loyiha yaratuvchisi va individual egasi; `organization_id` ixtiyoriy tashkilot bilan bog'laydi. Tashkilotga bog'lash o'z-o'zidan tashkilot nomidan vakolat bermaydi.
- Loyiha holatlari: `draft`, `recruiting`, `active`, `paused`, `completed`, `archived`; ko'rinish: `private`, `unlisted`, `public`.
- Loyiha a'zolari: `manager`, `contributor`, `viewer`; a'zolik holatlari: `invited`, `pending`, `active`, `declined`, `removed`. Loyiha yaratuvchisi alohida owner bo'lib qoladi, a'zolik roli orqali o'zini ko'tarmaydi.
- Vazifalar loyiha, yaratuvchi va ixtiyoriy mas'ul foydalanuvchiga bog'lanadi. Holatlar: `todo`, `in_progress`, `blocked`, `done`, `cancelled`; ustuvorlik: `low`, `normal`, `high`, `urgent`. `done` vazifa uchun `completed_at` talab qilinadi.
- Yangiliklar `announcement`, `progress`, `milestone`, `blocker` turlariga ega; ko'rinish `team` yoki `public`, nashr holati `draft` yoki `published`. `public` qiymati hozircha faqat metadata: maxsus xavfsiz view va RLS siyosatlari bo'lmaguncha hech narsa ommaga ochilmaydi.
- Vazifa assignee'si loyiha a'zosi ekanini tekshirish, owner/member CRUD, membership transitionlari va public update ko'rish qoidalari keyingi RLS/API migrationida aniq belgilanadi.

Bu jadval va statuslar hozirgi DDL draftining chegarasini belgilaydi; ularni frontend'dan hozircha ishlatib bo'lmaydi.

### Projects RLS — repository draft

Migration `20261116140000_idea_app_projects_rls.sql` loyiha, jamoa, vazifa va yangiliklar uchun siyosatlarni belgilaydi. U faqat repository'da, jonli Supabase'ga qo'llanmagan.

- Owner: `projects.created_by`; project update/delete faqat owner.
- Manager: faol `manager` a'zoligi; jamoani ko'rish, contributor/viewer taklif qilish, vazifa va yangiliklarni boshqarish.
- Contributor: faol a'zolik; loyiha vazifalarini yaratish/tahrirlash va draft yangiliklar.
- Viewer: loyiha, vazifa va jamoa ichidagi yangiliklarni o'qish.
- O'z-o'zidan qo'shilish faqat public + recruiting loyihaga pending contributor/viewer so'rovi; foydalanuvchi o'zini active yoki manager qila olmaydi.
- Membership status/role o'zgarishlari to'g'ridan-to'g'ri client UPDATE bilan yopiq; keyinchalik aniq tranzaksion server amali bo'ladi.
- Task boshqa foydalanuvchiga tayinlanmaydi; alohida server-side tekshiruv talab qilinadi.
- Public update faqat public loyiha, published holati va owner/manager nashr huquqi bilan ko'rinadi. Hozircha anon/public API grant yo'q.
- RLS helper'lari alohida, expose qilinmaydigan `idea_private` sxemasida. Ular `SECURITY DEFINER`, qat'iy `search_path`, dinamik SQL'siz va `auth.uid()` asosida. EXECUTE faqat authenticated; schema Data API'da ochilmagan.
- Hech qanday jadval grantlari yoki Data API exposure qo'shilmagan. RLS siyosatlari grant o'rnini bosmaydi.

Two-user sinovlar `verification/project-rls-acceptance.md` da, metadata tekshiruvi `verification/project-rls-preflight.sql` da. Staging qabulidan oldin schema expose qilish yoki browser table grant berish mumkin emas.

## 4. Ma'lumot maxfiyligi va ruxsat modeli

### Profil
- `profiles` faqat egasiga tegishli tahrirlanadigan profil maydonlarini saqlaydi.
- `profile_contacts` alohida yopiq jadval: telefon/email faqat egasi va aniq vakolatli jarayonlarga.
- Profil jadvalidagi rol yoki admin huquqini foydalanuvchi o'zi tahrirlay olmaydi.
- Vakolatlar `user_metadata` dan olinmaydi. Zarur bo'lsa, faqat ishonchli server boshqaradigan `app_metadata` yoki alohida yopiq rol jadvali ishlatiladi.

### E'lonlar
- Public directory faqat maxsus view/DTO orqali; telefon, email, Telegram, private storage path va ichki egasi IDsi chiqarilmaydi.
- View ishlatilsa Postgres 15+ da `security_invoker = true` bo'lishi va RLS bilan tekshirilishi kerak.
- Draft, pending_review, paused, closed va archived yozuvlar ommaviy katalogda ko'rinmaydi.
- `owner_id` yoki `organization_id` ni client o'z xohishiga ko'ra almashtira olmaydi.

### Arizalar va xabarlar
- Ariza yaratishda applicant ID serverdagi `auth.uid()` bilan bog'lanadi; brauzer yuborgan IDga ishonilmaydi.
- Arizani faqat arizachi va target egasi ko'radi.
- Status transition faqat ruxsatli tomon va ruxsatli o'tishlar bilan.
- Suhbat/xabar faqat ishtirokchilarga ko'rinadi.
- Audit va activity yozuvlarini client bevosita INSERT/UPDATE/DELETE qila olmaydi.

### Tashkilot va loyiha a'zoligi
- A'zolik taklif → pending → active/declined/removed holatlaridan o'tadi.
- Faqat tashkilot/loyiha egasi a'zolikni boshqaradi.
- Oddiy a'zo o'zini owner/admin qila olmaydi.
- Vazifa update siyosati project_id yoki assigned_to qiymatini boshqa loyiha/foydalanuvchiga o'tkazib yuborishga yo'l qo'ymaydi.

## 5. Data API va schema exposure

2026-yil 30-oktabrdan Data API'ga yangi jadvallarni avtomatik expose qilish tartibi o'zgargan; mavjud loyihalarda ham expose ro'yxati alohida boshqariladi.

Shuning uchun:
1. `idea_app` schema avval yaratiladi, lekin Data API'ga darhol qo'shilmaydi.
2. DDL va RLS auditidan keyin Supabase API settings'da faqat `idea_app` schema expose qilinishi ko'rib chiqiladi.
3. `anon` ga default keng grant berilmaydi.
4. `authenticated` uchun ham schema USAGE va table SELECT/INSERT/UPDATE grantlari jadvalma-jadval beriladi.
5. RLS har bir exposed jadvalda yoqiladi; grant RLS o'rnini bosmaydi, RLS ham grant o'rnini bosmaydi.
6. Public katalog uchun alohida view va minimal SELECT grant bo'ladi. Maxfiy jadvallar Data API orqali ochilmaydi.

## 6. Migration bosqichlari

| Bosqich | Ish | Qabul mezoni |
|---|---|---|
| 0 | Jonli sxema snapshot va backup/restore imkoniyatini tasdiqlash | Qayta tiklash rejasi va schema checksum |
| 1 | `idea_app` namespace yaratish | Mavjud `public` obyektlariga ta'sir yo'q |
| 2 | Identity/profile va organizations | UID FK, privacy split, RLS, grants |
| 3 | Projects, teams, tasks, updates | DDL va RLS draftlari tayyor; staging'da two-user acceptance hali bajarilishi kerak |
| 4 | Listings + directory views | Maxfiy ustunlar yo'q; status filtrlari |
| 5 | Applications + messages | Ishtirokchi doirasi, status transition |
| 6 | Events + registrations + activity | Capacity/duplicate va audit testlari |
| 7 | Frontend adapter pilot | Faqat bitta modul; offline demo fallback |
| 8 | Legacy import dry-run | Preview, duplicate/invalid quarantine, mapping report |
| 9 | Rollout qarori | Ikki-user RLS, rollback va foydalanuvchi roziligi |

Hech bir bosqich avtomatik ravishda keyingisini ishga tushirmaydi. Productionga o'zgarish faqat alohida tasdiqlangan migration, backup va rollback rejasi bilan.

## 7. Frontend ulanish qoidalari

- `assets/idea-config.js` `offline-demo` holatida qoladi.
- Public browser configga faqat project URL va publishable/anon key joylanadi.
- Service-role/secret key, DB paroli yoki SMS/SMTP secret frontendga yozilmaydi.
- Data adapter bitta qatlamda; HTML sahifalar bevosita Supabase jadvaliga murojaat qilmaydi.
- Serverda xato bo'lsa demo yozuv serverga saqlandi deb ko'rsatilmaydi.
- Auth session tekshiruvi `getUser()`/server tomonidan tasdiqlangan user bilan; client metadata vakolat emas.
- Email confirmation/reset uchun ishonchli SMTP, phone OTP uchun SMS provider va provider sozlamalari kerak.

## 8. Hozircha taqiqlangan amallar

- Repository'dagi `supabase/schema.sql` ni jonli `public` sxemaga to'liq qo'llash.
- `public.profiles` yoki `public.resources` ni rename/drop/alter qilish.
- Jonli 9 jadvalni yangi IDEA LAB jadvallari sifatida ishlatish.
- Repository migratsiyalarini live migration history bilan solishtirmasdan qo'llash.
- Yagona production loyihada ikki-user RLS testlari yoki buzuvchi test yozuvlarini bajarish.
- Auth provider, SMTP, SMS, email confirmation yoki redirect sozlamalarini egasining tasdig'isiz o'zgartirish.
- Browser localStorage yozuvlarini avtomatik serverga ko'chirish.

## 9. Qabul mezonlari

Blueprint tasdiqlangan deb hisoblanishi uchun:
- [ ] `idea_app` namespace qarori va public schema'dan ajratish hujjatlashtirilgan.
- [ ] Har bir obyektning owner/participant model va maxfiylik darajasi belgilangan.
- [ ] Data API exposure va grants alohida boshqarilishi ko'rsatilgan.
- [ ] Migration ketma-ketligi va rollback talablari yozilgan.
- [ ] Hozirgi Supabase live schema'ga hech qanday o'zgarish kiritilmagan.

Bu hujjat **backend ulandi, Auth ishlayapti yoki migration qo'llandi** degani emas.
