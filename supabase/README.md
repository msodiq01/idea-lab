# Supabase tayyorlash

Bu papkadagi SQL — IDEA LAB umumiy backendini tayyorlash uchun. Ulangan Supabase loyihasi mavjud, ammo hozirgi frontend hali offline-demo rejimida va ushbu papkadagi keng schema/migrationlar jonli bazaga qo‘llanmagan.

## Yangi IDEA LAB ilova sxemasi (draft)

- `migrations/20261116120000_idea_app_identity_organizations.sql` — alohida `idea_app` sxemasida profil, maxfiy kontakt, tashkilot va tashkilot a'zoligi poydevori.
- `migrations/20261116130000_idea_app_projects_teams.sql` — loyiha, jamoa a'zoligi, vazifalar va yangiliklar moduli; birinchi identity/organization migration'iga bog'liq.
- `migrations/20261116140000_idea_app_projects_rls.sql` — loyiha, jamoa, vazifa va yangiliklar uchun RLS siyosatlari drafti. Faqat repository'da; jonli Supabase'ga qo'llanmagan.
- `migrations/20261116150000_idea_app_project_member_commands.sql` — taklifni qabul/rad etish, qo'shilish so'rovini tasdiqlash/rad etish, ixtiyoriy chiqish, owner-only rol o'zgarishi va task tayinlash uchun himoyalangan triggerlar. Faqat repository draft.
- Membership va task amallari ochiq SECURITY DEFINER RPC orqali emas, SECURITY INVOKER triggerlari + ustun darajasidagi UPDATE grantlari + RLS orqali bajariladi.
- Bitta qo'shimcha private membership lookup SECURITY DEFINER: faqat authenticated uchun EXECUTE, `auth.uid()` talab qiladi, `search_path = ''`, `idea_private` ichida va Data API'ga expose qilinmaydi.
- Taskni boshqa a'zoga faqat owner/manager tayinlaydi; maqsad foydalanuvchi loyiha owneri yoki active a'zo bo'lishi shart.
- Qabul sinovlari: `verification/project-commands-acceptance.md`; read-only preflight endi command triggerlarini ham tekshiradi.

- RLS yordamchi funksiyalari hech qachon Data API'ga expose qilinmasligi kerak bo'lgan alohida `idea_private` sxemasida. Ular `auth.uid()` bilan tekshiradi, qat'iy `search_path` ishlatadi va faqat `authenticated` uchun EXECUTE oladi.
- Jadval grantlari berilmagan; `idea_app` Data API'ga expose qilinmagan. Shuning uchun policy drafti hozircha brauzerga kirish bermaydi.
- Qabul sinovlari: `verification/project-rls-acceptance.md`; read-only staging tekshiruvi: `verification/project-rls-preflight.sql`.
- Ataylab cheklangan: membership status/role o'zgarishi server tranzaksiyasiga qoldirilgan; boshqa foydalanuvchiga task tayinlash yo'q; self-join faqat public recruiting loyiha uchun pending so'rov yaratadi.
- Ikkinchi migration ham repository draft: **jonli Supabase'ga qo'llanmagan**. To'rt yangi jadvalda RLS yoqilgan, browser grantlari va policy'lar yo'q.
- Loyiha egasi `projects.created_by` orqali belgilanadi; `organization_id` ixtiyoriy bog'lanish. A'zolik, vazifa va yangiliklarning haqiqiy ruxsat siyosatlari keyingi xavfsizlik bosqichida yoziladi.
- Bu migration faqat repository draft: **jonli Supabase loyihasiga qo'llanmagan**.
- Mavjud `public` jadvallariga tegmaydi. To'rt jadvalda RLS yoqilgan, browser rollariga grant/policy berilmagan.
- `idea_app` Data API'ga expose qilinmagan. Frontend `offline-demo` rejimida qoladi.
- Qo'llashdan oldin staging, backup/restore, metadata va ikki foydalanuvchili RLS sinovlari shart.

## Fayllar tartibi

1. `schema.sql` — boshlang'ich jadvallar, indekslar, RLS va triggerlar.
2. `migrations/20261115_security_hardening.sql` — katalog view'lari va qo'shimcha xavfsizlik cheklovlari.
3. `migrations/20261116_supplier_verification.sql` — ta’minotchi tekshiruvi uchun qo‘shimcha jadvallar va cheklangan RLS.
4. `migrations/20261117_supplier_verification_reviewers.sql` — server tomonidan boshqariladigan reviewer allowlist va atomik qaror RPC.
5. `migrations/20261118_supplier_verification_private_storage.sql` — private hujjat bucket'i va Storage RLS siyosatlari.
6. `migrations/20261119_supplier_verification_evidence_access_audit.sql` — vaqtinchalik yuklab olish havolasi berilganini qayd etuvchi audit jadvali.
7. `migrations/20261120_supplier_verification_case_assignments.sql` — reviewerlarni alohida arizalarga biriktirish va o‘qish/qaror ruxsatlarini shu biriktirish bilan cheklash.
8. `migrations/20261121_supplier_verification_admin_control.sql` — administrator allowlist, reviewer vakolatlarini boshqarish, ariza assignment va audit tarixi.
9. `migrations/20261122_application_activity_notifications.sql` — to‘rt turdagi ariza uchun server audit tarixi va ishtirokchi bildirishnomalari.
10. `verification/security_audit.sql` — read-only tekshiruv so'rovlari.

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
- Ulangan Supabase loyiha read-only audit uchun mavjud: ha.
- Ushbu repository schema.sql jonli loyihaga qo‘llangan: yo‘q / tasdiqlanmagan.
- Repository migrationlari staging yoki productionga qo‘llangan: yo‘q / tasdiqlanmagan.
- Jonli loyihaning hozirgi 9 jadvali alohida resurs/investitsiya poydevori; bu papkadagi keng loyiha/jamoa/vakansiya sxemasi bilan bir xil emas. Tafsilot: BACKEND-SECURITY-REVIEW.md.
- Auth va server API ishlayapti: yo'q.
- LocalStorage import qilingan: yo'q.

