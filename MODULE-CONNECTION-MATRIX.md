# IDEA LAB — modul va ma’lumotlar zanjiri xaritasi

Tekshiruv sanasi: 2026-11-17
Kod bazasi: msodiq01/idea-lab
Tekshiruv turi: GitHub main kodini va Supabase sxemasini o‘qib tekshirish. Brauzerda end-to-end sinov hali bajarilmagan.

## Holatlarni qanday tushunish kerak?

- **Server bilan ishlaydi** — tegishli oqim Auth, xavfsiz view yoki RPC orqali serverga yozadi/o‘qiydi; alohida qabul sinovi baribir talab qilinadi.
- **Qisman server** — faqat aniq ko‘rsatilgan amallar serverda; qolgan amallar mahalliy.
- **Demo / localStorage** — yozuvlar shu brauzerda qoladi; boshqa foydalanuvchi yoki qurilmaga avtomatik uzatilmaydi.
- **Demo-only** — haqiqiy moliyaviy, investitsion yoki tashqi operatsiya bajarilmaydi.

## Modul holatlari

| Modul | Sahifa(lar) | 2026-11-17 kod tekshiruvidagi holat | Keyingi ulanish zanjiri |
|---|---|---|---|
| Identifikatsiya | auth.html, profile.html | Supabase Auth konfiguratsiyasi va sessiya oqimi mavjud; ayrim profil ko‘rsatkichlari user-metadata orqali, avatar local. Real signup/login brauzer sinovi ochiq. | Auth UID → profil jadvali → tashkilot a’zoligi → server ruxsatlari |
| Loyihalar | index.html, projects.html, project-detail.html, project-workspace.html | Yaratish, ommaviy katalog, tafsilot va ayrim a’zolik amallari data adapter/RPC orqali. Ikki akkauntli RLS sinovi bajarilmagan. | Auth egasi → loyiha → katalog → tafsilot → jamoa/a’zolar → yangilanishlar |
| Arizalar markazi | applications.html | **Qisman server.** Sahifa serverdagi application-center view’dan o‘qiydi; serverdagi holatni yangilash hozir faqat project/investment turidagi ayrim arizalar uchun. Boshqa turdagi arizalar va eski yozuvlar localStorage yo‘lidan kelishi mumkin. | Barcha ariza turlarini bitta server modeli/RPC’ga o‘tkazish → tomonlar bo‘yicha RLS → status tarixi → bildirishnoma |
| Ochiq resurslar | resources.html | Ommaviy server katalogi o‘qish uchun; shaxsiy inventar va buyurtma oqimining bir qismi local/demo. | Resurs egasi → buyurtma → tasdiq → yetkazish/holat |
| Investorlar | investors.html, investor-portfolio.html | Demo-only; haqiqiy sarmoya, to‘lov yoki pul o‘tkazmasi yo‘q. | Qonuniy va xavfsiz hamkorlik/tekshiruv oqimi alohida loyihalanadi |
| Jamoalar va vakansiyalar | teams.html | **Server + qisman sinov kutmoqda.** Jamoa katalogi, yaratish va a’zolik so‘rovlari `organizations` / `organization_members` orqali. Vakansiyalar va ishga arizalar `job_posts` / `job_applications`, ommaviy `idea_lab_public_job_directory` view va SECURITY INVOKER RPC’lar orqali serverda. Legacy localStorage ish arizalari paneli yashirilgan. | Ikki akkauntli brauzer sinovi → ariza holati va egasi izolyatsiyasi → bildirishnomalar |
| Mutaxassislar | specialists.html | **Qisman server.** Ommaviy katalog server view’dan o‘qiladi va kirgan foydalanuvchi profilini server RPC orqali saqlash yo‘li mavjud; backend ishlamasa local demo fallback bor. | Profilni yagona profil modeli bilan bog‘lash → qidiruv/filtr → loyiha taklifi va ariza |
| Takliflar va xabarlar | offers.html | Demo/local; ishtirokchi doirasidagi server xabar almashinuvi tasdiqlanmagan. | E’lon → ariza → faqat ishtirokchilar uchun xabarlar → kelishuv holati |
| Talab va taklif almashinuvi | exchange.html | Demo/local. | E’lon turi → egasi → ariza/so‘rov → buyurtma |
| Marketplace | marketplace.html | Cheklangan demo; to‘liq savdo/order tizimi emas. | Sotuvchi → mahsulot/xizmat → narx → buyurtma → yetkazish |
| Moliya va xarajatlar | finance.html, project-expenses.html | Demo/local; bank yoki to‘lov provayderi ulanmagan. | Loyiha → xarajat hujjati → tasdiq → buxgalteriya integratsiyasi |
| Analitika | analytics.html, dashboard.html | Dashboardda ayrim server ma’lumotlari; boshqa ko‘rsatkichlar cheklangan/demo. | Faqat serverdan tasdiqlangan ma’lumot → metrika → hisobot |
| Bildirishnoma va faoliyat | notifications.html, activity.html | Demo/local; real-time server xabarlari tasdiqlanmagan. | Server hodisasi → foydalanuvchi → ruxsatli bildirishnoma → o‘qildi holati |
| Tashkilotlar va ruxsatlar | organizations.html, access.html, management.html | Demo/local; haqiqiy RBAC emas. | Auth UID → tashkilot a’zoligi → server roli → ruxsat tekshiruvi |
| Yetkazib beruvchi tekshiruvi | suppliers.html, supplier-verification.html, supplier-reviewer.html, supplier-verification-admin.html | Demo/local. | Yetkazib beruvchi → hujjat → tekshiruvchi → qaror → audit |
| Zaxira va to‘plamlar | backup.html, collection.html | Brauzer darajasidagi prototip. | Foydalanuvchi roziligi → eksport/zaxira → saqlash siyosati → tiklash sinovi |

