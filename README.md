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
