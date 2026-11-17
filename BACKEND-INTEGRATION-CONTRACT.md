# IDEA LAB — backend integratsiya shartnomasi

Versiya: 1.1 · Sana: 2026-11-17  
Holat: Supabase konfiguratsiyasi va asosiy server adapteri ulangan; to‘liq qabul sinovlari hali yakunlanmagan.

## 1. Maqsad va chegaralar

Frontend server bilan `assets/idea-data.js` va `assets/idea-auth.js` orqali ishlaydi. `assets/idea-config.js` Supabase project URL va faqat ommaviy publishable keyni beradi; service-role/secret key brauzerga joylanmagan. Auth sahifasi va bosh sahifa Supabase JS v2 SDK ni yuklaydi va Auth adapterini ishga tushiradi.

**Tekshiruv natijasi (2026-11-17):** Supabase loyihasi `hfxkiudvlmibpffrppzc` `ACTIVE_HEALTHY`; 7 ta public katalog view `security_invoker=true` va anon/authenticated SELECT ruxsatlariga ega; 20 ta `idea_lab_*` RPC funksiyasi `SECURITY INVOKER` va faqat authenticated roliga EXECUTE ruxsatiga ega. `auth.users`, `idea_app.profiles`, `idea_app.projects` va `idea_app.applications` hozircha bo‘sh. Shu sababli haqiqiy foydalanuvchi bilan kirish/yozish va ikki akkauntli RLS sinovi hali bajarilmagan.

Bu hujjat backendni yoqmaydi, akkaunt yaratmaydi va ma'lumot ko'chirmaydi. Legacy localStorage ma'lumotlari avtomatik import qilinmaydi.

## 2. Ma'lumotlar manbalari

| Vazifa | Ruxsat etilgan server manbasi |
|---|---|
| Shaxs profili | `profiles` — faqat o'z profili |
| Ommaviy loyihalar | `projects_public` |
| Ommaviy jamoalar | `teams_public` |
| Vakansiyalar | `job_posts_public` |
| Mutaxassislar | `specialist_profiles_public` |
| Takliflar | `offers_public` |
| Investor katalogi | `investors_public` |
| Resurs katalogi | `resources_public` |
| Kiruvchi/yuborilgan murojaat | Tegishli application jadvali; RLS orqali ishtirokchi doirasi |
| Xabarlar | `offer_messages`; faqat ariza ishtirokchilari |

Ommaviy kataloglar uchun asosiy jadvallarni keng SELECT qilish taqiqlanadi. Public view'larda telefon, email, Telegram, resume yo'li va egaga tegishli ichki identifikatorlar berilmaydi.

## 3. Application API modeli

Frontenddagi 5 oqim dastlab alohida jadval bilan moslanadi:

| UI turi | Jadval | Target FK |
|---|---|---|
| Investitsiya | `project_investment_applications` | `project_id` |
| Jamoa | `team_applications` | `team_id` |
| Ish | `job_applications` | `job_id` |
| Taklif | `offer_applications` | `offer_id` |
| Resurs | `resource_orders` | `resource_id` |

Har bir yozuvda server bergan UUID, authenticated applicant ID, target ID, status va timestamp bo'ladi. Brauzer yuborgan applicant ID egasi deb qabul qilinmaydi: server/RLS `auth.uid()` bilan solishtiradi.

## 4. Status qoidalari

Machine qiymatlar inglizcha saqlanadi; UI o'zbekcha ko'rsatadi.

- Arizachi: faqat o'z arizasini bekor qilishi mumkin.
- Target egasi: arizani ko'rib chiqishi va qaror berishi mumkin.
- Arizachi o'z arizasini o'zi `accepted` yoki `rejected` qila olmaydi.
- Status o'tishlari serverda ruxsat etilgan holatlar bilan cheklanadi.
- Har bir muhim o'tish audit yozuviga ega bo'lishi kerak.

## 5. Server-side ariza tarixi va bildirishnomalar

`supabase/migrations/20261122_application_activity_notifications.sql` arizalar uchun server audit jadvali va triggerlarini tayyorlaydi. U investitsiya, jamoa, ish va taklif arizalarida yuborish/status o‘zgarishini qayd etadi. Yozuvni brauzer emas, DB trigger yaratadi; foydalanuvchi faqat ishtirokchi bo‘lgan arizalar tarixini o‘qiydi. Jadvalga client INSERT/UPDATE/DELETE berilmagan. Ushbu migration repository'da tayyorlangan, lekin Supabase loyihasiga qo‘llanmagan. Frontend hali `offline-demo` rejimida; real-time subscription va server adapter alohida integratsiya bosqichidir.

## 6. Frontend data adapter talablari

1. UI localStorage yoki Supabase SDK'ni bevosita chaqirmaydi; adapter orqali ishlaydi.
2. Adapter `list`, `get`, `create`, `updateStatus` amallarini aniq tip bilan taqdim etadi.
3. Backend mavjud bo'lmasa, offline demo aniq belgilanadi; demo yozuv serverga ketgandek ko'rsatilmaydi.
4. Xatolar `API-ERROR-CATALOG.md` dagi kodlarga moslanadi.
5. Pagination serverda; cheksiz barcha yozuvlarni bir so'rovda yuklash yo'q.
6. Public va private ma'lumotlar alohida DTO sifatida uzatiladi.
7. Hech qachon service-role key brauzerga joylanmaydi.

## 7. Minimal endpoint/operatsiya shartnomasi

| Operatsiya | Ruxsat | Natija |
|---|---|---|
| Public directory list | Authenticated, view orqali | Faqat ommaviy ustunlar |
| Own profile read/update | Authenticated, own row | O'z profil maydonlari; roles yo'q |
| Application create | Authenticated | Server applicant ID bilan bog'laydi |
| Incoming applications list | Target owner | Faqat o'z targetlariga kelganlari |
| Outgoing applications list | Applicant | Faqat o'zi yuborganlari |
| Application status update | Target owner | Ruxsatli status transition |
| Application withdraw | Applicant | Faqat o'z arizasi |

## 8. Hozirgi holat va qabul mezonlari

- [x] Supabase loyihasi mavjud va `ACTIVE_HEALTHY`.
- [x] Frontendda public URL va publishable key konfiguratsiyasi mavjud; service-role key yo'q.
- [x] Auth adapter va markaziy data gateway mavjud.
- [x] Ommaviy katalog view'lari `security_invoker=true` bilan himoyalangan.
- [x] Server RPC funksiyalari `SECURITY INVOKER`; anon EXECUTE ruxsati berilmagan.
- [ ] Ikki alohida test foydalanuvchi bilan kirish, profil, loyiha, ariza va RLS izolyatsiyasi sinovi.
- [ ] Real foydalanuvchi bilan CRUD amallarining mobil/desktop qabul sinovi.
- [ ] Zaxira nusxa va tiklash sinovi.
- [ ] `20261122_application_activity_notifications.sql` migrationini alohida ko‘rib chiqish va qo‘llash.
- [ ] Legacy import oldidan preview, backup, duplicate report va rollback.

`public.audit_logs` jadvalida RLS yoqilgan va policy yo‘q. Bu jadval hozircha client rollariga yopiq; audit yozuvlari uchun server-side yozish modeli alohida tekshirilmaguncha unga umumiy SELECT/INSERT policy qo‘shilmaydi.
