# IDEA LAB — legacy import mapping registry

Bu registry import skriptiga tayyor manba emas; avval real brauzer yozuvlari tekshirilishi shart.

| Frontend key | SQL target | Required identity | Status / unresolved risk |
|---|---|---|---|
| `projects` | `projects` | owner_id + legacy_id | Owner UUID tasdiqlanmagan yozuv karantinga |
| `teams` | `teams` | owner_id + legacy_id | Team mustaqil organizationmi yoki project teammi aniqlash |
| `jobs` | `job_posts` | owner_id + legacy_id | Legacy status mapping tekshirish |
| `specialists` | `specialist_profiles` | owner_id + legacy_id | Saqlash kaliti kodda konstantadan aniqlanadi |
| `ideaLabSpecialists` | `specialist_profiles` | owner_id + legacy_id | `specialists` bilan dublikat bo'lishi mumkin |
| `offers` | `offers` | owner_id + legacy_id | Aloqa maydonlarini publicga chiqarmaslik |
| `investors` | `investors` | owner_id + legacy_id | Shaxs/tashkilot farqi aniqlanadi |
| `resources` | `resources` | owner_id + legacy_id | Legacy format va valyuta aniqlanadi |
| `investmentApplications` | `project_investment_applications` | applicant + project_id | project name bilan emas, aniq FK bilan bog'lash |
| `teamApplications` | `team_applications` | applicant + team_id | Team ID tasdiqlanishi shart |
| `jobApplications` | `job_applications` | applicant + job_id | Job ID tasdiqlanishi shart |
| `offerApplications` | `offer_applications` | applicant + offer_id | Offer ID tasdiqlanishi shart |
| `resourceOrders` | `resource_orders` | requester + resource_id | Buyer/supplier identifikatorlari alohida |
| `offerMessages` | `offer_messages` | sender + application_id | Orphan message import qilinmaydi |
| `ideaLabExchangeItems` | Aniqlanmagan | owner + type | SQL target va biznes qoidasi ishlab chiqilishi kerak |
| `userProfile` | `profiles` | auth.users.id | Email/ism bilan accountni avtomatik birlashtirish mumkin emas |
| `ideaLabCurrentUser` | Auth session emas | N/A | Hech qachon auth token yoki server identity sifatida import qilinmaydi |

## Import batch hisoboti uchun majburiy ustunlar

`source_key, legacy_id, target_table, target_uuid, resolved_owner_uuid, source_hash, import_batch_id, result, rejection_reason`.

## Qarorlar

- Dublikatlar: merge qilishdan oldin operator ko'rigi.
- Yetim bog'lanishlar: karantin; target nomidan ID taxmin qilinmaydi.
- Sana: ISO 8601 UTC formatiga normalizatsiya; original qiymat saqlanadi.
- Status: faqat tasdiqlangan mapping; noma'lum status qoralama/karantin, avtomatik active emas.
- Aloqa ma'lumotlari: minimal yig'ish va alohida maxfiylik siyosati.
- Eski yozuvlar: backup va count reconciliation yakunlanmaguncha o'chirilmaydi.
