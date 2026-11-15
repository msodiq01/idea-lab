# IDEA LAB — Investitsiya mablag‘ini resurs va hisob bilan bog‘lash

Holat: **mahsulot va ma’lumotlar shartnomasi**. Bu hujjat SQL migration yoki real pul o‘tkazmasini yoqmaydi.

## 1. Maqsad

Har bir investor o‘z mablag‘i qaysi resursga yo‘naltirilayotganini, resurs egasini, qabul qiluvchi hisob egasini va tanlangan hisobni aniq ko‘ra olishi kerak. Mablag‘ bir nechta resursga taqsimlansa, har bir ulush alohida qayd etiladi.

IDEA LAB bank yoki elektron hamyon emas. Platforma hisob, kelishuv, to‘lov ko‘rsatmasi va provayder tasdiqlagan tranzaksiya holatini qayd etishi mumkin; bankdagi pulni o‘zi ko‘chirmaydi va to‘liq karta/bank rekvizitlarini saqlamaydi.

## 2. Ishtirokchilar va javobgarlik

- **Investor:** investitsiya so‘rovini yuboradi, aynan qaysi resurs va qaysi qabul qiluvchi hisobga to‘lashini tekshiradi, ko‘rsatmani qabul qiladi.
- **Resurs egasi:** resursni e’lon qiladi, moliyalashtirish shartlarini belgilaydi va resurs uchun qaysi hisob ishlatilishini taklif qiladi.
- **Hisob egasi:** hisob o‘ziga tegishli ekanini va shu resurs uchun foydalanishga roziligini tasdiqlaydi. Hisob egasi resurs egasidan boshqa shaxs bo‘lishi mumkin.
- **Platforma:** tomonlar, resurs, hisob, summa, valyuta, ko‘rsatma va tranzaksiya yozuvlarini bog‘laydi; pulni saqlamaydi yoki o‘tkazmaydi.
- **To‘lov provayderi/bank:** haqiqiy to‘lovni amalga oshiradi va mavjud bo‘lsa, tasdiqlangan tranzaksiya identifikatori/holatini beradi.

## 3. Ma’lumotlar zanjiri

`Investor → Investment → Resource → Payment instruction → Destination account → Money transfer → Transfer allocation`

Har bir bog‘lanish serverda tekshiriladigan ID orqali amalga oshadi. Ism, email, telefon yoki brauzer yuborgan matn hisob egasini yoki ruxsatni aniqlash uchun yetarli dalil emas.

### Mavjud jonli jadval poydevori

Ulangan Supabase loyihasida quyidagi obyektlar mavjud:
- `resources`: resurs egasi, turi, nomi, holati va ko‘rinishi.
- `resource_accounts`: resursga bog‘langan hisob, hisob egasi, hisob turi, provayder, ko‘rinadigan yorliq va niqoblangan identifikator.
- `investments`: investor, resurs, summa, valyuta va investitsiya holati.
- `money_transfers`: jo‘natuvchi, qabul qiluvchi, manba/qabul hisobi, summa, valyuta va transfer holati.
- `transfer_allocations`: bitta transfer summasining investitsiya/resurslar bo‘yicha taqsimoti.

Hozirgi jonli RLS investorning o‘z investitsiya yozuvini o‘qishga ruxsat beradi, ammo `resource_accounts` o‘qish policy'si faqat hisob egasi yoki resurs egasini qamrab oladi. Shu sabab investor o‘z investitsiyasiga tegishli qabul qiluvchi hisobni hozir bevosita ko‘ra olmaydi. Bu — aniqlangan, hali tuzatilmagan funksional/ruxsat bo‘shlig‘i.

## 4. Taklif etiladigan qo‘shimcha bog‘lanish

### A. Hisobdan foydalanish vakolati

Hisob egasi resurs uchun hisobdan foydalanishga rozilik bergan bo‘lishi kerak. Buni alohida server boshqaradigan authorization yozuvi bilan yuritish taklif qilinadi:
- resource_id
- resource_account_id
- account_owner_id
- status: pending / approved / rejected / revoked
- confirmed_at, confirmed_by
- created_at, updated_at

Faqat `approved` holatdagi faol hisob to‘lov ko‘rsatmasiga tanlanadi. Hisob egasi roziligini qaytarib olsa, yangi ko‘rsatma yaratish bloklanadi.

### B. Investitsiya to‘lov ko‘rsatmasi

Har bir investitsiya uchun alohida ko‘rsatma yozuvi:
- investment_id
- resource_id
- destination_account_id
- created_by (resurs egasi yoki vakolatli tashkilot vakili)
- status: offered / accepted / replaced / withdrawn / expired
- offered_at, accepted_at, expires_at
- investor tasdiqlagan ko‘rsatma versiyasi

Bir investitsiya uchun bir vaqtda faqat bitta amaldagi ko‘rsatma bo‘ladi. Investor tasdiqlagan ko‘rsatma keyinchalik o‘zgarsa, eski rozilik yangi hisobga avtomatik ko‘chmaydi; yangi ko‘rsatma qayta tasdiqlanadi.

### C. Transfer va taqsimot

