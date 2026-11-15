# Supabase tayyorlash

Bu papkadagi SQL — IDEA LAB backendini tayyorlash uchun. Hozir frontend Supabase'ga ulanmagan.

## Fayllar tartibi

1. `schema.sql` — boshlang'ich jadvallar, indekslar, RLS va triggerlar.
2. `migrations/20261115_security_hardening.sql` — katalog view'lari va qo'shimcha xavfsizlik cheklovlari.
3. `migrations/20261116_supplier_verification.sql` — ta’minotchi tekshiruvi uchun qo‘shimcha jadvallar va cheklangan RLS.
4. `migrations/20261117_supplier_verification_reviewers.sql` — server tomonidan boshqariladigan reviewer allowlist va atomik qaror RPC.
5. `migrations/20261118_supplier_verification_private_storage.sql` — private hujjat bucket'i va Storage RLS siyosatlari.
6. `verification/security_audit.sql` — read-only tekshiruv so'rovlari.

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
