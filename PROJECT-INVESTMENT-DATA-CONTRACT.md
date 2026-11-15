# Project + investment application — Data Contract v1

Holat: **taklif etilgan API shartnomasi**, hali production yoki Supabase bazasiga qo‘llanmagan.  
Asos: `projects.html`, `project-detail.html`, `investors.html`, `assets/idea-core.js`, `supabase/schema.sql`, `supabase/migrations/20261115_security_hardening.sql`.

## 1. Hozirgi oqim

- `projects.html` `projects` localStorage kolleksiyasini o‘qiydi. Katalogda `name || projectName`, `direction || category`, `investment || amount`, `createdAt || date` fallbacklari ishlatiladi.
- `project-detail.html?id=...` loyiha IDsi bo‘yicha shu kolleksiyadan bitta yozuvni topadi.
- Investitsiya formasi `investorName`, `investorEmail`, `offerAmount`, `offerMessage` maydonlarini oladi va `investmentApplications` kolleksiyasiga yozadi.
- Hozirgi application IDsi `APP-<timestamp>-<random>` ko‘rinishida; status `Yangi`; sana `date` va `createdAt` maydonlariga yoziladi.
- `ideaCore.identity.stamp(...)` faqat `userProfile.id` mavjud bo‘lsa `applicantId` kabi browser identifikatorlarini qo‘shadi. Bu Supabase `auth.uid()` bilan tengligi kafolatlanmagan.

## 2. Kanonik Project modeli

JSON Schema: [project.schema.json](contracts/project.schema.json)

| Kanonik maydon | SQL ustuni | Frontend manbasi | Qoidasi |
|---|---|---|---|
| `id` | `id` | `project.id` | Server UUID; importda eski ID `legacy_id`ga saqlanadi. |
| `owner_id` | `owner_id` | `project.ownerId` | Faqat Supabase Auth UID. Browser ID/email orqali vakolat aniqlanmaydi. |
| `legacy_id` | `legacy_id` | `project.id` | Eski demo ID; unique(owner_id, legacy_id). |
| `name` | `name` | `name` yoki `projectName` | Yozishda bitta `name` kanonik nomi. |
| `direction` | `direction` | `direction` yoki `category` | UI aliaslari faqat import adapterida. |
| `description` | `description` | `description` | Matn, max 12,000 belgi taklifi. |
| `investment` | `investment` | `investment` yoki `amount` | Numeric(16,2), manfiy emas; pul birligi UZS deb qabul qilinadi faqat mahsulot qarori tasdiqlansa. |
| `specialists` | `specialists` | `specialists` | Hozir oddiy matn; keyin alohida relation bo‘lishi mumkin. |
| `resources` | `resources` | `resources` | Hozir oddiy matn; keyin resource relation bo‘lishi mumkin. |
| `owner_name` | `owner_name` | `ownerName` / `fullName` | Faqat display snapshot; Auth identity emas. |
| `owner_email` | `owner_email` | `ownerEmail` | Maxfiy; directory view'dan chiqariladi. |
| `owner_phone` | `owner_phone` | `ownerPhone` | Maxfiy; directory view'dan chiqariladi. |
| `status` | `status` | Hozir katalogda status filteri yo‘q | Kanonik qiymatlar schema'da. Public view faqat active/published. |
| `created_at` | `created_at` | `createdAt` yoki `date` | ISO 8601 timestamp; server yaratadi. |
| `updated_at` | `updated_at` | Hozir to‘liq standartlashmagan | Server triggeri yangilaydi. |

## 3. Kanonik investment application modeli

JSON Schema: [project-investment-application.schema.json](contracts/project-investment-application.schema.json)

| Kanonik maydon | SQL ustuni | Hozirgi browser maydoni | Qoidasi |
|---|---|---|---|
| `id` | `id` | `APP-...` | Server UUID; eski ID `legacy_id`ga yoziladi. |
| `project_id` | `project_id` | `projectId` | UUID foreign key; eski string ID import mapping orqali yechiladi. |
| `investor_user_id` | `investor_user_id` | `applicantId` | Supabase Auth UID bo‘lishi shart; browser profile ID yetarli emas. |
| `investor_name` | `investor_name` | `investorName` | Required display name. |
| `investor_email` | `investor_email` | `investorEmail` | Shaxsiy ma’lumot; faqat ishtirokchilar ko‘radi. |
| `offer_amount` | `offer_amount` | `offerAmount` / `amount` | Musbat numeric(16,2). |
| `message` | `message` | `offerMessage` / `message` | Bitta kanonik message maydoni. |
| `status` | `status` | `Yangi` | Import adapteri `Yangi` → `new` qiladi; statuslar bitta enumdan boshqariladi. |
| `created_at` | `created_at` | `date` / `createdAt` | ISO timestamp; server yaratadi. |
| `updated_at` | `updated_at` | Yo‘q | Server triggeri yangilaydi. |
| `legacy_id` | `legacy_id` | `id` | Takroriy importni oldini olish uchun. |

