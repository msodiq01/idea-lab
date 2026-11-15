# IDEA LAB — yagona akkaunt, profil va tashkilot modeli

Versiya: 1.0  
Sana: 2026-11-15  
Holat: maqsadli model; backendga ulanmagan va mavjud ma'lumotlarni o'zgartirmaydi.

## 1. Asosiy tamoyil

IDEA LAB'da bitta inson uchun bitta Account va bitta asosiy Profile bo'ladi. Shu inson bir vaqtning o'zida loyiha egasi, mutaxassis, ish izlovchi, investor yoki tashkilot vakili bo'lishi mumkin. Faoliyat yo'nalishlari xavfsizlik vakolatlari bilan teng emas.

**Faoliyat turi ≠ ruxsat.** Profil formasidagi tanlov qiziqish yoki faoliyat yo'nalishini bildiradi; u admin, moderator, tashkilot rahbari yoki boshqa foydalanuvchi ma'lumotlariga kirish huquqini bermaydi.

## 2. Asosiy obyektlar

### Account
- id — autentifikatsiya provayderi bergan UUID.
- status — active, suspended yoki closed.
- created_at va last_sign_in_at.
- Parol, sessiya va autentifikatsiya ma'lumotlari faqat auth provayderida saqlanadi.

### Profile
- id va account_id — Account bilan 1:1 bog'lanish.
- display_name, avatar_path, bio, preferred_language, timezone.
- created_at va updated_at.
- Telefon va email alohida maxfiy contact ma'lumotlari sifatida boshqariladi; ommaviy katalogga avtomatik chiqarilmaydi.

### ProfileCapability
Foydalanuvchi o'zi belgilaydigan faoliyat yo'nalishlari: project_owner, investor, employer, job_seeker, supplier, specialist, manufacturer. Bu katalog va filtrlash uchun signal, xavfsizlik roli emas.

### Organization
Kompaniya, muassasa, notijorat tashkilot yoki mustaqil jamoa kabi mustaqil birlik. Asosiy maydonlar: id, name, type, description, website, public_location, owner_account_id, verification_status, created_at, updated_at. Tekshirilmagan tashkilot tasdiqlangan yuridik shaxs sifatida ko'rsatilmaydi.

### OrganizationMembership
- organization_id, account_id, role, status, invited_by, created_at.
- Tavsiya etilgan rollar: owner, admin, manager, member, viewer.
- Holatlar: invited, pending, active, declined, removed.
- Bir tashkilotda bitta Account uchun takroriy faol a'zolik bo'lmasligi kerak.
- Tashkilot vakolati faqat shu tashkilot doirasida amal qiladi.

### Project va ProjectMembership
Project egasi account yoki organization bo'lishi mumkin; aynan bittasi belgilanadi. ProjectMembership loyiha ichidagi rollarni alohida saqlaydi. OrganizationMembership loyiha a'zoligini avtomatik bermaydi.

### SpecialistProfile
Mutaxassislik Profile kengaytmasi. profile_id orqali yagona profilga bog'lanadi; kasb, ko'nikmalar, tajriba, ta'lim va portfolio saqlanadi. Rezyume kelajakda private storage va ruxsatli kirish orqali boshqariladi.

### Employer / Investor / Supplier
Bular mustaqil akkaunt turi emas, faoliyat yo'nalishlari. Ish beruvchi vakansiyani shaxs yoki vakolatli tashkilot nomidan joylashtirishi mumkin. Investor va yetkazib beruvchi ham shaxs yoki tashkilot bo'lishi mumkin. E'lon egasi va vakilning identifikatori alohida saqlanadi.

## 3. Ruxsatlar qatlamlari
1. Platform role — oddiy foydalanuvchi, moderator, platform admin. Yuqori vakolatlar faqat ishonchli server/admin jarayonida beriladi.
2. Organization role — faqat tegishli tashkilot ichida owner/admin/manager/member/viewer.
3. Project role — faqat tegishli loyiha ichida owner/manager/member/viewer.
4. Resource ownership — foydalanuvchi faqat o'zi egasi bo'lgan profil, e'lon yoki arizani boshqaradi.
5. Public visibility — faqat ommaga chiqarishga mo'ljallangan maydonlar.