## Tasdiqlangan backend kuzatuvlari

- Supabase loyihasi tekshiruv vaqtida faol/healthy holatda.
- Public kataloglar uchun 8 ta idea_lab_public_* view mavjud; tekshiruvda security_invoker=true va anon/authenticated uchun SELECT ruxsati tasdiqlangan.
- Public RPC qatlamida 30 ta idea_lab_* funksiya tekshirilgan; ular SECURITY INVOKER sifatida sozlangan va authenticated roliga EXECUTE berilgan, anon roliga emas.
- idea_app.specialist_profiles, idea_app.projects, idea_app.applications va idea_app.profiles jadvallari mavjud. Tekshiruvda idea_app.teams jadvali topilmadi.
- Hozirgi hisobda auth.users, idea_app.profiles, idea_app.projects va idea_app.applications jadvallarida yozuvlar soni 0. Shu sababli real foydalanuvchilar o‘rtasidagi ma’lumot izolyatsiyasi hali amalda tasdiqlanmagan.
- public.audit_logs uchun RLS yoqilgan va policy yo‘q. Bu holatni ochiq policy bilan “tuzatish” mumkin emas; audit yozish modeli alohida ko‘rib chiqilishi kerak.
- Frontend konfiguratsiyasida faqat Supabase public publishable key ishlatiladi; service-role yoki boshqa maxfiy kalit brauzerga joylashtirilmasligi shart.
- Repo ichidagi kelajak migratsiyasi avtomatik qo‘llanmagan. DB o‘zgarishlari zaxira, staging tekshiruvi va alohida tasdiqsiz bajarilmaydi.
- 2026-11-17: `idea_app_team_membership_requests` va `idea_app_organization_write_grants` migratsiyalari qo‘llandi. Jamoa a’zoligi uchun 3 ta SECURITY INVOKER RPC qo‘shildi; anon EXECUTE ruxsatisiz.
- 2026-11-17: `idea_app_career_center`, `idea_app_closed_job_read_for_applicants`, `idea_app_job_organization_publish_guard` va `idea_app_job_column_grants` migratsiyalari qo‘llandi. `job_posts` / `job_applications` jadvallari, RLS siyosatlari, ommaviy `security_invoker` vakansiya view’i va 7 ta SECURITY INVOKER RPC qo‘shildi. Anon vakansiyalarni faqat ommaviy view orqali ko‘radi; arizalar jadvali va ariza RPC’lari anon uchun yopiq. Vakansiya joylash faqat egasi bo‘lgan, faol va ommaviy (team bo‘lmagan) tashkilotga ruxsat etiladi.

