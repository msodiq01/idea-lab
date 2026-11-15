# IDEA LAB — 20 ta platforma poydevori vazifasi

Sana: 2026-11-15  
Branch: `feature/platform-foundation-20`  
Holat: frontend yadro darajasida bajarildi; server xavfsizligi o'rnini bosmaydi.

## Bajarilgan 20 yo'nalish

1. Xavfsiz JSON parser — buzilgan JSON sahifani to'xtatmaydi.
2. Matnni normalizatsiya qilish — bosh/oxir bo'sh joy va nazorat belgilarini olib tashlaydi.
3. Matn uzunligini cheklash — haddan tashqari katta qiymatni kesadi.
4. Email formatini tekshirish — mavjud validator yagona qoidaga ulanadi.
5. Telefon formatini tekshirish — mavjud validator qayta ishlatiladi.
6. Pul qiymatini tekshirish — manfiy, cheksiz va juda katta qiymat rad etiladi.
7. Sana formatini tekshirish — ISO sana va haqiqiy kalendar sanasi tekshiriladi.
8. Majburiy maydonlar — formalar uchun maydon darajasidagi xatolar.
9. Matn uzunligi qoidalari — minimum va maksimum.
10. Enum allowlist — status/tur kabi qiymatlar ruxsat etilgan ro'yxat bilan tekshiriladi.
11. Noto'g'ri obyekt shakli — array/null form record sifatida qabul qilinmaydi.
12. API xatolarini normallashtirish — HTTP status va katalog kodlari bir xil javobga keladi.
13. Xavfsiz xato matnlari — SQL yoki server ichki xabari UI'ga uzatilmaydi.
14. Maydon xatolari va request ID — faqat kerakli diagnostika maydonlari saqlanadi.
15. Pagination normalizatsiyasi — sahifa raqami va sahifa hajmi chegaralanadi.
16. Yagona ariza status o'tish xaritasi — ruxsat etilgan keyingi holatlar markazlashtiriladi.
17. Arizachi amali — foydalanuvchi faqat o'z arizasini bekor qilishga ruxsat oladi.
18. E'lon egasi amali — target egasi ko'rib chiqish/qaror statuslarini o'zgartirishga UI darajasida tekshiriladi.
19. Public profil DTO — email, telefon, resume yo'li, role va credential maydonlari ommaviy obyektga kiritilmaydi.
20. Offline backend adapter — server yo'qligida operatsiyalar aniq `BACKEND_NOT_CONFIGURED` xatosini qaytaradi.

## Fayllar

- `assets/idea-core.js` — umumiy validation, pagination, error, application transition, privacy va offline adapter API.
- `tests/platform-foundation.test.cjs` — 22 ta avtomatik test.
- `PLATFORM-FOUNDATION-20.md` — ushbu bajarilgan ishlar va qabul chegaralari.

## Xavfsizlik chegaralari

- Bu yordamchilar brauzerda ishlaydi. Ular RLS, server authorization yoki haqiqiy foydalanuvchi identifikatsiyasi emas.
- Email/telefon bilan egani aniqlash yoki ruxsat berish serverda qo'llanmaydi.
- Application status transition serverda qayta tekshirilishi shart.
- Public profil projection faqat frontend chiqish DTO'si; maxfiy ustunlarni server view/API'dan ham chiqarish kerak.
- Offline adapter hech qanday serverga ulanmaydi va hech qanday ma'lumot yubormaydi.
- Supabase SQL, production schema, foydalanuvchi yozuvlari va localStorage legacy kalitlariga tegilmadi.

## Tekshiruv

GitHub Actions `node --test tests/*.test.cjs` orqali mavjud testlar va yangi 22 testni bajarishi kerak. CI natijasi ko'rilmaguncha ushbu branch yakuniy deb e'lon qilinmaydi. Brauzer, mobil va staging RLS sinovlari alohida qoladi.
