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
