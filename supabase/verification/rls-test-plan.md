# RLS test rejasi — ikki foydalanuvchili staging

Faqat alohida test Supabase loyihasida, maxfiy bo'lmagan test yozuvlari bilan bajariladi.

## Tayyorlash

- User A va User B — alohida auth akkauntlar.
- A ga tegishli active project, draft project, active job, active offer, active resource.
- B ga tegishli project va application.
- A project'iga A owner, B esa oddiy applicant/member bo'lsin.

## Kutiladigan natijalar

| Sinov | Amal | Kutiladigan natija |
|---|---|---|
| RLS-01 | A o'z profilini o'qiydi | Ruxsat |
| RLS-02 | A B profilini bevosita o'qiydi | Qator qaytmaydi |
| RLS-03 | A o'z `roles` qiymatini o'zgartiradi | Trigger rad etadi |
| RLS-04 | B A active project'ga ariza beradi | Ruxsat, applicant=B |
| RLS-05 | B draft project'ga ariza beradi | Rad |
| RLS-06 | B boshqa applicant nomidan ariza yuboradi | Rad |
| RLS-07 | A o'z project'iga kelgan arizani ko'radi | Ruxsat |
| RLS-08 | B A ning boshqa applicant arizasini ko'radi | Qator qaytmaydi |
| RLS-09 | B o'z arizasini accepted qiladi | Rad yoki update policy ruxsat bermaydi |
| RLS-10 | A o'z target arizasini reviewing qiladi | Ruxsat |
| RLS-11 | B A ning offer application xabarini o'qiydi | Rad |
| RLS-12 | B o'z project task'ini boshqa projectga ko'chiradi | Trigger rad etadi |
| RLS-13 | B task creator yoki assigned_to ni o'zgartiradi | Trigger rad etadi |
| RLS-14 | anon public directory view o'qiydi | Rad |
| RLS-15 | authenticated view'dan telefon/email/resume_path qidiradi | Bunday ustunlar yo'q |

Har bir testda SQL/API natijasi, akkaunt roli, vaqt va staging project ref yozib borilsin. Test tugagach, test yozuvlari tozalanishi mumkin; production ma'lumotlariga tegilmaydi.
