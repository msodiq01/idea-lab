# IDEA LAB — 10 yo‘nalishli texnik audit va ish rejasi

Sana: 2026-11-15
Repo: `msodiq01/idea-lab`
Branch: `main`
Bosqich: frontendni serverga ulamasdan tizimlashtirish

## Ushbu bosqichda bajarilgan 10 ta ish

1. **Asosiy sahifalar inventarizatsiyasi** — bosh sahifa, dashboard, loyihalar, loyiha tafsiloti, investorlar, jamoalar, takliflar, mutaxassislar, kabinet va talab/taklif sahifalari ko‘rib chiqildi.
2. **Umumiy navigatsiya auditi** — `assets/idea-shell.js` va `assets/idea-shell.css` alohida tekshirildi.
3. **Markaziy yadro auditi** — `assets/idea-core.js` dagi store, legacy adapter va hodisalar ko‘rib chiqildi.
4. **Ma’lumot kalitlari auditi** — legacy allowlist ichida `teamApplications` va `jobApplications` takrorlanganligi aniqlandi.
5. **Xavfsiz kod tozalash** — faqat takroriy ikki allowlist yozuvi olib tashlandi; kalitlarning o‘zi va foydalanuvchi ma’lumotlari o‘zgartirilmadi.
6. **Navigatsiya ko‘rsatkichlarini markazlashtirish** — umumiy shell metrikalari endi mavjud bo‘lsa `IDEALAB.legacy.read()` orqali o‘qiydi; core bo‘lmagan holat uchun eski o‘qish fallback’i saqlandi.
7. **Jonli metrika yangilanishi** — shu sahifadagi `legacy:changed` hodisasidan so‘ng umumiy ko‘rsatkichlar qayta hisoblanadi.
8. **Brauzerlararo tab yangilanishi** — `storage` hodisasi orqali boshqa tabdagi mos yozuvlar o‘zgarishi ham metrikalarni yangilaydi.
9. **Hujjatlarni to‘g‘rilash** — pilot integratsiya sahifalari soni to‘qqizta deb yangilandi.
10. **Xavfsizlik va test yuzasini ko‘rib chiqish** — dinamik HTML ishlatiladigan joylar, localStorage bog‘liqligi va qo‘lda tekshirilishi kerak bo‘lgan oqimlar belgilandi. Bu statik ko‘rik; to‘liq brauzer xavfsizlik testi emas.

## O‘zgargan fayllar

- `assets/idea-core.js` — takroriy allowlist yozuvlari olib tashlandi.
- `assets/idea-shell.js` — metrikalar markaziy adapterga va yangilanish hodisalariga ulandi.
- `CORE-LAYER.md` — integratsiya holati to‘g‘rilandi.
- `QUALITY-ROADMAP.md` — ushbu audit va keyingi ish rejasi.

## Keyingi 10 ta katta ish rejasi

1. **Barcha sahifalardagi saqlash qatlamini yakunlash** — qolgan to‘g‘ridan-to‘g‘ri localStorage chaqiruvlarini xaritalash va adapterga xavfsiz ulash.
2. **Yagona ma’lumot modeli** — loyiha, profil, tashkilot, jamoa, mutaxassis, e’lon va ariza obyektlari uchun maydonlar lug‘atini yakunlash.
3. **Navigatsiya va marshrut auditi** — barcha havolalar, redirectlar, anchorlar va mavjud bo‘lmagan sahifalarni tekshirish.
4. **Formalar validatsiyasi** — majburiy maydonlar, uzunliklar, telefon/email va xato xabarlarini yagona qilish.
5. **XSS va maxfiylik auditi** — foydalanuvchi kiritgan qiymatlarning DOMga chiqishini tekshirish; aloqa va shaxsiy ma’lumotlar oshkor bo‘lishini kamaytirish.
6. **UI/UX bir xilligi** — tugmalar, kartalar, modal oynalar, bo‘sh holatlar va statuslarni umumiy dizayn tizimiga keltirish.
7. **Mobil va accessibility sinovi** — kichik ekran, klaviatura navigatsiyasi, label, fokus va kontrastni tekshirish.
8. **Asosiy foydalanuvchi oqimlari** — ro‘yxatdan o‘tish demo, loyiha yaratish, ariza, jamoaga qo‘shilish, taklif va chat oqimlarini sinash.
9. **Avtomatlashtirilgan tekshiruvlar** — JavaScript parse, havola tekshiruvi, ma’lumot shakli va regressiya testlari uchun yengil test to‘plami.
10. **Backendga tayyorlik hujjati** — API chegaralari, ruxsatlar, audit log, fayl saqlash, to‘lov provayderi va migratsiya talablarini aniqlash; hozircha serverga ulanmaslik.

## Hozircha ataylab o‘chirilmagan narsalar

- HTML sahifalar va foydalanuvchi oqimlari.
- CSS/JS fayllar va rasmlar — ularning ishlatilmasligi to‘liq isbotlanmagan.
- localStorage yozuvlari va eski kalitlar.
- Supabase sxemasi va konfiguratsiya loyihalari.
- Demo chat, e’lon va arizalar.

## Cheklov va qabul mezoni

