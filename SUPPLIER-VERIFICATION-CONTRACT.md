# IDEA LAB — Ta’minotchini tekshirish jarayoni

Versiya: 1.5 · Sana: 2026-11-20  
Holat: backend migration tayyorlandi; jonli Supabase loyihasiga qo‘llangani tasdiqlanmagan.

## 1. Maqsad
Ta’minotchi profili va platformada qayd etilgan buyurtmalar tarixini mustaqil tekshiruvdan alohida ko‘rsatish. Profil ochish, hujjat belgisi kiritish yoki buyurtma statistikasi hech qachon “tasdiqlangan” maqomini bermaydi.

## 2. Ariza holatlari
| Machine status | UI nomi | Kim o‘zgartiradi |
|---|---|---|
| submitted | Ariza yuborildi | Ta’minotchi |
| under_review | Ko‘rib chiqilmoqda | Vakolatli reviewer |
| needs_more_info | Qo‘shimcha ma’lumot kerak | Vakolatli reviewer |
| approved | Mustaqil tekshiruvdan o‘tgan | Vakolatli reviewer |
| rejected | Tekshiruvdan o‘tmadi | Vakolatli reviewer |

Frontend demo faqat submitted holatini yaratadi. Brauzerda reviewer action yoki approved holatini belgilash funksiyasi yo‘q.

## 3. Ma’lumotlarni minimallashtirish
- Demo/localStorage ichida pasport, STIR, bank hisob raqami, karta raqami yoki to‘liq hujjat nusxasi saqlanmaydi.
- Backend evidence jadvali private storage yo‘li va minimal metadata uchun; Storage va API faqat alohida migration/Edge Function orqali boshqariladi.
- Hujjatlar keyinchalik alohida private bucket, qisqa muddatli signed URL, ruxsatli backend va retention/deletion siyosati bilan ulanadi.
- Rozilik versiyasi va server vaqti ariza bilan qayd etiladi.

## 4. Backend migration — 2026-11-16
Fayl: supabase/migrations/20261116_supplier_verification.sql

Migration uchta jadval yaratadi:
- supplier_verification_applications — ariza, status, rozilik va reviewer qarori uchun server maydonlari.
- supplier_verification_evidence — private hujjat storage path va cheklangan metadata.
- supplier_verification_events — ariza yuborilganda avtomatik yoziladigan audit hodisasi.

Xavfsizlik chegaralari:
1. Ariza egasi triggerda auth.uid() orqali belgilanadi; client yuborgan supplier ID qabul qilinmaydi.
2. Client faqat o‘z arizasini yuborishi va o‘qishi mumkin.
3. Client ariza statusi, reviewer, qaror yoki audit eventlarni o‘zgartira olmaydi.
4. Evidence jadvaliga client uchun hech qanday ruxsat berilmaydi.
5. Har bir supplier uchun bitta faol ariza partial unique index bilan cheklanadi.
6. Ariza yuborilishi avtomatik ravishda boshlang‘ich audit event yozadi.
7. Reviewer qarorlari keyingi migration'dagi server-side allowlist va atomik RPC orqali bajariladi.

## 5. Reviewer vakolati va qarorlar — 2026-11-17
Fayl: supabase/migrations/20261117_supplier_verification_reviewers.sql

- `supplier_verification_reviewers` — reviewer allowlist. Jadvalga client huquqi berilmagan; reviewer tayinlash/faolsizlantirish faqat ishonchli server/service-role operatsiyasi bilan bajariladi.
- `is_supplier_verification_reviewer()` — active reviewer ekanini serverdagi allowlist orqali tekshiradi.
- `review_supplier_verification_application(...)` — `auth.uid()` bilan reviewer identifikatsiyasi, application row lock, ruxsat etilgan status o'tishlari va audit eventni bitta transactionda bajaradi.
- `approved` uchun dalil metama’lumoti va verification type talab qilinadi. `needs_more_info` va `rejected` uchun izoh talab qilinadi.
- Reviewer bekor qilinsa, u arizalar navbatini ko‘ra olmaydi va qaror qabul qila olmaydi.

Bu migration reviewer tayinlash interfeysi, MFA sozlamasi, hujjat Storage bucket'i yoki upload API yaratmaydi. Reviewerlar faqat tashkilot vakolati va mas’ul kattalar tomonidan tekshirilganidan keyin tayinlanishi kerak. Real shaxsiy hujjatlarni test muhitiga yuklamang.

## 6. Maxfiy hujjatlar saqlash arxitekturasi — 2026-11-18
Fayl: supabase/migrations/20261118_supplier_verification_private_storage.sql

- supplier-verification-private nomli private bucket; public URL orqali o‘qish o‘chirilgan.
- Fayl hajmi 10 MiB bilan cheklangan; ruxsat etilgan MIME turlari PDF, JPEG va PNG.
- Fayl yo‘li {application_id}/{document_type}/{opaque_filename} shaklida bo‘lishi shart.
- Ta’minotchi faqat o‘zining submitted yoki needs_more_info arizasi ichiga yuklashi mumkin.
- Ta’minotchi o‘z hujjatini, faol reviewer esa tekshiruv uchun hujjatni o‘qiy oladi.
- Client uchun object update/delete siyosati yo‘q; o‘chirish yoki almashtirish keyinchalik alohida server-side auditli jarayon bo‘lishi kerak.