Frontend checkbox yoki localStorage qiymati hech qachon haqiqiy ruxsatni tasdiqlamaydi. Har bir muhim amal backendda qayta tekshirilishi shart.

## 4. Hozirgi frontend bilan farqlar
| Hozirgi holat | Xavf yoki cheklov | Maqsadli qaror |
|---|---|---|
| profile.html rollarni checkbox sifatida saqlaydi | Faoliyat yo'nalishi ruxsatdek talqin qilinishi mumkin | UI matnini Faoliyat yo'nalishlari deb aniqlashtirish; capability sifatida saqlash |
| Profil userProfile localStorage kalitida | Bir brauzerga bog'langan, auth emas | Keyinchalik Account/Profile server modeli |
| Loyiha egasi email orqali topiladi | Email o'zgarishi yoki dublikatlar noto'g'ri bog'lashga olib kelishi mumkin | owner_account_id yoki owner_organization_id |
| teams.html jamoa va ish beruvchi ma'lumotlarini bir sahifada saqlaydi | Mustaqil tashkilot va loyiha guruhi aralashishi mumkin | Organization va ProjectMembershipni ajratish |
| Vakansiyada kompaniya nomi oddiy matn | Tashkilot bilan tekshiriladigan aloqa yo'q | organization_id yoki owner_account_id |
| Mutaxassis profili alohida localStorage ro'yxatida | Asosiy profil bilan avtomatik bog'lanmagan | profile_id orqali Profile extension |
| Investor profili alohida katalog | Investor shaxsmi yoki tashkilotmi noaniq | ProfileCapability yoki Organization bilan bog'lash |

## 5. Maxfiylik qoidalari
- Public: ko'rsatishga ruxsat berilgan ism/nom, bio, ko'nikma, ommaviy loyiha va tashkilot tavsifi.
- Private: email, telefon, ichki yozishmalar, arizalar, hujjatlar, moliyaviy va shaxsiy ma'lumotlar.
- Contact ma'lumotlari faqat aniq maqsad va ruxsat bilan ko'rsatiladi.
- Tashkilot a'zolari boshqa a'zolarning shaxsiy kontaktlarini avtomatik ko'ra olmaydi.
- Rezyume va hujjatlar public katalogga ochiq joylashtirilmaydi.
- Muhim ruxsat o'zgarishlari audit logga yoziladi; maxfiy token/parol logga yozilmaydi.

## 6. Mahsulot qoidalari
- Bir Account bir nechta tashkilotga qo'shilishi mumkin.
- Bir Account bir nechta faoliyat yo'nalishini tanlashi mumkin.
- Tashkilot egasi bo'lmagan foydalanuvchi faqat taklif yoki tasdiqlangan a'zolikdan keyin tashkilot nomidan amal qiladi.
- Loyiha mustaqil shaxsga yoki tashkilotga tegishli bo'lishi mumkin.
- Tashkilot tarkibidagi loyiha jamoasi bilan mustaqil Organization bir xil obyekt emas.
- Investor maqomi yoki sarmoya kiritish vakolati checkbox orqali tasdiqlanmaydi; zarur bo'lsa alohida tekshiruv jarayoni qo'llanadi.

## 7. Amalga oshirish ketma-ketligi
1. Profil formasi va atamalarni Account/Profile/Capability qoidalariga moslashtirish.
2. Joriy localStorage ma'lumotlarini o'zgartirmasdan field mapping va dublikat hisobotini tayyorlash.
3. Organization va OrganizationMembership UI prototipini serverga ulanmasdan yaratish.
4. ProjectMembership va OrganizationMembershipni alohida ko'rsatish.
5. Loyiha, vakansiya, investor va mutaxassis obyektlariga barqaror ID bog'lash.
6. Backend bosqichida auth, server-side authorization, RLS va audit logni sinash.

## 8. Amalga oshirilmagan ishlar
Bu hujjat model va talablarni belgilaydi. HTML formalar, localStorage yozuvlari, SQL, Supabase, login, tashkilot yaratish yoki real ruxsatlar o'zgartirilmadi. Mavjud ma'lumotlar o'chirilmadi yoki ko'chirilmadi.
