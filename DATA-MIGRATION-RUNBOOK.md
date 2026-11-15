# IDEA LAB — legacy ma'lumotlarni migratsiya qilish qo'llanmasi

Holat: tayyorgarlik hujjati. Hozir hech qanday localStorage ma'lumoti serverga ko'chirilmagan.

## Qat'iy xavfsizlik qoidasi

**Hozircha importni boshlamang.** Supabase loyihasi, schema versiyasi, zaxira joyi va test akkauntlari tasdiqlanmaguncha production migratsiya bajarilmaydi. Brauzer localStorage ma'lumotlari faqat o'sha qurilma/profilida bo'lishi mumkin.

## 1. Aniqlangan eski kalitlar

| Eski kalit | Maqsad |
|---|---|
| `projects` | `projects` |
| `teams` | `teams` |
| `jobs` | `job_posts` |
| `specialists` / `ideaLabSpecialists` | `specialist_profiles`; kalitning real qiymati tekshirilsin |
| `offers` | `offers` |
| `investors` | `investors` |
| `investmentApplications` | `project_investment_applications` |
| `teamApplications` | `team_applications` |
| `jobApplications` | `job_applications` |
| `offerApplications` | `offer_applications` |
| `resourceOrders` | `resource_orders` |
| `offerMessages` | `offer_messages`; application relation tekshirilsin |
| `ideaLabExchangeItems` | Hozircha aniq SQL target yo'q; mapping talab qiladi |
| `userProfile` | Auth account bilan avtomatik birlashtirilmaydi |

## 2. Importdan oldingi tekshiruv

1. `IDEALAB.legacy.inspect()` orqali mavjud kalitlar, JSON holati va yozuv sonini ko'ring.
2. Har bir kalit uchun xom JSON backup oling; backup ID va fayl nusxasini alohida saqlang.
3. Dublikat ID, yetishmayotgan ID, noto'g'ri sana, noma'lum status va yetim foreign key'larni hisobot qiling.
4. Egani faqat email yoki ismga qarab taxmin qilmang. Auth UUID bilan tasdiqlanmagan yozuvlar karantin ro'yxatiga o'tadi.
5. Har bir import uchun `legacy_id` va `owner_id` mapping jadvali yarating.
6. Avval staging bazaga import qilib, yozuv soni va bog'lanishlarni solishtiring.

## 3. Import tartibi

1. Auth users va profiles — foydalanuvchi roziligi va identifikatsiya tekshirilgach.
2. Projects, teams, job_posts, specialist_profiles, offers, investors, resources.
3. Applications va resource orders.
4. Offer messages — application va sender bog'lanishi tasdiqlangach.
5. Project members/tasks/updates, events va registrations.

## 4. Idempotentlik va rollback

- Har bir yozuv `(owner_id, legacy_id)` yoki tegishli noyob kalit bilan idempotent bo'lishi kerak.
- Takroriy import yangi nusxa yaratmasligi kerak.
- Import batch ID, manba kaliti, eski ID va yangi UUID yozib boriladi.
- Xato batch butunlay bekor qilinadi; eski localStorage yozuvlari o'chirilmaydi.
- Importdan so'ng source va target count, checksum va foreign-key reconciliation hisoboti saqlanadi.

## 5. Yakuniy qabul mezoni

Import faqat barcha yozuvlar egasi tasdiqlanganda, dublikat/etim yozuvlar izohlanganda, backup tiklanishi sinovdan o'tganda va ikki akkaunt bilan RLS tekshirilganda yakunlangan hisoblanadi.