Bu bo‘lim private bucket va Storage RLS poydevorining o‘sha paytdagi holatini qayd etadi. Keyingi 2026-11-19 bo‘limida Edge Function poydevori qo‘shilgan. MIME header fayl mazmunining xavfsizligini isbotlamaydi. Real hujjatlarni hali yuklamang.

## 7. Hujjat API poydevori — 2026-11-19
Fayllar: `supabase/functions/supplier-verification-evidence/` va `supabase/migrations/20261119_supplier_verification_evidence_access_audit.sql`.

Edge Function uchta amalni qo‘llab-quvvatlaydi:
- `upload_ticket`: JWT tekshiriladi, ariza egasi va holati tekshiriladi, server tasodifiy object path va vaqtinchalik upload token beradi.
- `finalize_upload`: object mavjudligi, papkasi, Storage metadata MIME turi va hajmi tekshiriladi; keyin evidence metadata server orqali yoziladi.
- `download_ticket`: faqat ariza egasi yoki active reviewer uchun 60 soniyalik signed URL beradi va link berilganini auditga yozadi.

Service-role kaliti faqat Edge Function secret bo‘lishi shart. Brauzerga hech qachon berilmaydi. CORS aniq `ALLOWED_ORIGINS` ro‘yxatiga bog‘langan. API javoblari `no-store`.

Cheklovlar: fayl mazmuni antivirus yoki haqiqiylik tekshiruvidan o‘tmaydi; MIME metadata yetarli xavfsizlik isboti emas. Audit faqat link berilganini qayd etadi, yuklab olish sodir bo‘lganini emas. Reviewer vakolati hozir global allowlist — case-level assignment yo‘q. Rate limit, retention cleanup va o‘chirish jarayoni yo‘q. Function deploy qilinmagan, migration staging'da bajarilmagan. Haqiqiy hujjatlar bilan ishlash hali boshlanmasin.

## 8. Sinov holati
`tests/supplier-verification-migration.test.cjs`, `tests/supplier-verification-reviewers.test.cjs`, `tests/supplier-verification-storage.test.cjs` va `tests/supplier-verification-evidence-api.test.cjs` migration/API matnining xavfsizlik shartlarini statik tekshiradi. Bu SQL parser, Deno runtime testi, Postgres integratsion test yoki jonli Storage RLS sinovi emas. Migration faqat alohida staging loyihasida qo‘llanib, ikki akkauntli testdan o‘tkazilgandan keyin foydalanishga yaroqli deb baholanadi.


## 9. Arizaga biriktirilgan reviewerlar — 2026-11-20
Fayl: `supabase/migrations/20261120_supplier_verification_case_assignments.sql`

- `supplier_verification_review_assignments` har bir ariza uchun reviewer biriktirilishini saqlaydi.
- Assignment jadvaliga authenticated/anon client uchun hech qanday ruxsat berilmaydi; tayinlash va bekor qilish faqat ishonchli backend/service-role orqali bajariladi.
- `can_review_supplier_verification_application(application_id)` foydalanuvchining reviewer allowlist'da faol ekanini va aynan shu arizaga faol biriktirilganini tekshiradi.
- Ariza, audit hodisalari va private Storage obyektlarini reviewer sifatida o‘qish endi case-level assignment bilan cheklanadi.
- Qaror RPC ham faol assignment bo‘lmasa rad etadi. Reviewer global allowlist'da bo‘lishining o‘zi yetarli emas.
- Assignment bekor qilinganda keyingi o‘qish va qaror so‘rovlari bloklanadi. Reviewerning o‘zi deaktivatsiya qilinsa ham ruxsat bekor bo‘ladi.
- Bir reviewer uchun bir arizada faqat bitta faol assignment bo‘lishi mumkin; eski yozuvlar tarix uchun saqlanadi.

Migration tayinlash interfeysi yoki avtomatik taqsimlash algoritmini yaratmaydi. Ishonchli server operatsiyasi assignment yaratishda application va reviewer mavjudligini, vakolatini hamda tashkilot ichidagi tasdiqni tekshirishi shart. SQL migration staging'da qo‘llanmaguncha bu cheklovlar jonli tizimda faol emas.

## 10. Sinov holati
`tests/supplier-verification-migration.test.cjs`, `tests/supplier-verification-reviewers.test.cjs`, `tests/supplier-verification-storage.test.cjs`, `tests/supplier-verification-evidence-api.test.cjs` va `tests/supplier-verification-case-assignments.test.cjs` statik kontrakt tekshiruvlaridir. Ular Postgres RLS integratsion sinovi o‘rnini bosmaydi.

## 11. Qabul mezonlari
- [ ] Test Supabase loyihasi va egasi tasdiqlangan.
- [ ] Backup va restore sinovi bajarilgan.
- [ ] Migration staging'da qo‘llangan.
- [ ] Ikki supplier va kamida ikki reviewer bilan case-level RLS sinovlari o'tgan.
- [ ] Assignment berish/bekor qilish serverda audit bilan ishlaydi.
- [ ] Reviewer faqat biriktirilgan arizalar va hujjatlarni ko‘radi.
- [ ] Demo holati real tekshiruv sifatida ko‘rsatilmaydi.
