# IDEA LAB — modullararo ma’lumotlar xaritasi

Versiya: 1.0  
Sana: 2026-11-15  
Repository: `msodiq01/idea-lab`  
Holat: joriy frontend va SQL draft asosida tahlil; backendga migratsiya qilinmagan.

## 1. Asosiy qoida

Bitta biznes obyektining yagona identifikatori bo‘lishi kerak. Sahifalar bir-biridan mustaqil nusxalar yaratmasdan, shu obyektni turli ko‘rinishda ishlatadi. Hozirgi frontend esa asosan alohida `localStorage` kalitlariga tayangan; shu sababli bu hujjat maqsadli bog‘lanishlarni belgilaydi, mavjud demo ma’lumotlari serverda bog‘langan deb da’vo qilmaydi.

## 2. Joriy frontenddagi ma’lumot manbalari

| Sahifa | Hozir aniqlangan kalitlar | Vazifasi |
|---|---|---|
| `index.html` | `projects`, `userProfile` | Loyiha yaratish va bosh sahifa loyihalari |
| `projects.html` | `projects` | Loyiha katalogi, qidiruv va filtr |
| `project-detail.html` | `projects`, `investmentApplications` | Loyiha tafsiloti va investitsiya arizasi |
| `investors.html` | `investors`, `investorRequests`, `investmentApplications`, `projects` | Investorlar va loyihaga investitsiya arizalari |
| `teams.html` | `teams`, `teamApplications`, `jobs`, `jobApplications` | Jamoalar, vakansiyalar va arizalar |
| `specialists.html` | `STORAGE_KEY` konstantasi orqali mutaxassis profillari | Mutaxassis katalogi; PDF yuklash hozircha o‘chiq |
| `offers.html` | `ideaLabCurrentUser`, `offers`, `offerApplications`, `offerMessages` | Takliflar, murojaatlar va chat demo |
| `exchange.html` | `ideaLabExchangeItems` | Talab/taklif e’lonlari |
| `marketplace.html` | `projects` | Hozircha loyiha katalogini bozor ko‘rinishida chiqaradi |
| `profile.html` | `userProfile`, `projects`, `investmentApplications`, `jobApplications`, `teamApplications`, `resourceOrders` | Profil va foydalanuvchi faoliyati |
| `dashboard.html` | Bir nechta eski kalitlarni o‘qiydi | Shaxsiy ko‘rsatkichlar va markaziy holat paneli |

**Muhim:** `specialists.html` saqlash kaliti manba kodida konstantada belgilanadi; uni migratsiya skriptida ishlatishdan oldin aniq literal qiymat bilan alohida tasdiqlash kerak. `exchange.html` kaliti — `ideaLabExchangeItems`. Dashboarddagi hisoblagichlar serverdagi umumiy statistikani anglatmaydi.

## 3. Maqsadli yagona obyektlar

| Yagona obyekt | Mazmuni | Bog‘lanishlar |
|---|---|---|
| Account | Autentifikatsiya va sessiya | Profile, OrganizationMembership |
| Profile | Shaxsning ochiq profili va ko‘nikmalari | Account, SpecialistProfile, Applications |
| Organization | Kompaniya, muassasa yoki mustaqil jamoa | Members, Projects, Listings |
| Project | Loyiha, egasi va maqsadlari | Owner, Organization, ProjectMembers, Applications, Tasks |
| Listing | Vakansiya, taklif, talab, mahsulot, xizmat yoki resurs | Owner, Organization, Applications, Orders |
| Application | Loyiha/ish/jamoa/taklifga murojaat | Applicant, Target, Conversation |
| Conversation | Ariza ishtirokchilari suhbati | Application, Participants, Messages |
| Order | Resurs yoki mahsulot buyurtmasi | Buyer, Seller, Listing, Transaction |
| Transaction | Litsenziyalangan to‘lov provayderidagi operatsiya qaydi | Order/Application, Provider |
| AuditLog | Muhim amallar tarixi | Actor, Action, Target |

## 4. Joriy kalitlardan maqsadli obyektlarga mapping