## Ta’minotchi hujjatlari Edge Function

`functions/supplier-verification-evidence/` ichida autentifikatsiyalangan upload-ticket, upload-finalization va download-ticket API poydevori bor. Sozlash, client protokoli, maxfiy kalitlar va staging qabul mezonlari shu papkadagi README'da. Function deploy qilinmagan va real hujjat qabul qilishga hali ruxsat berilmaydi.

## Reviewer case-level assignment

`migrations/20261120_supplier_verification_case_assignments.sql` migration'i reviewerning umumiy allowlist vakolatini har bir arizaga alohida biriktirish bilan cheklaydi. Assignment jadvaliga faqat trusted service-role operatsiyasi kira oladi. Ariza, audit event va Storage evidence o‘qishlari hamda qaror RPC faol assignment talab qiladi.

Bu migration hali qo‘llanmagan. Assignment berish/bekor qilish API'si, MFA va jonli RLS testlari alohida ishlab chiqilishi kerak. Production'da qo‘llamang; avval staging va ikki reviewer/two supplier sinovidan o'tkazing.

## Tekshiruv boshqaruv markazi

- Sahifa: `supplier-verification-admin.html`.
- Edge Function: `functions/supplier-verification-admin/`.
- Migration: `20261121_supplier_verification_admin_control.sql`.

Birinchi administrator `supplier_verification_admins` jadvaliga faqat ishonchli database owner sessiyasi orqali qo‘shiladi. Haqiqiy UUID yoki credential'larni GitHub'ga yozmang. Keyingi reviewer faollashtirish, arizaga biriktirish, bekor qilish va tarixni ko‘rish amallari Edge Function orqali bajariladi. Har bir so‘rovda JWT tekshiriladi va admin allowlist qayta tekshiriladi. Service-role kaliti faqat Edge Function secret bo‘lib qoladi.

Reviewer faolsizlantirilganda uning faol case assignment'lari ham bekor qilinadi va audit tarixiga yoziladi. Qayta faollashtirish eski assignment'larni tiklamaydi; admin qayta biriktirishi kerak.

Deploy qilishdan oldin migration'larni tartib bilan staging'da qo‘llang, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ORIGINS` secretlarini sozlang va Edge Function'ni deploy qiling. Frontend'da faqat publishable/anon konfiguratsiya bo‘lishi mumkin. Hozirgi repository demo holatida bo‘lsa, boshqaruv oynasi avtomatik bloklangan qoladi.

## Tekshiruv boshqaruv markazi

- UI: `supplier-verification-admin.html`.
- Edge Function: `functions/supplier-verification-admin/`.
- Migration: `migrations/20261121_supplier_verification_admin_control.sql`.

Birinchi administratorni faqat ishonchli database owner sessiyasi orqali allowlist'ga kiriting. Reviewer vakolatini boshqarish, arizalar ro‘yxati, assignment berish/bekor qilish va tarix Edge Function orqali bajariladi. Reviewer deaktivatsiyasi barcha faol assignment'larni ham bekor qiladi. Hujjat download endpoint'i ham case assignment talab qiladi.

Deploy va sozlash bo‘yicha batafsil ko‘rsatma `functions/supplier-verification-admin/README.md` ichida. Migration va function hali deploy qilinmagan; admin UI backend konfiguratsiyasi bo‘lmaganda yopiq turadi.

## Staging tayyorgarligi va qabul sinovlari

- [Staging deployment runbook](verification/supplier-verification-staging-runbook.md) — migration tartibi, secret chegaralari, birinchi admin bootstrap, testlar va rollback.
- [Staging preflight SQL](verification/supplier-verification-staging-preflight.sql) — migrationlardan keyingi read-only metadata tekshiruvlari.

Bu hujjatlar deploy bajarmaydi. Staging loyihasi tanlanmagan, migrationlar qo'llanmagan va Edge Function'lar deploy qilinmagan. Avval alohida staging loyihasida qabul sinovlari o'tishi shart.

- [Read-only staging smoke runner](../scripts/supplier-verification-staging-smoke.mjs) — deploydan keyin staging endpointlarini xavfsiz, yozuv kiritmasdan tekshiradi.

## Edge Function gateway JWT talabi

`supabase/config.toml` faylida ta’minotchi hujjatlari va admin Edge Function'lari uchun `verify_jwt = true` aniq belgilangan. Deploy vaqtida bu himoyani o‘chirmang (`--no-verify-jwt` ishlatmang). Buyruqlar staging project ref bilan runbook'da berilgan.

## Arizalar tarixi va bildirishnomalar

`migrations/20261122_application_activity_notifications.sql` ariza yuborilishi va status o‘zgarishini DB triggerlari orqali qayd etadi. Faqat ariza ishtirokchilari tarixni o‘qiydi; brauzerga audit yozuvlarini kiritish yoki o‘zgartirish huquqi berilmaydi. Migration hali qo‘llanmagan. Staging'da qo‘llashdan oldin schema va oldingi migrationlar to‘liq tekshirilsin.
