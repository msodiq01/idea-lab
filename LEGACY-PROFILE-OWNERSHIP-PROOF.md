# Legacy profil egaligini tasdiqlash — xavfsiz dizayn shartnomasi

Holat: dizayn qarori; hech qanday SQL, Edge Function, Auth sozlamasi yoki foydalanuvchi ma'lumoti o'zgartirilmagan.

## 1. Asosiy xulosa

Hozirgi `userProfile` yozuvi faqat foydalanuvchi brauzeridagi `localStorage` ichida saqlanadi. Undagi `id`, ism, email, telefon va rollarni foydalanuvchi yoki brauzer skripti o'zgartira oladi. Shu sababli:

- Local profil mavjudligi uning egasini isbotlamaydi.
- Profil ichidagi emailga OTP yuborishning o'zi tarixiy profil egaligini isbotlamaydi: email qiymati oldindan o'zgartirilishi mumkin.
- Auth sessiyasi faqat hozirgi Supabase akkauntiga kirilganini ko'rsatadi.
- Bir xil email yoki ism topilishi avtomatik biriktirishga asos bo'la olmaydi.

**Qaror:** hozirgi ma'lumotlar bilan legacy profilni yangi Auth UID'ga ishonchli tarzda *identity link* qilish mumkin emas. Shuning uchun amaldagi xavfsiz yo'l — foydalanuvchi tasdiqlaydigan, aniq ko'rsatilgan **ma'lumot importi**. Import qilingan ma'lumotlar tarixiy egasi server tomonidan tasdiqlangan deb belgilanmaydi.

## 2. Ruxsat etilgan hozirgi oqim

1. Foydalanuvchi yangi Auth akkauntiga kiradi.
2. IDEA LAB mahalliy profil va tanlangan yozuvlar ro'yxatini faqat ko'rish rejimida ko'rsatadi.
3. Har bir yozuv bo'yicha foydalanuvchi import qilishni alohida tanlaydi.
4. Serverga yuboriladigan yozuvlar `source= user_import` kabi provenance bilan belgilanadi; bu maydonni server o'zi qo'yadi.
5. Yozuvlar yangi Auth UID ostida yaratiladi; eski `legacy_id` faqat takroriy importni aniqlash uchun saqlanishi mumkin.
6. Mavjud server yozuvlari hech qachon email yoki legacy ID mosligi bilan egallab olinmaydi.
7. Takroriy import idempotent bo'ladi; to'qnashuv bo'lsa avtomatik birlashtirish o'rniga foydalanuvchiga ko'rsatiladi.

Bu import ham server va RLS tayyor bo'lmaguncha ishga tushirilmaydi.

## 3. Qachon haqiqiy identity link ko'rib chiqilishi mumkin?

Faqat legacy profilning foydalanuvchiga tegishliligini tasdiqlaydigan, localStorage'dan mustaqil va oldindan mavjud bo'lgan ishonchli manba topilsa. Masalan, avvaldan serverda saqlangan, o'zgartirib bo'lmaydigan akkaunt yozuvi yoki tekshiriladigan tashkilot reyestri.

Agar bunday manba bo'lmasa, qo'llab-quvvatlash xodimining subyektiv qarori yoki profil ichidagi email/telefon qiymati avtomatik identity link uchun yetarli emas. Qo'shimcha hujjat yig'ish ham default yo'l bo'lmasin; ortiqcha shaxsiy ma'lumot talab qilinmasin.

## 4. Kelajakdagi server-side import himoyalari

- Auth UID faqat serverda tasdiqlangan sessiyadan olinadi; klient yuborgan UID'ga ishonilmaydi.
- Foydalanuvchi import qilinadigan maydonlarni ko'radi va rozilik beradi.
- Server schema/field allowlist orqali faqat ruxsat etilgan maydonlarni qabul qiladi; `roles`, permissions, moderator flag, verification status va ownership maydonlari importdan chiqariladi.
- Yangi yozuvlar `auth.uid()` bilan bog'lanadi.
- RLS, foreign key, unique constraint, rate limit va audit log serverda qo'llanadi.
- Public katalogga telefon, email, avatar base64 yoki maxfiy hujjat yo'llari chiqmaydi.
- Import xatosi eski brauzer yozuvini o'chirmaydi yoki o'zgartirmaydi.
- Preview va dry-run natijasi foydalanuvchiga ko'rsatiladi; yakuniy importdan oldin alohida tasdiq olinadi.
- Rollback faqat import batch ID orqali yangi yaratilgan yozuvlarga tegadi; mavjud yozuvlarni o'chirmaydi.

## 5. Qabul mezonlari

- [ ] Legacy profilning localStorage'da tahrirlanishi boshqa foydalanuvchi server yozuvini egallashga olib kelmaydi.
- [ ] Email mosligi ownership yoki permission bermaydi.
- [ ] Import qilingan profil rollari server ruxsatlariga aylanmaydi.
- [ ] User A User B yozuvini import, ko'rish yoki o'zgartirish orqali egallay olmaydi.
- [ ] Takroriy import dublikat yaratmaydi.
- [ ] Noto'g'ri yoki rad etilgan import eski localStorage ma'lumotini o'zgartirmaydi.
- [ ] Ikki alohida test akkauntida RLS testlari o'tadi.
- [ ] Staging backup va rollback rejasi tasdiqlanadi.

## 6. Hozircha bajarilmagan ishlar

Bu hujjat faqat dizayn qarori. Supabase jadvali, migration, Edge Function, email OTP, Storage yoki real import oqimi yaratilmagan va ishga tushirilmagan. Production ma'lumotlariga hech qanday amal bajarilmagan.