## Hozir ishlayotgan asosiy zanjir

Auth → loyiha yaratish → ommaviy loyiha katalogi → loyiha tafsiloti → ariza yuborish → arizalar markazi.

Bu zanjirning ayrim bosqichlari server bilan ishlaydi. Biroq foydalanuvchi akkauntlari yo‘qligi sababli ikki alohida akkauntda RLS izolyatsiyasi, rol/egalik ssenariylari va brauzer oqimi qabul sinovidan o‘tmagan. Shuning uchun butun platforma to‘liq serverga ulangan deb hisoblanmaydi.

## Dizayn va navigatsiya

- assets/idea-shell.css umumiy dizayn qatlamini beradi.
- assets/idea-shell.js umumiy navigatsiya, kabinet havolasi va sahifa kontekstini boshqaradi.
- auth.html alohida kirish sahifasi bo‘lib, unda takroriy asosiy navigatsiya ko‘rsatilmaydi.
- Umumiy vizual qatlam ranglar, tipografika, hero, kartalar, formalar, jadvallar va mobil ko‘rinishni bir xil tizimga keltiradi.
- Yuqori paneldagi backend belgisi faqat konfiguratsiya borligini ko‘rsatishi mumkin; bu barcha modullar serverda ishlashini anglatmaydi.

## Har bir modul uchun yakuniy qabul mezonlari

1. Kirish huquqi va ma’lumot egasi serverda aniqlanadi; brauzer yuborgan user_id egani belgilamaydi.
2. CRUD amallari serverga saqlanadi yoki local/demo ekani foydalanuvchiga ochiq ko‘rsatiladi.
3. Loading, bo‘sh natija, xato va muvaffaqiyat holatlari mavjud.
4. Boshqa foydalanuvchi ma’lumotini ko‘rish/o‘zgartirishga urinish RLS bilan to‘siladi.
5. Desktop va mobil brauzerda asosiy foydalanuvchi oqimi sinovdan o‘tadi.
6. Avtomatik testlar va kamida ikki akkauntli izolyatsiya sinovi o‘tadi.

## Keyingi texnik ustuvorlik

1. Auth → loyiha → ariza oqimini foydalanuvchi yaratgan ikki test akkauntida tekshirish. Parol yoki maxfiy kalitlar hech kimga yuborilmaydi.
2. Jamoalar va vakansiyalar oqimini ikki alohida test akkauntida brauzer orqali tekshirish; legacy localStorage ma’lumotlari import qilinmaydi.
3. Mutaxassislar profilidagi maydonlar va profil jadvali o‘rtasidagi yagona modelni mustahkamlash; local fallback faqat demo sifatida aniq ko‘rsatilsin.
4. Arizalar markazidagi barcha turdagi yozuvlarni yagona server oqimiga o‘tkazish; serverda qo‘llanmagan status update’larni “server saqlandi” deb ko‘rsatmaslik.
5. Takliflar/xabarlar va resurs buyurtmalarini ishtirokchi/egalik RLS bilan ulash.
6. Bildirishnoma va faoliyatni server hodisalari bilan bog‘lash.
7. Moliya, marketplace va tekshiruv modullarini alohida xavfsizlik hamda qonuniy talablar asosida loyihalash.
