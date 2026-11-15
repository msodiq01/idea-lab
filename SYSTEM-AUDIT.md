# IDEA LAB — tizimlashtirish auditi

Sana: 2026-11-15  
Repository: `msodiq01/idea-lab` / `main`  
Maqsad: backend ulanishidan oldin mavjud sahifalar, ma'lumotlar oqimi, modullar va xavfsizlik chegaralarini yagona standartga keltirish.

## 1. Audit doirasi va cheklov

Tekshiruv repositorydagi HTML, umumiy CSS/JS, `PLATFORM-MAP.md`, `README.md`, `supabase/schema.sql` va mavjud security migration fayliga tayandi. Inline JavaScript sintaksisi, takroriy HTML ID'lar va ichki havolalar manba darajasida ko'rib chiqildi.

Bu audit real brauzerda barcha foydalanuvchi oqimlarini bajarish, Supabase loyihasiga kirish yoki migration amalda qo'llanganini tekshirish degani emas. Hozircha hech qanday mavjud sahifa yoki ma'lumot o'zgartirilmadi.

## 2. Hozirgi modullar xaritasi

| Modul / sahifa | Vazifasi | Hozirgi ma'lumot manbasi | Holat |
|---|---|---|---|
| `index.html` | Bosh sahifa, loyiha yaratish | `projects`, `userProfile` | Brauzer demo |
| `dashboard.html` | Umumiy ko'rsatkichlar va faoliyat | bir nechta localStorage kalitlari | Brauzer demo |
| `projects.html` | Loyihalar katalogi, qidiruv/filtr | `projects` | Brauzer demo |
| `project-detail.html` | Loyiha tafsiloti, investitsiya arizasi | `projects`, `investmentApplications` | Brauzer demo |
| `investors.html` | Investor katalogi, so'rovlar, arizalarni ko'rib chiqish | `investors`, `investorRequests`, `investmentApplications` | Brauzer demo |
| `teams.html` | Jamoalar, vakansiyalar, a'zolik va ish arizalari | `teams`, `jobs`, `teamApplications`, `jobApplications` | Brauzer demo |
| `specialists.html` | Mutaxassis profillari | `ideaLabSpecialists` | Brauzer demo |
| `offers.html` | Takliflar, arizalar va xabarlar | `offers`, `offerApplications`, `offerMessages` | Brauzer demo |
| `marketplace.html` | Loyiha ma'lumotlarini bozor ko'rinishida ko'rsatish | `projects` | Cheklangan demo; alohida tovar/order tizimi emas |
| `exchange.html` | Talab va taklif e'lonlari | `ideaLabExchangeItems`, qisman `projects`/`offers` | Brauzer demo |
| `profile.html` | Profil va shaxsiy faoliyat | `userProfile` va ariza kalitlari | Brauzer demo |
| `assets/idea-shell.css/js` | Umumiy navigatsiya va dizayn qobig'i | Statik fayllar | Umumiy qatlam |

## 3. Aniqlangan localStorage ma'lumot kalitlari

| Kalit | Ishlatiladigan ma'lumot | Keyingi backend jadvali / yo'nalishi |
|---|---|---|
| `userProfile` | Foydalanuvchi nomi, email, telefon, tanlangan rollar | `profiles` |
| `ideaLabCurrentUser` | Takliflar modulidagi mahalliy foydalanuvchi yorlig'i | Auth foydalanuvchisi + `profiles`; mustaqil identifikator bo'lmasin |
| `projects` | Loyihalar | `projects` |
| `investmentApplications` | Loyihaga investitsiya arizalari | `project_investment_applications` |
| `investors` | Investor profillari | `investors` |
| `investorRequests` | Investor bilan hamkorlik so'rovlari | Alohida jadval yoki aniq qayta ishlangan application modeli kerak |
| `teams` | Jamoalar | `teams` |
| `jobs` | Vakansiyalar | `job_posts` |
| `teamApplications` | Jamoaga qo'shilish arizalari | `team_applications` |
| `jobApplications` | Ishga arizalar | `job_applications` |
| `ideaLabSpecialists` | Mutaxassis profillari | `specialist_profiles` |
| `offers` | Takliflar | `offers` |
| `offerApplications` | Taklifga arizalar | `offer_applications` |
| `offerMessages` | Taklif arizasi bo'yicha xabarlar | `offer_messages` |
| `ideaLabExchangeItems` | Talab/taklif e'lonlari | Hozirgi sxemada aniq mos jadval yo'q; `exchange_listings` modeli kerak bo'lishi mumkin |
| `resourceOrders` | Resurs buyurtmalari | `resource_orders` |

Eslatma: localStorage kalitlari browser profiliga tegishli. Bir qurilmadagi turli foydalanuvchilar ma'lumotlari aralashishi mumkin; boshqa qurilmadagi foydalanuvchiga avtomatik ko'rinmaydi. `ideaLabCurrentUser` autentifikatsiya o'rnini bosmaydi.

## 4. Muhim nomuvofiqliklar va tuzatish navbati