## 4. Saqlanmasligi kerak bo‘lgan takroriy maydonlar

Hozir browser application ichida loyiha egasining `projectOwnerId`, `projectOwnerName`, `projectOwnerEmail`, `projectOwnerPhone` nusxalari bor. Server modelida owner ma’lumoti `project_id → projects.owner_id` orqali olinadi. Arizaga email/telefon nusxasini ko‘chirmaslik kerak; bu eskirgan va ortiqcha shaxsiy ma’lumotga olib keladi.

## 5. Status mapping

| Browser qiymati | Kanonik server qiymati |
|---|---|
| `Yangi` | `new` |
| `Yuborildi` / `submitted` | `new` (import mapping; keyin yagona qiymat ishlatiladi) |
| `Ko‘rib chiqilmoqda` / `reviewing` | `reviewing` |
| `Suhbat belgilandi` / `interview` | `interview` |
| `Qabul qilindi` / `accepted` | `accepted` |
| `Rad etildi` / `rejected` | `rejected` |
| `Bekor qilindi` / `withdrawn` | `withdrawn` |

Core'dagi transition ro‘yxati va SQL status defaulti hozir bir xil emas. Backendga ulashdan oldin bitta source-of-truth enum tasdiqlanadi; statusni erkin matn sifatida qabul qilmaslik kerak.

## 6. Xavfsizlik qoidalari

- Client INSERT'da `owner_id` yoki `investor_user_id` qiymati token ichidagi `auth.uid()`ga teng bo‘lishi kerak; RLS buni tekshiradi.
- Public directory view'lar `owner_email` va `owner_phone` bermaydi.
- Application SELECT faqat arizachi yoki tegishli loyiha egasiga ruxsat beriladi.
- Browser localStorage, formdagi email, `ownerEmail` yoki frontend role qiymati autentifikatsiya/avtorizatsiya o‘rnini bosmaydi.
- Supabase Auth profil ID bilan eski `userProfile.id` orasidagi mapping hal bo‘lmaguncha real ariza INSERT yoqilmaydi.
- RLS test planidagi A/B akkaunt sinovlari staging'da o‘tkazilmaguncha productionga ulanmaydi.

## 7. Import/migratsiya qoidalari

1. Avval faqat read-only dry-run: nechta loyiha/ariza, yaroqsiz yozuvlar, ID kolliziyalari va mapping xatolari.
2. Eski project ID → yangi UUID mapping jadvali yaratiladi; application `project_id` shu mapping orqali bog‘lanadi.
3. `legacy_id` import idempotency uchun ishlatiladi; bir yozuv qayta import qilinsa dublikat hosil bo‘lmasin.
4. Browser snapshot'dan shaxsiy contact maydonlari keraksiz joyga ko‘chirilmaydi.
5. Import natijasi va xatolar alohida hisobot qilinadi; avtomatik delete yoki eski localStorage tozalash yo‘q.
6. Backup/restore va rollback tekshirilgandan keyingina kichik pilot import qilinadi.

## 8. Ochiq qarorlar

- Loyiha investitsiya qiymati har doim UZSmi yoki currency maydoni kerakmi?
- Project statuslari uchun `published` va `active` bir xil ma’nodami?
- `specialists` va `resources` matn bo‘lib qoladimi yoki alohida bog‘langan yozuvlar bo‘ladimi?
- Arizachining emaili majburiymi yoki Auth profilidan olinadimi?
- `new` va `submitted` bitta status sifatida standartlanadimi?

**Xulosa:** bu contract keyingi adapter va migratsiya ishlariga asos bo‘ladi. Hozircha frontend kodi, Supabase bazasi yoki foydalanuvchi yozuvlari o‘zgartirilmagan; SQL bajarilmagan.