Bu bosqich GitHub manba kodining statik auditi va kod darajasidagi tekshiruvlardan iborat. Haqiqiy brauzer, Android ekran o‘lchamlari, turli qurilmalar, real foydalanuvchi ma’lumotlari yoki backend bilan sinov bajarilgani haqida da’vo qilinmaydi. Keyingi har bir bosqichda o‘zgargan fayllar, test natijalari va qolgan xavflar alohida qayd etiladi.


## 2026-11-15 — avtomatlashtirilgan core testlari

Yangi `tests/core.test.cjs` fayli Node.js built-in test runner bilan 11 ta testni qamrab oladi: offline holat, allowlist, store CRUD, noto‘g‘ri JSON fallback, legacy read/write/inspect, backup, HTML escaping, email/telefon validatsiyasi, event unsubscribe, status/sana va storage xatolari.

Ishga tushirish: `node --test tests/core.test.cjs`.

Bu testlar markaziy core funksiyalarini Node VM ichida tekshiradi; brauzer UI, mobil ko‘rinish, sahifalararo to‘liq oqim yoki backendni tekshirmaydi.


## 2026-11-15 — yagona akkaunt va tashkilot modeli

### 10 ta bajarilgan tahlil ishi
1. Account va Profile tushunchalari ajratildi.
2. Faoliyat yo'nalishlari va xavfsizlik rollari farqi belgilandi.
3. Organization mustaqil obyekt sifatida ta'riflandi.
4. OrganizationMembership rollari va holatlari belgilandi.
5. ProjectMembership tashkilot a'zoligidan ajratildi.
6. Project egasining shaxs yoki tashkilot bo'lish qoidasi belgilandi.
7. SpecialistProfile asosiy Profile kengaytmasi sifatida belgilandi.
8. Employer, Investor va Supplier faoliyat yo'nalishlari sifatida tasniflandi.
9. Hozirgi profil, email-based ownership, team, vacancy va specialist oqimlaridagi farqlar qayd etildi.
10. Maxfiy/public maydonlar hamda serverda tekshirilishi shart bo'lgan ruxsatlar hujjatlashtirildi.

### Yangi hujjat
- `IDENTITY-MODEL.md` — yagona akkaunt, profil, tashkilot, a'zolik, loyiha rollari va maxfiylik qoidalari.

### Keyingi 10 ish
1. Profil UI atamalarini faoliyat yo'nalishlariga moslashtirish.
2. Profil formasining mobil va desktop UX tekshiruvi.
3. Tashkilot yaratish uchun serverga ulanmagan UI prototipi.
4. Tashkilot profilining public/private ko'rinishlari.
5. Tashkilot a'zolarini boshqarish prototipi.
6. Loyiha a'zoligi va tashkilot a'zoligini alohida ko'rsatish.
7. Loyiha egasini email emas, ID bilan bog'lash uchun demo model rejasini tuzish.
8. Vakansiya egasi va tashkilot bog'lanishi prototipi.
9. Mutaxassis profilini asosiy profil bilan bog'lash rejasi.
10. Oqimlar uchun brauzer test ssenariylari va regressiya ro'yxati.

Hech qanday HTML, SQL, localStorage yozuvi yoki server sozlamasi ushbu hujjatlashtirish bosqichida o'zgartirilmadi.


## 2026-11-15 — Organization Center offline prototype

### Bajarilgan ishlar
1. `organizations.html` yangi tashkilotlar markazi yaratildi.
2. Tashkilot yaratish formasi: nom, turi, joylashuv, sayt va tavsif.
3. Tashkilotlar ro'yxati va tanlangan tashkilot tafsilotlari.
4. Demo a'zolarni ism va rol bilan qo'shish.
5. A'zolikni o'chirmasdan nofaol holatga o'tkazish.
6. Mavjud loyihalarni ID orqali tashkilotga bog'lash; asl loyiha yozuvlari o'zgarmaydi.
7. Tashkilotlar ma'lumoti markaziy `IDEALAB.store` orqali `ideaLab.core.organizations` kalitida saqlanadi.
8. Global navigatsiyaga "Tashkilotlar" bo'limi qo'shildi.
9. Dashboard tezkor amallariga Organization Center havolasi qo'shildi.
10. Offline demo, maxfiylik va haqiqiy vakolatlar serverga bog'liqligi interfeysda ochiq ko'rsatildi.

### Cheklovlar
- Bu bitta brauzerdagi prototip; foydalanuvchilararo ulashish yoki haqiqiy jamoaviy login yo'q.
- A'zo yozuvlari faqat demo ismlardan iborat; telefon, email va hujjat talab qilinmaydi.
- Tashkilot verifikatsiyasi va haqiqiy ruxsatlar mavjud emas.
- Eski localStorage ma'lumotlari ko'chirilmadi, o'chirilmadi va qayta yozilmadi.

### Keyingi 10 ish
1. Tashkilot profilini tahrirlash UX.
2. Tashkilot avatar/logo uchun xavfsiz preview prototipi.
3. A'zolarni qidirish va rol bo'yicha filtrlash.
4. A'zolik taklifi holatlari (demo).
5. Tashkilot loyihalari uchun alohida ko'rinish.
6. Loyiha bog'lanishlarini tekshirish va bekor qilish UX.
7. Mobil qurilmalarda barcha formalarni sinash.
8. Klaviatura bilan boshqarish va accessibility tekshiruvi.
9. Saqlash xatolari va noto'g'ri ma'lumotlar uchun testlar.
10. Tashkilot markazi uchun regressiya checklist.

