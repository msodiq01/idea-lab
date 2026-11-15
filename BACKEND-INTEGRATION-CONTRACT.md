# IDEA LAB — backend integratsiya shartnomasi

Versiya: 1.0 · Sana: 2026-11-15  
Holat: texnik shartnoma; real backend ulanmagan.

## 1. Maqsad va chegaralar

Frontend sahifalari server bilan faqat yagona data-access qatlam orqali ishlashi kerak. Sahifa Supabase jadvaliga o'zboshimchalik bilan yozmaydi. Hozirgi IDEA LAB frontend demo rejimida: `assets/idea-core.js` `offline-demo` va `authenticated: false` holatini bildiradi.

**Bu hujjat backendni yoqmaydi, akkaunt yaratmaydi va ma'lumot ko'chirmaydi.** Supabase URL, anon key, auth provider va tasdiqlangan loyiha hali ulanmagan.

## 2. Ma'lumotlar manbalari

| Vazifa | Ruxsat etilgan server manbasi |
|---|---|
| Shaxs profili | `profiles` — faqat o'z profili |
| Ommaviy loyihalar | `projects_public` |
| Ommaviy jamoalar | `teams_public` |
| Vakansiyalar | `job_posts_public` |
| Mutaxassislar | `specialist_profiles_public` |
| Takliflar | `offers_public` |
| Investor katalogi | `investors_public` |
| Resurs katalogi | `resources_public` |
| Kiruvchi/yuborilgan murojaat | Tegishli application jadvali; RLS orqali ishtirokchi doirasi |
| Xabarlar | `offer_messages`; faqat ariza ishtirokchilari |

Ommaviy kataloglar uchun asosiy jadvallarni keng SELECT qilish taqiqlanadi. Public view'larda telefon, email, Telegram, resume yo'li va egaga tegishli ichki identifikatorlar berilmaydi.

## 3. Application API modeli

Frontenddagi 5 oqim dastlab alohida jadval bilan moslanadi:

| UI turi | Jadval | Target FK |
|---|---|---|
| Investitsiya | `project_investment_applications` | `project_id` |
| Jamoa | `team_applications` | `team_id` |
| Ish | `job_applications` | `job_id` |
| Taklif | `offer_applications` | `offer_id` |
| Resurs | `resource_orders` | `resource_id` |

Har bir yozuvda server bergan UUID, authenticated applicant ID, target ID, status va timestamp bo'ladi. Brauzer yuborgan applicant ID egasi deb qabul qilinmaydi: server/RLS `auth.uid()` bilan solishtiradi.

## 4. Status qoidalari

Machine qiymatlar inglizcha saqlanadi; UI o'zbekcha ko'rsatadi.

- Arizachi: faqat o'z arizasini bekor qilishi mumkin.
- Target egasi: arizani ko'rib chiqishi va qaror berishi mumkin.
- Arizachi o'z arizasini o'zi `accepted` yoki `rejected` qila olmaydi.
- Status o'tishlari serverda ruxsat etilgan holatlar bilan cheklanadi.
- Har bir muhim o'tish audit yozuviga ega bo'lishi kerak.

## 5. Frontend data adapter talablari

1. UI localStorage yoki Supabase SDK'ni bevosita chaqirmaydi; adapter orqali ishlaydi.
2. Adapter `list`, `get`, `create`, `updateStatus` amallarini aniq tip bilan taqdim etadi.
3. Backend mavjud bo'lmasa, offline demo aniq belgilanadi; demo yozuv serverga ketgandek ko'rsatilmaydi.
4. Xatolar `API-ERROR-CATALOG.md` dagi kodlarga moslanadi.
5. Pagination serverda; cheksiz barcha yozuvlarni bir so'rovda yuklash yo'q.
6. Public va private ma'lumotlar alohida DTO sifatida uzatiladi.
7. Hech qachon service-role key brauzerga joylanmaydi.

## 6. Minimal endpoint/operatsiya shartnomasi

| Operatsiya | Ruxsat | Natija |
|---|---|---|
| Public directory list | Authenticated, view orqali | Faqat ommaviy ustunlar |
| Own profile read/update | Authenticated, own row | O'z profil maydonlari; roles yo'q |
| Application create | Authenticated | Server applicant ID bilan bog'laydi |
| Incoming applications list | Target owner | Faqat o'z targetlariga kelganlari |
| Outgoing applications list | Applicant | Faqat o'zi yuborganlari |
| Application status update | Target owner | Ruxsatli status transition |
| Application withdraw | Applicant | Faqat o'z arizasi |

## 7. Qabul mezonlari

- [ ] Test Supabase loyihasi va egasi tasdiqlangan.
- [ ] Zaxira nusxa va tiklash sinovi mavjud.
- [ ] Schema va security migration staging'da qo'llangan.
- [ ] Ikki test foydalanuvchi bilan RLS sinovlari o'tgan.
- [ ] Ommaviy view'larda maxfiy ustun yo'q.
- [ ] Frontend faqat anon/publishable key ishlatadi; service key yo'q.
- [ ] Offline demo va real backend holatlari aniq ajratilgan.
- [ ] Legacy import oldidan preview, backup, duplicate report va rollback mavjud.
