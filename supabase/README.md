# Supabase tayyorlash

Bu papkadagi SQL — IDEA LAB backendini tayyorlash uchun. Hozir frontend Supabase'ga ulanmagan.

## Fayllar tartibi

1. `schema.sql` — boshlang'ich jadvallar, indekslar, RLS va triggerlar.
2. `migrations/20261115_security_hardening.sql` — katalog view'lari va qo'shimcha xavfsizlik cheklovlari.
3. `migrations/20261116_supplier_verification.sql` — ta’minotchi tekshiruvi uchun qo‘shimcha jadvallar va cheklangan RLS.
4. `migrations/20261117_supplier_verification_reviewers.sql` — server tomonidan boshqariladigan reviewer allowlist va atomik qaror RPC.
5. `migrations/20261118_supplier_verification_private_storage.sql` — private hujjat bucket'i va Storage RLS siyosatlari.
6. `migrations/20261119_supplier_verification_evidence_access_audit.sql` — vaqtinchalik yuklab olish havolasi berilganini qayd etuvchi audit jadvali.
7. `migrations/20261120_supplier_verification_case_assignments.sql` — reviewerlarni alohida arizalarga biriktirish va o‘qish/qaror ruxsatlarini shu biriktirish bilan cheklash.
7. `verification/security_audit.sql` — read-only tekshiruv so'rovlari.

## Ishga tushirishdan oldin

- To'g'ri Supabase project ref va uning egasi tasdiqlansin.
- Yangi test project yarating; production bazada sinamang.
- Mavjud baza bo'lsa, to'liq backup va restore sinovini bajaring.
- SQL fayllarini staging'da birma-bir qo'llang.
- `BACKEND-SECURITY-REVIEW.md` va `supabase/verification/rls-test-plan.md` bo'yicha tekshiring.
- Migration SQL'ni ko'rmasdan production'da Run bosmang.

## Kalitlar

Faqat frontend uchun mo'ljallangan publishable/anon key ishlatilishi mumkin. Service-role key, database password va access token hech qachon HTML, JS, GitHub repository yoki brauzerga kiritilmaydi. `.env.example` faqat nomlar shabloni; real credential emas.

## Hozirgi holat

- Schema tayyorlangan: ha.
- Security migration tayyorlangan: ha.
- Jonli loyiha bilan bog'langan: yo'q.
- SQL staging'da bajarilgan: tasdiqlanmagan.
- Auth va server API ishlayapti: yo'q.
- LocalStorage import qilingan: yo'q.

## Ta’minotchi hujjatlari Edge Function

`functions/supplier-verification-evidence/` ichida autentifikatsiyalangan upload-ticket, upload-finalization va download-ticket API poydevori bor. Sozlash, client protokoli, maxfiy kalitlar va staging qabul mezonlari shu papkadagi README'da. Function deploy qilinmagan va real hujjat qabul qilishga hali ruxsat berilmaydi.

## Reviewer case-level assignment

`migrations/20261120_supplier_verification_case_assignments.sql` migration'i reviewerning umumiy allowlist vakolatini har bir arizaga alohida biriktirish bilan cheklaydi. Assignment jadvaliga faqat trusted service-role operatsiyasi kira oladi. Ariza, audit event va Storage evidence o‘qishlari hamda qaror RPC faol assignment talab qiladi.

Bu migration hali qo‘llanmagan. Assignment berish/bekor qilish API'si, MFA va jonli RLS testlari alohida ishlab chiqilishi kerak. Production'da qo‘llamang; avval staging va ikki reviewer/two supplier sinovidan o'tkazing.