- Transfer investitsiyaga bog‘langan bo‘lsa, jo‘natuvchi investor aynan shu investitsiyaning egasi bo‘lishi kerak.
- Qabul qiluvchi hisob tanlangan va investor qabul qilgan ko‘rsatmadagi hisob bilan bir xil bo‘lishi kerak.
- Transfer recipient_id qiymati destination account egasiga mos kelishi kerak.
- Transfer va allocation valyutalari mos bo‘lishi shart.
- Bir nechta resursga taqsimlangan transferda allocation summalari transfer summasiga teng bo‘lishi kerak.
- Transferni `confirmed` qilish faqat ishonchli provayder webhook'i yoki vakolatli server jarayoni orqali bo‘ladi. Investor yoki resurs egasi o‘zi to‘lovni tasdiqlab qo‘ya olmaydi.

## 5. Investor va boshqa tomonlar nimani ko‘radi?

| Tomon | Ko‘rish huquqi |
|---|---|
| Anonim mehmon | Faqat ommaga ochiq resurs kartasi; hisob ma’lumoti yo‘q |
| Investor | O‘z investitsiyasi, unga biriktirilgan va tasdiqlash uchun taklif qilingan hisob, o‘z transferlari va taqsimotlari |
| Boshqa investor | Begona investitsiya va tanlangan hisobni ko‘rmaydi |
| Resurs egasi | O‘z resursi, unga tegishli hisoblar, tegishli investitsiyalar va transferlar |
| Hisob egasi | O‘z hisob yozuvi va undan foydalanish vakolati/rozilik holati |
| Moderator/admin | Faqat aniq vakolat, zarur maydonlar va audit izi bilan |

Investor ko‘radigan hisob ma’lumoti:
- bank/provayder nomi;
- hisob turi;
- ko‘rinadigan hisob yorlig‘i;
- niqoblangan identifikator (masalan, oxirgi raqamlar);
- hisob egasining rozilik bergan ommaviy ko‘rinadigan nomi;
- qaysi resurs va qaysi investitsiyaga tegishliligi.

To‘liq karta raqami, CVV, PIN, internet-bank login/paroli yoki boshqa maxfiy autentifikatsiya ma’lumoti platformada saqlanmaydi va investor katalogida ko‘rsatilmaydi.

## 6. RLS va server qoidalari

1. Investor faqat `investments.investor_id = auth.uid()` bo‘lgan yozuvlarni ko‘radi.
2. Investor faqat o‘z investitsiyasiga aniq bog‘langan destination account yozuvini ko‘radi; shu resursdagi boshqa hisoblar avtomatik ochilmaydi.
3. Destination account aynan ko‘rsatmadagi resource_id bilan mos keladi va faol/approved bo‘ladi.
4. Resurs egasi boshqa foydalanuvchining hisobini uning roziligisiz ulay olmaydi.
5. Hisob egasi o‘z hisobining egasi bo‘lib qoladi; hisob egasi IDsi client yuborgan qiymatdan emas, autentifikatsiya qilingan sessiyadan tekshiriladi.
6. Foydalanuvchi `user_roles` yoki admin/reviewer vakolatini o‘zi bera olmaydi.
7. Payment instruction, transfer status va audit event'larni o‘zgartirish server-side qoidalar bilan bajariladi.
8. RLS policy bilan birga jadval/ustun grantlari ham tekshiriladi; policy grant o‘rnini bosmaydi.
9. Har bir maxfiy amal actor, action, target, timestamp va xavfsiz metadata bilan audit qilinadi.

## 7. Staging qabul sinovlari

- Investor A o‘z investitsiyasi uchun taklif qilingan hisobni ko‘radi.
- Investor A boshqa resursdagi yoki boshqa investorga biriktirilgan hisobni ko‘ra olmaydi.
- Investor B Investor A ko‘rsatmasi va hisobini ko‘ra olmaydi.
- Anonim foydalanuvchi hech qanday hisob ma’lumotini ko‘ra olmaydi.
- Resurs egasi faqat o‘z resursi uchun hisob ko‘rsatmasi yaratadi.
- Hisob egasi rozilik bermagan yoki roziligini qaytargan hisob ko‘rsatmaga tanlanmaydi.
- Hisob o‘zgartirilsa, investor yangi ko‘rsatmani qayta qabul qilmaguncha transfer ochilmaydi.
- Noto‘g‘ri recipient, resurs/account mos kelmasligi, valyuta farqi yoki allocation summasi mos kelmasligi rad etiladi.
- Investor o‘z transferini `confirmed` holatiga o‘tkaza olmaydi.
- Har bir o‘zgarish audit tarixida server tomonidan qayd etiladi.
- To‘liq karta/bank rekvizitlari, maxfiy kalitlar va shaxsiy kontaktlar boshqa tomonga chiqmaydi.

## 8. Joriy qaror

Hozirgi Supabase bazasida investor uchun destination-account ko‘rish policy'si qo‘shilmagan, to‘lov ko‘rsatmasi bog‘lanishi yo‘q va client write grantlari berilmagan. Bu hujjat keyingi migration va RLS testlariga tayyor shartnoma hisoblanadi; jonli bazaga qo‘llash uchun avval aniq staging loyihasi, backup/restore sinovi va ikki investor + resurs egasi + hisob egasi bilan qabul sinovlari kerak.
