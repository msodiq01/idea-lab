# IDEA LAB

Global Project-to-Market Ecosystem

## Lokal ishga tushirish

Loyiha HTML/CSS/JavaScript frontend va qisman ulangan Supabase backenddan iborat. Lokal tekshiruv uchun repository papkasida HTTP server ishga tushiring, so‘ng `index.html` yoki `dashboard.html` sahifasini oching. Faylni bevosita ochish ayrim brauzer cheklovlariga sabab bo‘lishi mumkin.

## Organization Center

`organizations.html` — kompaniya va tashkilot profili, demo a'zolar hamda loyiha bog'lanishlari uchun offline prototip. Ma'lumotlar shu brauzerning `localStorage` xotirasidagi `ideaLab.core.organizations` kalitida saqlanadi. Bu haqiqiy akkaunt, server sinxronlash, yuridik verifikatsiya yoki haqiqiy ruxsat tizimi emas.

## Platforma poydevori\n\nUmumiy validatsiya, xatolar, ariza status qoidalari, ommaviy profil DTO va offline adapter: [20 ta poydevor vazifasi](PLATFORM-FOUNDATION-20.md). Bu frontend yordamchilari server RLS yoki haqiqiy autentifikatsiya o'rnini bosmaydi.\n\n## Testlar

Node.js o'rnatilgan muhitda repository ildizidan:

```bash
node --test tests/*.test.cjs
```

Testlar frontend yadro va Organization Center uchun avtomatik tekshiruvlarni bajaradi. To'liq brauzer, mobil qurilma va backend sinovlari alohida talab qilinadi.

## Muhim cheklovlar

- Supabase loyihasi faol va backend sxemasi/migratsiyalari mavjud. Dashboard, loyiha katalogi, loyiha yaratish/ariza yuborish oqimlari hamda ochiq resurs katalogining ayrim qismlari server bilan ishlaydi.
- Ko‘plab eski bo‘limlar hali `localStorage` demo rejimida. Bunday yozuvlar boshqa qurilmalar yoki foydalanuvchilar bilan ulashilmaydi.
- Resurslar sahifasidagi shaxsiy inventar mahalliy saqlanadi; server katalogi faqat ommaviy takliflarni o‘qiydi.
- Investorlar bo‘limi namuna ma’lumotlar bilan ishlaydigan demo. Haqiqiy sarmoya, to‘lov yoki pul o‘tkazmasi amalga oshirilmaydi.
- Supabase Auth’da hozircha foydalanuvchilar yo‘q; ikki akkauntli RLS sinovi va desktop/mobile brauzer sinovi hali bajarilishi kerak.
- Profil sahifasi kirilgan Auth akkauntining shaxsiy user metadata maydonlariga profilni sinxronlay oladi. Eski localStorage profilini boshqa akkauntga ulash faqat foydalanuvchi aniq tasdiqlaganidan keyin bajariladi; avatar hozircha mahalliy saqlanadi.
- Demo ma’lumotlariga maxfiy shaxsiy ma’lumotlarni kiritmang.


## Navigatsiya va accessibility

- Umumiy menyu barcha asosiy sahifalarda bitta navigatsiya sifatida ishlaydi.
- Klaviatura foydalanuvchilari uchun “Asosiy kontentga o‘tish” havolasi mavjud.
- Faol sahifa `aria-current` bilan belgilanadi; menyu Escape tugmasi va tashqi bosish bilan yopiladi.
- Mobil menyudagi havolalar uchun kattaroq bosish maydonlari va ko‘rinadigan fokus holati qo‘llanadi.
- Harakatni kamaytirish sozlamasi yoqilgan qurilmalarda animatsiyalar cheklanadi.

Tekshiruv: `node --test tests/*.test.cjs`. Bu avtomatik strukturaviy/regressiya testi; haqiqiy ekran o‘lchamlarida brauzer sinovi alohida bajarilishi kerak.


## Backend va xavfsizlikka tayyorgarlik

Supabase backendi **faol**, lekin platformaning barcha modullari serverga ko‘chirilmagan. Ommaviy kataloglar `security_invoker` viewlar orqali, shaxsiy ma’lumotlar esa RLS va autentifikatsiya orqali himoyalanadi. Mavjud production ma’lumotlarini o‘chirmang; schema o‘zgarishlarini migratsiya va alohida tekshiruvsiz qo‘llamang.

- [Backend integratsiya shartnomasi](BACKEND-INTEGRATION-CONTRACT.md)
- [Legacy profil egaligini tasdiqlash va xavfsiz import shartnomasi](LEGACY-PROFILE-OWNERSHIP-PROOF.md)
- [Xavfsizlik ko'rigi](BACKEND-SECURITY-REVIEW.md)
- [Legacy migratsiya qo'llanmasi](DATA-MIGRATION-RUNBOOK.md)
- [Legacy data mapping](LEGACY-DATA-MAPPING.md)
- [API xatolari katalogi](API-ERROR-CATALOG.md)
- [Supabase tayyorlash va fayllar tartibi](supabase/README.md)
- [Read-only xavfsizlik auditi SQL](supabase/verification/security_audit.sql)
- [Ikki foydalanuvchili RLS test rejasi](supabase/verification/rls-test-plan.md)

Avtomatik tekshiruv: `node --test tests/*.test.cjs`. GitHub Actions PR #104 run #506 muvaffaqiyatli yakunlangan; yangi premium dizayn PR uchun alohida CI natijasi tekshiriladi. Haqiqiy Supabase RLS sinovi ikki alohida test akkaunti bilan, browser smoke test esa desktop va mobil qurilmada bajarilishi shart.


## Modul zanjirlari va premium dizayn

- Barcha asosiy sahifalar yagona premium vizual qatlam, navigatsiya, mobil moslashuv va fokus holatlaridan foydalanadi; kirish sahifasi o‘zining ixcham sarlavhasini saqlaydi.
- Server belgisi backend konfiguratsiyasi mavjudligini va qolgan modullar demo ekanini alohida ko‘rsatadi; bu butun platforma serverga ulandi degani emas.
- Har bir modulning haqiqiy ma’lumot manbasi, hozirgi integratsiya darajasi va keyingi bog‘lanish zanjiri [Modul va ma’lumotlar zanjiri xaritasi](MODULE-CONNECTION-MATRIX.md) hujjatida qayd etilgan.