| Joriy kalit/jadval | Maqsadli obyekt | Migratsiya qarori |
|---|---|---|
| `projects` | Project | Asosiy loyiha manbai. `index`, `projects`, `project-detail`, `marketplace`, `profile` bir xil loyiha ID orqali bog‘lanishi kerak. |
| `investors` | Profile extension yoki Organization | Investor shaxsmi yoki tashkilotmi aniqlanadi; ommaviy va maxfiy maydonlar ajratiladi. |
| `investorRequests` | InvestorInterest / Application | `investmentApplications` bilan bir xil jarayonmi yoki investor bilan bog‘lanish so‘rovimi — biznes qoidasi aniqlanmaguncha qo‘shib yuborilmaydi. |
| `investmentApplications` | Application(type=investment) | Project ID va applicant Account ID majburiy bog‘lanadi. |
| `teams` | Organization yoki ProjectTeam | Mustaqil tashkilot va loyiha ichidagi jamoa tushunchalari ajratiladi. |
| `teamApplications` | Application(type=team_join) | Team/Organization ID va applicant ID bilan bog‘lanadi. |
| `jobs` / SQL `job_posts` | Listing(type=job) | Vakansiya egasi Organization yoki Account bo‘ladi. |
| `jobApplications` | Application(type=job) | Job Listing ID va applicant ID bilan bog‘lanadi. |
| Mutaxassis profili kaliti | Profile extension | Profile ID bilan bog‘lanadi; resume faqat private storage va ruxsatli URL orqali. |
| `offers` | Listing(type=offer) | Taklifning yagona katalog yozuvi. |
| `offerApplications` | Application(type=offer) | Offer Listing ID va applicant ID bilan bog‘lanadi. |
| `offerMessages` | Conversation / Message | Xabar faqat ariza ishtirokchilariga ko‘rinadi. |
| `ideaLabExchangeItems` | Listing(type=need/offer) | `type`, title, description, category, location, owner va contact maydonlari standartlashtiriladi. |
| `resourceOrders` / SQL `resource_orders` | Order | Resurs e’loni, buyurtmachi, sotuvchi, miqdor, narx va holat bog‘lanadi. |
| `userProfile` / `ideaLabCurrentUser` | Profile / Account | Ikki xil profil manbasi yagona Auth Account va Profile modeliga o‘tadi; email/telefon maxfiy saqlanadi. |

## 5. SQL draftdagi mavjud jadvallar

Hozirgi `supabase/schema.sql` tarkibida quyidagi 19 jadval aniqlandi:

- Profil va katalog: `profiles`, `projects`, `teams`, `job_posts`, `specialist_profiles`, `offers`, `investors`, `resources`.
- Arizalar va buyurtmalar: `project_investment_applications`, `team_applications`, `job_applications`, `offer_applications`, `resource_orders`, `event_registrations`.
- Loyiha hamkorligi: `project_members`, `project_tasks`, `project_updates`.
- Suhbat va tadbirlar: `offer_messages`, `events`.

Bu ro‘yxat SQL faylida borligini anglatadi, Supabase loyihasiga qo‘llanganini yoki jonli ishlayotganini anglatmaydi.

## 6. Muhim bog‘lanish qoidalari

1. **Account → Profile:** bitta autentifikatsiya identifikatoriga bitta asosiy profil.
2. **Project → Owner:** loyiha egasi Account yoki Organization bo‘lishi mumkin; ikkala egani bir vaqtda belgilashga yo‘l qo‘yilmaydi.
3. **Project → Applications:** investitsiya arizasi aynan bitta Project ID ga tegishli.
4. **Listing → Applications:** ish, jamoa, taklif va resurs murojaatlari yagona Application qoidalariga o‘tadi, lekin target turiga mos FK yoki server tekshiruvi bo‘lishi shart.
5. **Application → Conversation:** suhbat ariza bilan bog‘lanadi; ishtirokchilar serverda tekshiriladi.
6. **Organization → Members:** a’zolik alohida jadvalda; rolni oddiy foydalanuvchi o‘zi oshira olmaydi.
7. **Order → Transaction:** buyurtma va to‘lov alohida holatlar. Platforma bank emas; to‘lov faqat tegishli litsenziyali provayder orqali.
8. **Profile contact:** telefon, email va shaxsiy hujjatlar ochiq katalog yoki umumiy hodisa logiga kiritilmaydi.

