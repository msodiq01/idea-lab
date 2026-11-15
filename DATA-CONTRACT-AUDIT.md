# IDEA LAB — data contract va backend moslik auditi

Sana: 2026-11-15  
Asos: `main` branchdagi HTML/JS va `supabase/schema.sql`, `supabase/migrations/20261115_security_hardening.sql` manbalari.  
Holat: faqat statik kod auditi; Supabase loyihasiga ulanilmadi, SQL bajarilmadi, foydalanuvchi ma’lumotlari o‘zgartirilmadi.

## 1. Umumiy xulosa

Frontendning asosiy modullari hozircha `localStorage` orqali ishlaydi. Supabase uchun 19 ta jadvaldan iborat SQL draft mavjud, ammo frontend adapteri hali `offline-demo` rejimida. Demak, jadval va migration fayllarining repoda borligi real backend ishga tushganini anglatmaydi.

Backendga ulashdan oldin uch qatlamni ajratish kerak:
1. **Frontend contract** — sahifalar hozir o‘qiydigan/yozadigan maydonlar va statuslar.
2. **Database contract** — SQL ustunlari, turlari, cheklovlari va foreign key.
3. **Authorization contract** — qaysi foydalanuvchi qaysi qatorni ko‘rishi yoki o‘zgartirishi mumkin.

## 2. Modullar va saqlash oqimlari

| Modul | Hozirgi frontend manbasi | SQL mosligi | Eslatma |
|---|---|---|---|
| Profil | `userProfile`, `ideaLabCurrentUser` | `profiles` | Browser profilining maydonlari SQL profilidan kengroq; yagona Auth ID mapping zarur. |
| Loyihalar | `projects` | `projects` | Frontend `name/projectName`, `direction/category`, `investment/amount`, `createdAt/date` variantlarini o‘qiydi; normalizatsiya kerak. |
| Investitsiya | `investors`, `investorRequests`, `investmentApplications` | `investors`, `project_investment_applications` | `investorRequests` uchun alohida SQL jadval yo‘q; biznes ma’nosi aniqlanmaguncha birlashtirilmasin. |
| Jamoalar | `teams`, `teamApplications` | `teams`, `team_applications` | Team mustaqil tashkilotmi yoki loyiha jamoasimi — aniq biznes qarori kerak. |
| Ishlar | `jobs`, `jobApplications` | `job_posts`, `job_applications` | Frontend `jobId`, `jobTitle`, `companyName`, `date` kabi maydonlardan foydalanadi; SQLda `job_id`, `job_title`, `company_name`, `created_at`. |
| Mutaxassislar | `specialists` / mutaxassis sahifasidagi saqlash konstantasi | `specialist_profiles` | Saqlash kalitining aniq literal qiymati va to‘liq maydonlari alohida tasdiqlanishi kerak. |
| Takliflar | `offers`, `offerApplications`, `offerMessages` | `offers`, `offer_applications`, `offer_messages` | Xabarlar ariza ishtirokchilariga cheklanishi kerak. |
| Talab/taklif almashinuvi | `ideaLabExchangeItems` | To‘g‘ridan-to‘g‘ri mos jadval yo‘q | Keyinchalik `resources` yoki umumiy Listing modeli bilan mapping qilinadi; hozir avtomatik ko‘chirilmaydi. |
| Resurslar | `ideaLabResourceRegistry`, `resourceOrders` | `resources`, `resource_orders` | Reyestr maydonlari va katalog resurslari bir xil obyekt deb qabul qilinmasin. |
| Tadbirlar | `ideaLabEvents` | `events`, `event_registrations` | Browser event formasi va SQL starts_at/ends_at/capacity maydonlari o‘rtasida mapping kerak. |
| Moliya | `ideaLabFinanceTransactions`, `ideaLabFinanceBudgets` | Mos SQL jadvallari yo‘q | Serverga ulashdan oldin moliya yozuvlari demo/haqiqiyligini ajratish va xavfsiz model belgilash zarur. |
| Bildirishnomalar | `ideaLabDismissedNotices` va boshqa modullar hosil qilgan eslatmalar | Alohida notification jadvali yo‘q | Hozirgi eslatmalar lokal hosila; server push yoki cross-user notification emas. |

## 3. Tasdiqlangan mos kelmasliklar

### 3.1 Nom va maydon farqlari
- Frontend loyiha kartalarida `name || projectName`, `direction || category`, `investment || amount` fallbacklari bor. SQLda bitta kanonik ustun nomi ishlatiladi.
- Frontend ariza oqimlarida `date`, `createdAt`, `updatedAt` va turli label maydonlari ishlatiladi. SQL esa `created_at`, `updated_at` va foreign key IDlarga tayanadi.
- Frontend statuslari ayrim sahifalarda o‘zbekcha label (`Yangi`, `Qabul qilindi`) bilan saqlanadi; SQL va core helperlarda inglizcha canonical statuslar ham mavjud. Bitta status dictionary va label qatlamiga o‘tish kerak.
- Frontend `ownerEmail`, `applicantEmail`, `applicantPhone` kabi maydonlarni identity va UI uchun ishlatadi. Ularni ommaviy katalog javobiga kiritish mumkin emas.