1. **Mutaxassislar sahifasidagi vakansiya havolasi:** `specialists.html` ichida `jobs.html` havolasi bor, lekin repositoryda bunday sahifa yo'q. Vakansiyalar hozir `teams.html#career-section` ichida. Keyingi UI tuzatishda shu yagona manzilga yo'naltirish kerak.
2. **Investor so'rovlari modeli:** `investorRequests` uchun `schema.sql` da alohida jadval ko'rinmaydi. Uni investitsiya arizasidan farqlash yoki bitta aniq application modeli ostida birlashtirish kerak.
3. **Talab-taklif modeli:** `ideaLabExchangeItems` uchun alohida jadval yo'q. Bu e'lonlar `offers` bilan bir xil tushuncha emasligi aniqlanib, turi va egasi bo'lgan aniq model belgilanishi kerak.
4. **Profil va foydalanuvchi identifikatori:** `userProfile` va `ideaLabCurrentUser` ikki xil mahalliy usul. Backenddan oldin yagona `auth.users.id` → `profiles.id` identifikatoriga o'tish kerak.
5. **Ariza holatlari:** UI'dagi o'zbekcha statuslar (masalan, “Ko'rib chiqilmoqda”, “Suhbat belgilandi”) va SQL'dagi inglizcha statuslar (masalan, `new`) uchun bitta enum/qiymat lug'ati va tarjima qatlami belgilanmagan.
6. **Vakansiya va jamoa arizalari boshqaruvi:** hozirgi employer/organizer panellari bir xil brauzerdagi localStorage ma'lumotini ko'rsatadi; ular haqiqiy rol yoki egasi tekshiruvi emas. Backendda faqat tegishli e'lon/jamoa egasi boshqara olishi shart.
7. **Marketplace:** hozir asosan loyihalarni qayta ko'rsatadi. Haqiqiy mahsulot, xizmat, narx, ombor, buyurtma, sotuvchi va xaridor oqimlari hali to'liq yo'q.
8. **README:** hozir faqat qisqa loyiha nomi bor; o'rnatish, sahifalar xaritasi, demo cheklovlari va release tartibi hujjatlashtirilmagan.

## 5. Supabase tayyorgarligi

- `supabase/schema.sql` da 19 ta asosiy jadval, foreign key'lar, indekslar, RLS yoqish buyruqlari va policy'lar mavjud.
- `supabase/migrations/20261115_security_hardening.sql` ham repositoryda bor. Faylning o'zida u review uchun tayyorlangani, backup va target Supabase loyihasi tasdiqlanmaguncha ishga tushirilmasligi yozilgan.
- Migration ommaviy katalog view'lari, profil rollarini o'z-o'zidan oshirishni cheklash, faol e'lonlarga ariza topshirish va task identifikatorini himoyalashni ko'zlaydi.
- Bu migration amalda qo'llangan degani emas. Hozirgi auditda Supabase loyihasining real holati tasdiqlanmadi.
- Keyingi tekshiruvda view'lar uchun grantlar, view owner/security invoker xususiyatlari, RLS policy'larning bir-biriga ta'siri, application owner tekshiruvlari va profile role boshqaruvi sinovdan o'tkazilishi kerak.
- Frontendga faqat public/anon key kiritilishi mumkin; service-role yoki boshqa maxfiy kalit brauzerga joylashtirilmaydi.

## 6. Yagona mahsulot modeli — taklif

IDEA LAB ma'lumotlarini quyidagi asosiy obyektlar atrofida standartlashtirish:

- **Account / Profile:** bitta autentifikatsiya identifikatori, kontakt maxfiyligi, tasdiqlangan rollar.
- **Organization:** kompaniya, jamoa, muassasa va loyiha tashkilotchisi.
- **Project:** loyiha, egasi, yo'nalish, holat, resurs va a'zolar.
- **Listing:** vakansiya, talab, taklif, mahsulot/xizmat va resurs e'loni; har bir listing aniq turi va egasiga ega.
- **Application:** loyiha investitsiyasi, ish, jamoa, taklif yoki resurs bo'yicha murojaat; application turi va maqsad obyektiga bog'langan.
- **Conversation:** faqat ariza/bitim ishtirokchilari ko'ra oladigan xabarlar.
- **Transaction (keyingi bosqich):** buyurtma, invoice, to'lov holati va tashqi litsenziyalangan to'lov provayderi identifikatorlari. IDEA LAB o'zi bank yoki to'lov tashkiloti sifatida ko'rsatilmaydi.
- **Audit log:** muhim holat o'zgarishlari, kim va qachon bajargani.

## 7. Tavsiya etilgan ish bosqichlari

1. **Tuzilmani barqarorlashtirish:** README, sahifalar xaritasi, yagona terminlar, ichki havolalar va umumiy shell.
2. **Ma'lumot shartnomalari:** har bir obyekt uchun majburiy maydonlar, ID, egasi, status, vaqt tamg'asi va bog'lanishlar.
3. **UI funksional sinovi:** sahifalararo yaratish → ko'rish → ariza → javob → status oqimlari.
4. **Xavfsizlik modeli:** public/private maydonlar, rollar, ownership va RLS test matritsasi.
5. **Backend migratsiyasi:** avval test loyihada, backup bilan, keyin frontend ulanishi.
6. **Release tekshiruvi:** ikki yoki undan ortiq test akkaunt, mobil/desktop, xatolik va ruxsat sinovlari.

## 8. Manba darajasidagi tekshiruv

- 11 ta asosiy HTML sahifadagi inline JavaScript sintaksisi tekshirildi; parse xatolari topilmadi.
- Tekshirilgan sahifalarda takroriy HTML ID aniqlanmadi.
- Repositorydagi fayllar ro'yxati bilan ichki havolalar solishtirildi; `specialists.html` dagi `jobs.html` havolasi mavjud bo'lmagan faylga ishora qiladi.
- Bu natijalar to'liq brauzer testlari yoki real backend testi o'rnini bosmaydi.

## 9. Hozircha ataylab bajarilmagan ishlar

- Supabase SQL ishga tushirilmadi.
- Mavjud jadval yoki foydalanuvchi ma'lumotlari o'zgartirilmadi.
- localStorage ma'lumotlari migratsiya qilinmadi.
- Sahifalarning funksional xatti-harakati o'zgartirilmadi.
- To'lov, investitsiya, shaxsni tasdiqlash yoki huquqiy jihatdan tartibga solinadigan funksiyalar real xizmat sifatida e'lon qilinmadi.
