# RLS test rejasi — ikki foydalanuvchili staging

Faqat alohida test Supabase loyihasida, maxfiy bo'lmagan sintetik yozuvlar bilan bajariladi. Bu hujjat sinov rejasi; u bazaga ulanmaydi va migratsiyalarni ishga tushirmaydi.

## 1. Xavfsiz tayyorlash

- User A va User B — alohida, oddiy `authenticated` auth akkauntlari.
- Har bir akkaunt uchun alohida access token ishlatiladi; tokenlar log, issue yoki repoga yozilmaydi.
- A ga tegishli active va draft project, active job, active offer, active resource yarating.
- B ga tegishli alohida project va tegishli application yarating.
- A project'iga A owner, B esa faqat ruxsat berilgan applicant/member bo'lsin.
- Zarur bo'lsa, alohida uchinchi `anon` konteksti bilan public-view tekshiruvini bajaring.
- Service-role kalitini brauzerga yoki test foydalanuvchisiga bermang. Testni production'da bajarmang.

## 2. Ikki foydalanuvchili qabul sinovlari

| ID | Aktyor | Amal | Kutiladigan natija |
|---|---|---|---|
| RLS-01 | A | O'z profilini o'qiydi | Ruxsat |
| RLS-02 | A | B profilini bevosita o'qiydi | B qatori qaytmaydi |
| RLS-03 | A | O'z `roles` qiymatini o'zgartiradi | Trigger rad etadi |
| RLS-04 | B | A ning active/published project'iga ariza yuboradi | Ruxsat; applicant A emas, B bo'ladi |
| RLS-05 | B | A ning draft project'iga ariza yuboradi | Rad |
| RLS-06 | B | Boshqa foydalanuvchi nomidan project arizasi yuboradi | Rad |
| RLS-07 | A | O'z project'iga kelgan arizalarni o'qiydi | Ruxsat |
| RLS-08 | B | A project'idagi boshqa applicant arizasini o'qiydi | Qator qaytmaydi |
| RLS-09 | B | O'z arizasi statusini `accepted` qiladi | Rad |
| RLS-10 | A | O'z project'idagi arizani ruxsat etilgan review statusiga o'tkazadi | Ruxsat |
| RLS-11 | B | A ga tegishli offer application/message'ni o'qiydi | Ruxsat berilmagan qator qaytmaydi |
| RLS-12 | B | A ning job application yozuvini o'zgartiradi | Rad |
| RLS-13 | B | A ning team application yozuvini o'zgartiradi | Rad |
| RLS-14 | B | Boshqa requester nomidan resource order yaratadi | Rad |
| RLS-15 | B | A ning resource order yoki project update yozuvini o'qiydi | Faqat aniq policy ruxsat bergan ma'lumot; aks holda qator qaytmaydi |
| RLS-16 | B | O'z project task'ini boshqa project'ga ko'chiradi | Trigger rad etadi |
| RLS-17 | B | Task creator yoki ruxsatsiz assignee'ni almashtiradi | Trigger/policy rad etadi |
| RLS-18 | A va B | Project member va event registration yozuvlarini bir-biridan o'qish/yozishga urinadi | Faqat tegishli owner/member/participant policy ruxsat bergan amal o'tadi |
| RLS-19 | anon | Public directory view'larni o'qiydi | Rad |
| RLS-20 | authenticated | Public view'dan telefon/email/resume_path/private contact maydonlarini so'raydi | Bunday ustunlar view'da mavjud emas |
| RLS-21 | B | A ning project/team/job/offer/resource asosiy jadvalidagi private yozuvlarini bevosita o'qiydi | Faqat aniq policy ruxsat bergan qatorlar qaytadi; public view grant'i asosiy jadvalga kirish bermaydi |

### Resource va status bo'yicha qo'shimcha aniqlik

- Project investment application faqat target project ruxsat etilgan `active` yoki `published` holatda bo'lganda yaratilishi kerak.
- Job, offer va resource arizalari tegishli target faol bo'lmaganda yaratilmasligi kerak.
- Har bir insert'da applicant/requester identifikatori server tomonda `auth.uid()` bilan bog'langanini tekshiring.
- `offer_messages`, `project_members`, `project_tasks`, `project_updates`, `events` va `event_registrations` uchun test akkauntlari bilan real policy natijasini yozib boring; faqat UI yashirganini xavfsizlik isboti deb qabul qilmang.

## 3. Har bir sinovda qayd etiladigan dalillar

1. Staging project ref (maxfiy bo'lmagan identifikator), sana-vaqt va test ID.
2. Aktyor: A, B yoki anon; uning roli va yozuvga egalik munosabati.
3. Amal turi, jadval/view va sintetik yozuv ID.
4. HTTP/API yoki SQL natijasi: ruxsat, bo'sh natija yoki aniq rad javobi.
5. Kutilgan va olingan natija mos kelgan-kelmaganligi.

Token, parol, service-role kaliti, haqiqiy shaxsiy ma'lumot yoki haqiqiy hujjatlarni dalilga qo'shmang.

## 4. Yakunlash va cheklovlar

- Testlar tugagach, faqat shu sinov uchun yaratilgan sintetik yozuvlarni staging'dan tozalang.
- Production ma'lumotlariga tegmang.
- Har bir testni alohida A va B tokenlari bilan bajaring; bitta akkauntda role almashtirib ikki foydalanuvchini taqlid qilmang.
- Bu reja real staging natijalarini o'zi tasdiqlamaydi. Qabul xulosasi faqat sinovlar bajarilib, dalillar tekshirilgandan keyin beriladi.