### 3.2 Yetishmayotgan server obyektlari
- `investorRequests` uchun aniq SQL modeli yo‘q.
- `ideaLabExchangeItems` uchun alohida Listing/Exchange modeli yo‘q.
- `ideaLabFinanceTransactions` va `ideaLabFinanceBudgets` uchun SQL modeli yo‘q.
- Notification, dismiss-state va platform activity uchun server modeli to‘liq belgilanmagan.
- Marketplace hozir loyiha katalogini ko‘rsatadi; haqiqiy mahsulot/xizmat savdosi va order/payment oqimi mavjud deb hisoblanmasin.

### 3.3 Identifikatorlar
Frontend demo IDlari matn yoki timestamp asosida bo‘lishi mumkin. SQL UUID ishlatadi. Importda `legacy_id` va yangi UUID orasida takrorlanmaydigan mapping jadvali zarur. Faqat email yoki ism orqali yozuvlarni bog‘lash xavfli.

## 4. Xavfsizlik bo‘yicha muhim eslatmalar

1. `schema.sql` ichida directory jadvallari uchun `Authenticated users can view ... using (true)` siyosatlari bor. `20261115_security_hardening.sql` ularni olib tashlab, kontakt maydonlarisiz public view'lar yaratadi. **Schema yakka o‘zi productionga qo‘llanmasin**; hardening migration alohida tekshirilib, test bazada qo‘llanishi kerak.
2. `profiles` jadvalida `roles` ustuni mavjud. Asosiy schema'dagi owner update policy uni o‘zi o‘zgartirishni cheklamaydi; hardening migration triggeri bu xavfni kamaytirishga mo‘ljallangan.
3. `projects_public` va boshqa directory view'lar faqat authenticated foydalanuvchilarga SELECT beradi; anon roli uchun ruxsat bekor qilinadi. Mahsulotning haqiqiy ommaviy katalog talabi alohida qaror bo‘lishi kerak.
4. `teams_public` view barcha team yozuvlarini ko‘rsatadi, chunki joriy `teams` jadvalida status ustuni yo‘q. E’lonni yashirish/arxivlash talabi bo‘lsa, status va filter qo‘shish kerak.
5. RLS yoqilgan bo‘lishi o‘z-o‘zidan yetarli emas: ikki alohida test akkaunt bilan SELECT/INSERT/UPDATE/DELETE sinovlari bajarilishi shart.
6. Frontenddagi role tanlovi, localStorage identity va JavaScript tekshiruvlari haqiqiy server vakolati hisoblanmaydi.

## 5. Serverga ulashdan oldingi majburiy ishlar

- [ ] Har bir modul uchun field-by-field JSON namunalari va status qiymatlarini yig‘ish.
- [ ] Kanonik naming: camelCase frontend ↔ snake_case database mapping.
- [ ] Har bir yozuv uchun owner/applicant ID manbasini belgilash.
- [ ] `investorRequests`, exchange, finance va notifications bo‘yicha mahsulot qarorlarini qabul qilish.
- [ ] Status transitionlarni bitta canonical enum/dictionaryga keltirish.
- [ ] SQL constraints, foreign key, unique va delete behaviorni ko‘rib chiqish.
- [ ] Test Supabase loyihasida schema va hardening migrationni ketma-ket sinash.
- [ ] Ikki foydalanuvchili RLS test rejasidagi barcha holatlarni bajarish.
- [ ] Import dry-run: faqat preview, mapping, xatolar va karantin hisobotini chiqarish.
- [ ] Backup/restore va rollback sinovidan keyingina pilot modulni ulash.

## 6. Qaror

**Hozircha SQL migration bajarilmaydi va localStorage ma’lumotlari ko‘chirilmaydi.** Birinchi pilot modul sifatida loyihalar + investitsiya arizalarini tanlash mumkin, chunki ular eng muhim asosiy bog‘lanishni — Project → Application → Applicant/Owner — sinashga imkon beradi. Lekin pilotdan oldin yuqoridagi field mapping va ikki foydalanuvchili RLS sinovlari tayyor bo‘lishi shart.

## 7. Tekshiruv chegarasi

Bu hujjat repodagi kod va SQL draftni statik ko‘rib chiqish asosida tuzildi. Real Supabase project ref, deployed schema, real foydalanuvchi ma’lumotlari va production policy holati tekshirilmagan. Hech qanday SQL bajarilmadi.
