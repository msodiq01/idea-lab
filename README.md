# IDEA LAB

Global Project-to-Market Ecosystem

## Lokal ishga tushirish

Loyiha oddiy HTML/CSS/JavaScript frontend prototipidir. Repository papkasida lokal HTTP server ishga tushiring, so'ng brauzerda `index.html` yoki `dashboard.html` sahifasini oching. Faylni bevosita ochish ayrim brauzer cheklovlariga sabab bo'lishi mumkin.

## Organization Center

`organizations.html` — kompaniya va tashkilot profili, demo a'zolar hamda loyiha bog'lanishlari uchun offline prototip. Ma'lumotlar shu brauzerning `localStorage` xotirasidagi `ideaLab.core.organizations` kalitida saqlanadi. Bu haqiqiy akkaunt, server sinxronlash, yuridik verifikatsiya yoki haqiqiy ruxsat tizimi emas.

## Testlar

Node.js o'rnatilgan muhitda repository ildizidan:

```bash
node --test tests/*.test.cjs
```

Testlar frontend yadro va Organization Center uchun avtomatik tekshiruvlarni bajaradi. To'liq brauzer, mobil qurilma va backend sinovlari alohida talab qilinadi.

## Muhim cheklovlar

- Server/Supabase hozircha ulanmagan.
- Brauzer localStorage yozuvlari boshqa qurilmalar yoki foydalanuvchilar bilan ulashilmaydi.
- To'lov, investitsiya, tashkilot verifikatsiyasi va maxfiy hujjatlar bilan bog'liq haqiqiy operatsiyalar mavjud emas.
- Demo ma'lumotlariga shaxsiy maxfiy ma'lumotlarni kiritmang.


## Navigatsiya va accessibility

- Umumiy menyu barcha asosiy sahifalarda bitta navigatsiya sifatida ishlaydi.
- Klaviatura foydalanuvchilari uchun “Asosiy kontentga o‘tish” havolasi mavjud.
- Faol sahifa `aria-current` bilan belgilanadi; menyu Escape tugmasi va tashqi bosish bilan yopiladi.
- Mobil menyudagi havolalar uchun kattaroq bosish maydonlari va ko‘rinadigan fokus holati qo‘llanadi.
- Harakatni kamaytirish sozlamasi yoqilgan qurilmalarda animatsiyalar cheklanadi.

Tekshiruv: `node --test tests/*.test.cjs`. Bu avtomatik strukturaviy/regressiya testi; haqiqiy ekran o‘lchamlarida brauzer sinovi alohida bajarilishi kerak.


## Backend va xavfsizlikka tayyorgarlik

Backend hozircha **offline demo**. Supabase schema/migration tayyorlangan, lekin hech qanday loyiha credentials yoki server ulanishi tasdiqlanmagan. SQL'ni production'da ishga tushirmang.

- [Backend integratsiya shartnomasi](BACKEND-INTEGRATION-CONTRACT.md)
- [Xavfsizlik ko'rigi](BACKEND-SECURITY-REVIEW.md)
- [Legacy migratsiya qo'llanmasi](DATA-MIGRATION-RUNBOOK.md)
- [Legacy data mapping](LEGACY-DATA-MAPPING.md)
- [API xatolari katalogi](API-ERROR-CATALOG.md)
- [Supabase tayyorlash va fayllar tartibi](supabase/README.md)
- [Read-only xavfsizlik auditi SQL](supabase/verification/security_audit.sql)
- [Ikki foydalanuvchili RLS test rejasi](supabase/verification/rls-test-plan.md)

Avtomatik tekshiruv: `node --test tests/*.test.cjs`. Bu statik/regressiya testlari; haqiqiy Supabase RLS sinovi staging loyihasida alohida bajariladi.