## 7. Ma’lumotlar sifati tekshiruvlari

Migratsiya oldidan har bir yozuv quyidagi tekshiruvlardan o‘tishi shart:

- eski ID va yangi UUID o‘rtasida mapping mavjudligi;
- egasi/applicant ID topilishi yoki yozuv karantinga ajratilishi;
- bog‘langan Project/Listing/Team mavjudligi;
- majburiy maydonlar bo‘sh emasligi;
- status ruxsat etilgan qiymatlardan biri ekanligi;
- sana ISO/UTC formatiga keltirilishi;
- pul qiymati decimal va valyuta kodi bilan saqlanishi;
- dublikatlar aniqlanishi;
- maxfiy aloqa maydonlari ommaviy ko‘rinishdan ajratilishi.

Noto‘g‘ri yoki egasiz yozuvlar avtomatik o‘chirilmaydi; alohida hisobot/karantin ro‘yxatiga chiqariladi.

## 8. Migratsiya ketma-ketligi

1. Avval joriy browser storage kalitlari va maydonlari bo‘yicha to‘liq inventar.
2. Har bir kalit uchun field-by-field mapping va noma’lum maydonlar ro‘yxati.
3. Test ma’lumotlar to‘plamida eksport, zaxira va qayta tiklash sinovi.
4. Supabase test loyihasida jadvallar, foreign key, unique constraint va RLS testlari.
5. Bitta modulni pilot sifatida serverga ulash; avval o‘qish, keyin yozish.
6. Eski va yangi natijalarni solishtirish; xato bo‘lsa rollback.
7. Foydalanuvchi roziligi bilan bosqichma-bosqich import.
8. Faqat barcha tekshiruvlardan keyin eski localStorage yozuvlarini arxivlash; darhol o‘chirmaslik.

## 9. Hozircha ochiq qolgan qarorlar

- `investorRequests` va `investmentApplications`ning aniq farqi.
- `teams` mustaqil Organizationmi yoki ProjectTeammi.
- Mutaxassis profilining joriy storage kalitining aniq qiymati va barcha maydonlari.
- `resource_orders` uchun narx, miqdor va buyurtma holati biznes qoidalari.
- `userProfile` va `ideaLabCurrentUser` o‘rtasidagi ustuvor manba.
- `marketplace.html` hozir loyiha katalogini ko‘rsatadi; uni mahsulot/xizmat listinglariga aylantirish alohida mahsulot bosqichi bo‘ladi.

## 10. Chegaralar

Ushbu hujjat faqat tahlil va ma’lumotlar xaritasi. HTML sahifalar, mavjud localStorage, SQL schema yoki Supabase loyihasi o‘zgartirilmadi. Hech qanday ma’lumot ko‘chirilmadi. Real auth, server sinxronlash, to‘lov yoki foydalanuvchilararo maxfiy chat mavjud deb hisoblanmaydi.


## 12. Identity mapping — aniqlangan farqlar

| Joriy maydon/oqim | Muammo | Maqsadli mapping |
|---|---|---|
| userProfile.id | Brauzer demo identifikatori | Keyinchalik Account/Profile UUID bilan bog'lash |
| userProfile.roles | Faoliyat va vakolatni chalkashtirish xavfi | ProfileCapability; platform role emas |
| projects.ownerEmail | Email o'zgarishi va dublikat xavfi | owner_account_id yoki owner_organization_id |
| teams va companyName | Jamoa, tashkilot va ish beruvchi farqi aniq emas | Organization va ProjectMembershipni ajratish |
| ideaLabSpecialists | Asosiy profildan alohida saqlanadi | specialist_profiles.profile_id |
| investors | Shaxs/tashkilot turi noaniq | ProfileCapability yoki Organization |
| Vakansiya egasi | Kompaniya nomi matn sifatida | owner_account_id yoki organization_id |

Hozirgi localStorage yozuvlari o'zgartirilmagan. Bu mapping migratsiya tayyorgarligi, import yoki o'chirish amali emas.
