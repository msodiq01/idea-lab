# IDEA LAB — modul va ma’lumotlar zanjiri xaritasi

Tekshiruv sanasi: 2026-11-16
Kod bazasi: msodiq01/idea-lab
Asos: fix/internal-dashboard-live-data ustidagi integratsiya va dizayn ishlari.

## Holatlarni qanday tushunish kerak?

- **Server bilan ishlaydi** — sahifa tasdiqlangan Supabase Auth / xavfsiz view / RPC oqimidan foydalanadi.
- **Qisman server** — faqat ko‘rsatilgan qismi serverga ulangan; qolgan amallar mahalliy.
- **Demo / localStorage** — yozuvlar shu brauzerda qoladi; boshqa foydalanuvchi yoki qurilmaga avtomatik uzatilmaydi.
- **Demo-only** — haqiqiy moliyaviy, investitsion yoki tashqi operatsiya bajarilmaydi.

## Modul holatlari

| Modul | Sahifa(lar) | Hozirgi holat | Keyingi ulanish zanjiri |
|---|---|---|---|
| Identifikatsiya | auth.html, profile.html | Auth sessiyasi va profil user-metadata sinxroni mavjud; avatar local | Auth UID → profil → tashkilot a’zoligi → ruxsatlar |
| Loyihalar | index.html, projects.html, project-detail.html, project-workspace.html | Yaratish, ommaviy katalog, tafsilot va ayrim a’zolik amallari server adapter/RPC orqali | Auth egasi → loyiha → katalog → tafsilot → jamoa/a’zolar → yangilanishlar |
| Arizalar markazi | applications.html | Ishtirokchi doirasidagi server view va mavjud RPC oqimlari | Arizachi → ariza → maqsad egasi → status o‘zgarishi → audit/bildirishnoma |
| Ochiq resurslar | resources.html | Ommaviy server katalogi faqat o‘qish uchun; shaxsiy inventar local | Resurs → egasi → buyurtma → tasdiq → yetkazish/holat |
| Investorlar | investors.html, investor-portfolio.html | Demo-only; haqiqiy sarmoya, to‘lov yoki pul o‘tkazmasi yo‘q | Faqat qonuniy va xavfsiz hamkorlik/tekshiruv oqimi alohida loyihalanadi |
| Jamoalar va vakansiyalar | teams.html | Demo/local | Auth egasi → jamoa → vakansiya → ariza → egasi qarori |
| Mutaxassislar | specialists.html | Demo/local | Profil → ko‘nikma → qidiruv/moslashtirish → loyiha taklifi |
| Takliflar va xabarlar | offers.html | Demo/local | E’lon → ariza → faqat ishtirokchilar uchun xabarlar → kelishuv holati |
| Talab va taklif almashinuvi | exchange.html | Demo/local | E’lon turi → egasi → ariza/so‘rov → buyurtma |
| Marketplace | marketplace.html | Cheklangan demo; to‘liq savdo/order tizimi emas | Sotuvchi → mahsulot/xizmat → narx → buyurtma → yetkazish |
| Moliya va xarajatlar | finance.html, project-expenses.html | Demo/local; bank yoki to‘lov provayderi ulanmagan | Loyiha → xarajat hujjati → tasdiq → buxgalteriya integratsiyasi |
| Analitika | analytics.html, dashboard.html | Dashboardda ayrim server ma’lumotlari; boshqa ko‘rsatkichlar cheklangan/demo | Faqat serverdan tasdiqlangan ma’lumot → metrika → hisobot |
| Bildirishnoma va faoliyat | notifications.html, activity.html | Demo/local; real-time server xabarlari tasdiqlanmagan | Server hodisasi → foydalanuvchi → ruxsatli bildirishnoma → o‘qildi holati |
| Tashkilotlar va ruxsatlar | organizations.html, access.html, management.html | Demo/local; haqiqiy RBAC emas | Auth UID → tashkilot a’zoligi → server roli → ruxsat tekshiruvi |
| Yetkazib beruvchi tekshiruvi | suppliers.html, supplier-verification.html, supplier-reviewer.html, supplier-verification-admin.html | Demo/local | Yetkazib beruvchi → hujjat → tekshiruvchi → qaror → audit |
| Zaxira va to‘plamlar | backup.html, collection.html | Brauzer darajasidagi prototip | Foydalanuvchi roziligi → eksport/zaxira → saqlash siyosati → tiklash sinovi |

## Hozir ishlayotgan asosiy zanjir

Akkaunt (Auth) → Profil → Loyiha yaratish → Ommaviy loyiha katalogi → Loyiha tafsiloti → Ariza yuborish → Arizalar markazi.

Bu zanjirning ayrim bosqichlari server bilan ishlaydi. Biroq ikki alohida test akkauntida RLS izolyatsiyasi va barcha rol/egalik ssenariylari hali qabul sinovidan o‘tmagan. Shuning uchun butun platforma to‘liq serverga ulangan deb hisoblanmaydi.

## Dizayn va navigatsiya

- assets/idea-shell.css barcha asosiy sahifalarda umumiy dizayn qatlami sifatida ishlatiladi.
- assets/idea-shell.js umumiy navigatsiya, kabinet havolasi va sahifa kontekstini beradi.
- auth.html alohida kirish sahifasi bo‘lib, unda takroriy asosiy navigatsiya ko‘rsatilmaydi.
- Premium vizual qatlam ranglar, tipografika, hero, kartalar, formalar, jadvallar va mobil ko‘rinishni bir xil tizimga keltiradi.
- Yuqori paneldagi holat belgisi server konfiguratsiyasi borligini bildiradi; “qisman integratsiya” yozuvi barcha modullar serverda ishlaydi degani emas.

## Har bir modul uchun yakuniy qabul mezonlari

1. Kirish huquqi va ma’lumot egasi serverda aniqlanadi.
2. CRUD amallari serverga saqlanadi; brauzer yuborgan user_id egani belgilamaydi.
3. Loading, bo‘sh natija, xato va muvaffaqiyat holatlari mavjud.
4. Boshqa foydalanuvchi ma’lumotini ko‘rish/o‘zgartirishga urinish RLS bilan to‘siladi.
5. Desktop va mobil brauzerda asosiy foydalanuvchi oqimi sinovdan o‘tadi.
6. Avtomatik testlar va kamida ikki akkauntli izolyatsiya sinovi o‘tadi.

## Keyingi ustuvorlik

1. Hozirgi Auth → loyiha → ariza zanjirini ikki akkaunt bilan to‘liq tekshirish.
2. Jamoa/vakansiya/mutaxassis modullarini bitta identifikatsiya va ariza modeliga ulash.
3. Takliflar/xabarlar va resurs buyurtmalarini ishtirokchi/egalik RLS bilan ulash.
4. Bildirishnoma va faoliyatni server hodisalari bilan bog‘lash.
5. Moliya, marketplace va tekshiruv modullarini alohida xavfsizlik hamda qonuniy talablar asosida loyihalash.
