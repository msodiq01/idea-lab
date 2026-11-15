# IDEA LAB — Ta’minotchini tekshirish jarayoni

Versiya: 1.0 · Sana: 2026-11-15  
Holat: ishlab chiqish shartnomasi; real tekshiruv xizmati yoki backend yoqilmagan.

## 1. Maqsad
Ta’minotchi profili va uning platformada qayd etilgan buyurtmalar tarixini mustaqil tekshiruvdan alohida ko‘rsatish. Profil ochish, hujjat belgisi kiritish yoki buyurtma statistikasi hech qachon “tasdiqlangan” maqomini bermaydi.

## 2. Ariza holatlari
| Machine status | UI nomi | Kim o‘zgartiradi |
|---|---|---|
| submitted | Ariza yuborildi | Ta’minotchi |
| under_review | Ko‘rib chiqilmoqda | Vakolatli reviewer |
| needs_more_info | Qo‘shimcha ma’lumot kerak | Vakolatli reviewer |
| approved | Mustaqil tekshiruvdan o‘tgan | Vakolatli reviewer |
| rejected | Tekshiruvdan o‘tmadi | Vakolatli reviewer |

Faqat submitted holati demo modelida yaratiladi. Brauzerda reviewer action yoki approved holatini belgilash funksiyasi bo‘lmaydi. approved faqat serverdagi ruxsatli reviewer operatsiyasi natijasida berilishi mumkin.

## 3. Tekshiruv doirasi
Vakolatli tashkilot va qonuniy asos mavjud bo‘lganda quyidagilarni tekshirish mumkin:
- biznes ro‘yxatdan o‘tganligi va faol holati;
- ariza beruvchi vakilning tashkilot nomidan ish yuritish vakolati;
- tashkilot nomi, manzili va faoliyat yo‘nalishi mosligi;
- to‘lov rekvizitlari kerak bo‘lsa, bank hisob egasining tashkilot bilan mosligi — faqat xavfsiz, ruxsatli bank/hamkor tekshiruvi orqali;
- takroriy yoki o‘zaro zid profillar.

Bu ro‘yxat hujjatlarni ommaviy yig‘ish yoki foydalanuvchidan chat/demo ichida yuborishni anglatmaydi.

## 4. Ma’lumotlarni minimallashtirish
- Demo/localStorage ichida pasport, STIR, bank hisob raqami, karta raqami, to‘liq hujjat nusxasi yoki maxfiy identifikator saqlanmaydi.
- Demo faqat hujjat turi va maxfiy bo‘lmagan qisqa ichki belgi saqlashi mumkin.
- Production'da hujjat fayllari alohida private storage bucket'da, qisqa muddatli signed URL va qat’iy access policy bilan saqlanadi.
- Hujjatga kirish faqat tekshiruv vazifasiga biriktirilgan reviewer uchun; public directory DTO hujjat metama’lumotini ham chiqarmaydi.
- Rozilik, maqsad, saqlash muddati, o‘chirish va murojaat/appeal tartibi oldindan belgilanishi kerak.

## 5. Backend xavfsizlik talablari
1. Reviewer identifikatori faqat tasdiqlangan server session (auth.uid()) orqali olinadi; client yuborgan reviewer ID ishonchli emas.
2. supplier_verification_applications va supplier_verification_events jadvallari RLS bilan himoyalanadi.
3. Supplier faqat o‘z arizasini yaratadi va o‘qiydi; status, reviewer, review note va audit tarixini o‘zgartira olmaydi.
4. Reviewer huquqi server-side role/permission jadvalidan tekshiriladi; profilning roles maydoni yoki UI flag yetarli emas.
5. Status transition server transaction ichida tekshiriladi va o‘zgarmas audit event yoziladi.
6. approved holati uchun tekshiruv turi, reviewer, vaqt, dalil manbasi va amal qilish/review muddati talab qilinadi.
7. Public directory faqat minimal ommaviy profil maydonlari va tasdiqlangan maqomni ko‘rsatadi; private hujjat ma’lumotlari hech qachon public view'da bo‘lmaydi.
8. Reviewer hisoblari uchun MFA, least privilege, kirish loglari va davriy ruxsat auditi talab qilinadi.

## 6. Tavsiya etilgan ma’lumot modeli
- supplier_verification_applications: id, supplier_user_id, status, consent_at, submitted_at, reviewed_at, reviewer_user_id, review_note, created_at, updated_at.
- supplier_verification_evidence: id, application_id, document_type, private_storage_path, masked_reference, uploaded_at, retention_until.
- supplier_verification_events: id, application_id, actor_user_id, from_status, to_status, reason_code, created_at.

Bu jadval nomlari va maydonlari arxitektura taklifi; hozirgi supabase/schema.sql ga qo‘llanmagan. Migration, RLS policy va ikki foydalanuvchili staging sinovlarisiz production'da ishlatilmasin.

## 7. Qabul mezonlari
- [ ] Backend reviewer permission serverda tasdiqlanadi.
- [ ] Supplier boshqa supplier arizasini o‘qiy olmaydi.
- [ ] Supplier o‘z statusini yoki audit tarixini o‘zgartira olmaydi.
- [ ] Reviewer faqat ruxsat etilgan status transition qiladi.
- [ ] Har bir qaror audit event yozadi.
- [ ] Public view'da maxfiy hujjat maydoni yo‘q.
- [ ] Hujjatlarni saqlash muddati va o‘chirish sinovi bor.
- [ ] Ikki alohida test akkaunt bilan RLS testlari muvaffaqiyatli.
- [ ] Demo holati real tekshiruv sifatida ko‘rsatilmaydi.
