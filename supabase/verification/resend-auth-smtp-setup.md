# IDEA LAB — Resend va Supabase Auth SMTP sozlamasi

## Maqsad va holat

Bu sozlama Supabase Auth xatlarini (ro'yxatdan o'tishni tasdiqlash, parolni tiklash, email almashtirish) Resend orqali yetkazish uchun mo'ljallangan.

- Supabase loyiha: `idea-lab` (`hfxkiudvlmibpffrppzc`)
- Reja: Supabase Free tarifida qolish.
- Resend hisob / domen: loyiha egasi tomonidan yaratilishi va tasdiqlanishi kerak.
- SMTP credentials: hali kiritilmagan.
- SMTP ulanish: hali yoqilmagan.
- Auth email yuborish: Resend ulanmaguncha production'da tasdiqlanmagan.

**Muhim:** Resend SMTP — Supabase Auth email transporti. Edge Function orqali oddiy xabar yuborish boshqa mexanizm; u Auth confirmation email'larini avtomatik almashtirmaydi. IDEA LAB frontend'iga Resend API key, SMTP password, Supabase secret/service-role key kiritilmaydi.

## Kerakli old shartlar

1. IDEA LAB uchun yuboruvchi domen ustidan qonuniy boshqaruv (DNS yozuvlarini o'zgartira olish).
2. Resend hisobida domenni qo'shish va Resend ko'rsatgan DNS yozuvlarini domen DNS boshqaruviga kiritish.
3. Resend domen holati Verified bo'lishi.
4. Resend API key yaratish. Kalitni chatga, GitHub'ga yoki frontend fayllariga joylamang.

Domen egasi bo'lmasa, hozircha yuboruvchi manzilni tasdiqlab bo'lmaydi; boshqa birovning domenidan ruxsatsiz foydalanmang.

## Supabase Dashboard'da qo'lda sozlash

Supabase Dashboard → loyiha `idea-lab` → Authentication → SMTP Settings:

- Enable Custom SMTP: ON
- Host: `smtp.resend.com`
- Port: `465` (SSL) yoki Resend ko'rsatgan amaldagi port
- Username: `resend`
- Password: Resend API key
- Sender email: tasdiqlangan domen ostidagi manzil, masalan `noreply@<tasdiqlangan-domen>`
- Sender name: `IDEA LAB`

Saqlashdan oldin sender email domeni Resend'da Verified ekanini tekshiring. SMTP parolini faqat Supabase Dashboard maxfiy sozlamasiga kiriting. Bu sozlama Supabase Auth'ning SMTP transportini almashtiradi.

## Qabul sinovlari

SMTP sozlangach, quyidagilarni tekshiring:

1. Auth email rate limit xatosi endi qaytmasligi.
2. Tasdiqlash xati Resend dashboard'da accepted/delivered holatiga o'tishi.
3. Email ichidagi confirmation havolasi IDEA LAB saytiga to'g'ri qaytishi.
4. Tasdiqlangan akkaunt bilan sign-in ishlashi.
5. Parolni tiklash xati yuborilishi va tiklash havolasi ishlashi.
6. Ikki alohida test akkauntida foydalanuvchi ma'lumotlari bir-biridan ajratilganligi.

Faqat xat yuborish logi muvaffaqiyatli bo'lsa, email yetib borgan deb hisoblamang; Resend delivery/bounce holatini ham tekshiring.

## Rasmiy hujjatlar

- Supabase custom SMTP: https://supabase.com/docs/guides/auth/auth-smtp
- Supabase + Resend integratsiyasi: https://supabase.com/partners/resend
- Resend domenlar: https://resend.com/domains
- Resend SMTP: https://resend.com/docs/send-with-smtp

## Xavfsizlik

- Hech qanday API key yoki SMTP password repository'ga commit qilinmasin.
- `assets/idea-config.js` faqat Supabase URL va publishable key saqlaydi.
- Supabase secret/service-role key brauzerga chiqarilmasin.
- SMTP sozlamasini faqat loyiha egasi yoki ruxsatli administrator Dashboard'da kiritsin.
- Resend Free limitlari va shartlari o'zgarishi mumkin; yuborish hajmini Resend dashboard'da tekshiring.
