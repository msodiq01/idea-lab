# RLS test rejasi — ikki foydalanuvchili staging

Bu reja RLS siyosatlarini ikki mustaqil foydalanuvchi kontekstida tekshirish uchun mo'ljallangan. Faqat alohida staging Supabase loyihasida, sintetik ma'lumotlar bilan bajariladi. Bu hujjatning o'zi testlarni bajarmaydi va production xavfsizligini tasdiqlamaydi.

## Xavfsiz bajarish qoidalari

- Production loyihasida sinov o'tkazmang.
- User A va User B alohida Auth akkauntlari bo'lsin; bir xil JWT yoki bir xil brauzer sessiyasini qayta ishlatmang.
- Faqat sintetik ism, email, telefon va loyiha ma'lumotlaridan foydalaning.
- Klient so'rovlarida faqat tegishli foydalanuvchining JWT va anon/publishable key ishlatiladi. Service-role key brauzerga, test logiga yoki repoga kiritilmaydi.
- Har bir ruxsat/rad natijasini A va B sessiyalarida alohida qayd eting.
- Har bir testdan keyin kutilmagan yozuvlar yaratilmaganini tekshiring; test yozuvlarini faqat staging'da tozalang.
- Kutilmagan ruxsat aniqlansa, testni to'xtating va natijani qayd eting; production'da tajriba qilmang.

## Tayyorlash

1. Staging loyiha ref'i va frontend origin'ini qayd eting.
2. User A va User B ni alohida ro'yxatdan o'tkazing va JWT'larini xavfsiz test muhitida oling.
3. A ga tegishli active project, draft project, active job, active offer va active resource yarating.
4. B ga tegishli alohida project va application yarating.
5. A project'iga A owner, B esa faqat ruxsat berilgan applicant/member bo'lsin.
6. Har bir yozuv ID'sini test qaydnomasida saqlang; haqiqiy shaxsiy ma'lumotlardan foydalanmang.

## Ikki foydalanuvchili test matritsasi

| ID | Kontekst va amal | Kutiladigan natija |
|---|---|---|
| RLS-01 | A o'z profilini o'qiydi | Ruxsat |
| RLS-02 | A B profilini bevosita o'qiydi | Qator qaytmaydi yoki ruxsat rad etiladi |
| RLS-03 | A o'z profilidagi role/roles qiymatini o'zgartiradi | Rad; rol o'zgarmaydi |
| RLS-04 | B A ning active/published project'iga o'z nomidan ariza beradi | Ruxsat; applicant identity B bo'ladi |
| RLS-05 | B A ning draft project'iga ariza beradi | Rad |
| RLS-06 | B boshqa foydalanuvchi nomidan ariza yuborishga urinadi | Rad; identity JWT'dan olinadi |
| RLS-07 | A o'z project'iga kelgan arizalarni o'qiydi | Faqat owner sifatida ko'rishi mumkin bo'lgan arizalar |
| RLS-08 | B A ning boshqa applicant arizasini o'qiydi | Qator qaytmaydi yoki rad |
| RLS-09 | B o'z arizasi statusini o'zi accepted/rejected qiladi | Rad |
| RLS-10 | A o'z target project arizasi statusini ruxsat etilgan holatga yangilaydi | Policy doirasida ruxsat |
| RLS-11 | B A ga tegishli offer application/message'ni o'qiydi | Ruxsatsiz qator qaytmaydi |
| RLS-12 | B project task'ni boshqa project'ga ko'chiradi | Rad; project_id o'zgarmaydi |
| RLS-13 | B task creator identity'sini o'zgartiradi | Rad; created_by o'zgarmaydi |
| RLS-14 | B boshqa foydalanuvchi task'ini egallash yoki qayta tayinlashga urinadi | Faqat aniq ruxsat etilgan owner amali mumkin; aks holda rad |
| RLS-15 | anon public directory view'larni o'qiydi | Rad |
| RLS-16 | authenticated foydalanuvchi public directory view'larni o'qiydi | Faqat allowlist qilingan ustunlar ko'rinadi |
| RLS-17 | Public view'dan phone/email/telegram/resume_path kabi private ustunlarni so'raydi | Ustunlar view'da mavjud emas |
| RLS-18 | B boshqa foydalanuvchining resource order yoki application yozuvini o'zgartiradi | Rad |
| RLS-19 | A va B bir-birining team/job/offer application yozuvlarini bevosita o'qiydi | Faqat owner/applicant uchun belgilangan qatorlar ko'rinadi |
| RLS-20 | Authenticated user public directory view'ga INSERT/UPDATE/DELETE yuboradi | Rad |

## Har bir test uchun qayd

- Test ID va bajarilgan sana/vaqt.
- Staging project ref (maxfiy bo'lmagan identifikator).
- A yoki B sessiyasi; JWT qiymatini yozmang.
- Amal turi va test yozuvi ID'si.
- Kutilgan natija va amaldagi natija.
- HTTP/SQL xato kodi yoki qaytgan qatorlar soni; tokenlar va shaxsiy ma'lumotlarni loglamang.
- Pass/Fail va kuzatilgan tafovut.

## Yakuniy qabul mezonlari

- Ruxsatsiz o'qishlarda begona qatorlar qaytmaydi.
- Ruxsatsiz yozish va status/role o'zgarishlari rad etiladi.
- Ariza egasi klient yuborgan user ID bilan emas, autentifikatsiyalangan foydalanuvchi bilan bog'lanadi.
- Public view'lar faqat tasdiqlangan maydonlarni chiqaradi va anon uchun yopiq.
- Test natijalari A va B sessiyalari bo'yicha qayd etilgan.
- Har qanday kutilmagan ruxsat — release blocker; policy tuzatilmaguncha staging qabul qilinmaydi.

## Cheklov

Bu staging acceptance rejasi statik RLS contract testlarining o'rnini bosmaydi va ularning o'zi ham real ikki-user runtime test o'rnini bosa olmaydi. Ushbu testlar hali bajarilmagan bo'lsa, natijani "verified" deb belgilamang.
