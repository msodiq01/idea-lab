# IDEA LAB — Ta’minotchini tekshirish jarayoni

Versiya: 1.1 · Sana: 2026-11-16  
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
- Backend evidence jadvali private storage yo‘li va minimal metadata uchun; migration Storage bucket yoki upload endpoint yaratmaydi.
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
7. Reviewer qarori uchun server-side permission, atomik status transition va audit event yozadigan alohida backend operatsiyasi keyingi bosqichda ishlab chiqiladi.

## 5. Reviewer va hujjat yuklash
Reviewer identifikatori faqat tasdiqlangan server sessiondan olinadi. Profil roles maydoni yoki UI flag vakolat bermaydi. Approved holati uchun tekshiruv turi, reviewer, vaqt, dalil manbasi va amal qilish/review muddati talab qilinadi. Ushbu migration reviewer API/RPC, MFA, Storage bucket yoki hujjat uploadni yoqmaydi.

## 6. Sinov holati
tests/supplier-verification-migration.test.cjs migration matnining xavfsizlik shartlarini statik tekshiradi. Bu SQL parser, Postgres integratsion test yoki jonli RLS sinovi emas. Migration faqat alohida staging loyihasida qo‘llanib, ikki akkauntli testdan o‘tkazilgandan keyin foydalanishga yaroqli deb baholanadi.

## 7. Qabul mezonlari
- [ ] Test Supabase loyihasi va egasi tasdiqlangan.
- [ ] Backup va restore sinovi bajarilgan.
- [ ] Migration staging'da qo‘llangan.
- [ ] Ikki test akkaunt bilan RLS sinovlari o'tgan.
- [ ] Reviewer transition serverda ruxsat bilan ishlaydi.
- [ ] Evidence private Storage va retention siyosati bilan himoyalangan.
- [ ] Public view hujjat metadata yoki private path chiqarmaydi.
- [ ] Demo holati real tekshiruv sifatida ko‘rsatilmaydi.
