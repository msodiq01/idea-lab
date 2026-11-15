# IDEA LAB — amaliy integratsiya rejasi

Sana: 2026-11-15  
Repository: `msodiq01/idea-lab`  
Ishchi branch: `feature/unified-applications-stage-2`  
Holat: auditdan keyingi rejalashtirish; frontend va Supabase hali demo/draft rejimida.

## Asosiy qaror

IDEA LAB — bitta umumiy ekotizim. Global Market, loyihalar, talab-taklif, ish/vakansiyalar, mutaxassislar, investitsiya, jamoalar, tashkilotlar, tadbirlar va boshqa yo‘nalishlar alohida vazifasini saqlaydi, lekin umumiy Account/Profile, Listing, Application, Conversation va Notification qoidalari orqali bog‘lanadi.

Shaxsiy kabinet barcha modullarni o‘ziga ko‘chirib olmaydi. Harakat tegishli modulda bajariladi; kabinet esa foydalanuvchining shaxsiy faoliyati, kelgan/yuborilgan arizalari, javoblari va bildirishnomalarini jamlaydi.

## Auditdan tasdiqlangan hozirgi holat

- Mavjud HTML sahifalar va modullar saqlangan.
- `assets/idea-core.js` markaziy frontend yadro va eski localStorage kalitlarini o‘qish adapteriga ega.
- Ko‘p sahifalar hali eski localStorage kalitlariga yozadi; bu yozuvlar faqat shu brauzerga tegishli.
- `assets/idea-shell.js` barcha sahifalarga umumiy navigatsiya va mahalliy hisoblagichlarni qo‘shadi. Navigatsiyada ko‘p bo‘lim bir vaqtda ko‘rinadi; keyingi UI bosqichida yo‘nalishlar bo‘yicha soddalashtirish kerak.
- `profile.html` profil, loyihalar va ayrim ariza turlarini ko‘rsatadi, ammo to‘liq universal kiruvchi/xarid/hamkorlik inbox emas.
- `marketplace.html` hozircha asosan loyihalarni bozor ko‘rinishida chiqaradi; mahsulot, xizmat, sotuvchi, xaridor va buyurtma oqimi hali to‘liq emas.
- `supabase/schema.sql` mavjud, ammo uning real Supabase loyihasiga qo‘llangani tasdiqlanmagan.
- Mavjud security migration faqat ko‘rib chiqish uchun; backup va target loyiha tekshirilmasdan ishga tushirilmaydi.
- GitHub taqqoslashiga ko‘ra ushbu branch `main` dan 2 commit oldinda; bu commitlar faqat `ECOSYSTEM-ARCHITECTURE.md` va `PLATFORM-MAP.md` hujjatlariga tegishli. Amaldagi HTML/JS hali o‘zgartirilmagan.

## Ishlash tartibi va xavfsizlik chegaralari

1. Har bir bosqich alohida commit va test bilan bajariladi.
2. `main` ga bevosita yozilmaydi; barcha ish `feature/unified-ecosystem` branchida qoladi.
3. Mavjud sahifalar, localStorage kalitlari va yozuvlar o‘chirib tashlanmaydi.
4. Eski ma’lumotlar yangi modelga ko‘chirilishidan oldin eksport/backup, mapping va dublikat tekshiruvi talab qilinadi.
5. Egasi yoki foydalanuvchisi ishonchli aniqlanmagan arizalar kabinetda boshqa odamga biriktirilmaydi.
6. Match — faqat tavsiya. U avtomatik ariza, rozilik, kelishuv yoki to‘lov hisoblanmaydi.
7. Haqiqiy foydalanuvchilararo ma’lumot almashish faqat autentifikatsiya, server API va RLS tekshiruvlari tayyor bo‘lgandan keyin yoqiladi.
8. Brauzerga service-role yoki boshqa maxfiy kalit joylashtirilmaydi.

## Amalga oshirish bosqichlari

### 1-bosqich — navigatsiya va kirish tajribasi
- Asosiy navigatsiyani foydalanuvchini ortiqcha havolalar bilan to‘ldirmaydigan qilib qayta tashkil etish.
- Keng yo‘nalishlar va ularning ichki vositalarini ajratish.
- Har bir mavjud sahifaga yetib borish yo‘lini saqlash.
- Mobil va desktop ko‘rinishlarini tekshirish.

**Qabul mezoni:** hech bir mavjud modul yo‘qolmaydi; asosiy yo‘nalishlar tushunarli; barcha ichki havolalar ishlaydi.

### 2-bosqich — yagona profil va faoliyat identifikatori
- `userProfile` va boshqa eski profil kalitlarini o‘qish tartibini hujjatlashtirish.
- Hozircha ma’lumotni ko‘chirmasdan, eski yozuvlar uchun moslashtiruvchi qatlam yaratish.
- Har bir yangi demo yozuvda barqaror `ownerId` / `applicantId` ishlatish.
- Email yoki ismning o‘zi bilan egani taxmin qilishni to‘xtatish.

**Qabul mezoni:** eski ma’lumotlar o‘qiladi; yangi yozuvlar yagona identifikator bilan bog‘lanadi; mavjud yozuvlar o‘zgarmaydi.

### 3-bosqich — yagona arizalar markazi
- Investitsiya, ish, jamoa, taklif va resurs arizalarini umumiy ko‘rinishda ko‘rsatish.
- Har bir ariza asl moduldagi yozuv IDsi va turiga bog‘langan bo‘lishi.
- Kiruvchi va yuborilgan arizalarni ajratish.
- Holatlarni yagona lug‘atga moslashtirish, eski qiymatlarni yo‘qotmaslik.

**Qabul mezoni:** har bir ariza faqat tegishli egasi va ishtirokchilariga ko‘rinadi; status o‘zgarishi asl moduldagi yozuvda aks etadi.

### 4-bosqich — umumiy e’lonlar va talab/taklif modeli
- Loyiha, vakansiya, mutaxassis, resurs, mahsulot, xizmat, ehtiyoj va takliflarni yagona Listing tamoyiliga bog‘lash.
- Har bir tur uchun alohida maydonlar va validatsiyani saqlash.
- Global Marketni haqiqiy mahsulot/xizmat katalogiga bosqichma-bosqich kengaytirish.

**Qabul mezoni:** mavjud e’lonlar yo‘qolmaydi; har bir e’lonning turi, egasi va holati aniq.

### 5-bosqich — moslashtirish va bildirishnomalar
- Ehtiyoj va takliflarni kategoriya, joylashuv, ko‘nikma, narx/byudjet va mavjudlik bo‘yicha moslashtirish.
- Moslik sababini foydalanuvchiga tushuntirish.
- Faqat tegishli foydalanuvchiga shaxsiy bildirishnoma berish.
- Avtomatik rozilik yoki bitim yaratmaslik.

**Qabul mezoni:** foydalanuvchi moslikni ko‘radi, lekin murojaat yuborish yoki qabul qilishni o‘zi tasdiqlaydi.

### 6-bosqich — backend va xavfsiz migratsiya
- Avval test Supabase loyihasi va test akkauntlar.
- SQL sxema, RLS, view grantlari, owner policy va ariza ishtirokchilari tekshiruvi.
- Eski localStorage ma’lumotlari uchun eksport, migratsiya sinovi va qayta tiklash rejasi.
- Faqat muvaffaqiyatli testdan keyin production ulanishi.

**Qabul mezoni:** ikki yoki undan ortiq akkaunt o‘rtasida ma’lumotlar to‘g‘ri ajratilgan; begona foydalanuvchi yozuvni ko‘ra yoki o‘zgartira olmaydi.

## Amalga oshirilgan ishlar — 2026-11-15

### 1-bosqich: navigatsiya (qisman bajarildi)
- Umumiy navigatsiya 5 ta asosiy yo‘nalish va guruhlangan “Barcha bo‘limlar” menyusiga ajratildi.
- Mobil ko‘rinish uchun moslashuvchan menyu qo‘shildi.
- Eski navigatsiya o‘rniga umumiy shell qo‘llanadi; sahifa mazmuni va modullar saqlanadi.
- Mutaxassislar sahifasidagi eskirgan `jobs.html` havolasi mavjud vakansiya bo‘limiga yo‘naltirildi.

### 2-bosqich: profil identifikatori (birinchi qadam bajarildi)
- Core ichiga mavjud `userProfile.id` dan foydalanadigan identity yordamchilari qo‘shildi.
- Yangi jamoa va vakansiya e’lonlariga profil egasi IDsi va emaili biriktiriladi (profil oldindan saqlangan bo‘lsa).
- Yangi jamoa/ishga arizalarga arizachi IDsi/emaili va e’lon egasining IDsi biriktiriladi.
- Yangi investitsiya arizalariga arizachi identifikatori va loyiha egasi IDsi biriktiriladi.
- Yangi taklif e’lonlariga egasi IDsi/emaili, taklif arizalariga esa arizachi IDsi va taklif egasi identifikatori qo‘shiladi.
- Talab-taklif e’lonlarining yangi yozuvlariga profil egasi IDsi/emaili qo‘shiladi; eski yozuvlar o‘zgarmaydi.
- Kabinetning yagona markaziga taklif arizalari ham qo‘shildi (faqat aniq ID/email mosligida).
- Eski yozuvlar avtomatik ravishda foydalanuvchiga biriktirilmaydi; eski ma’lumotlar o‘zgartirilmagan.

### Tekshiruv
- `assets/idea-core.js`, `assets/idea-shell.js` JavaScript sintaksisi tekshirildi.
- `teams.html`, `project-detail.html`, `profile.html` ichki JavaScript sintaksisi tekshirildi.
- Umumiy CSS qavslar balansi tekshirildi.
- Brauzerda to‘liq funksional, mobil va ikki foydalanuvchili testlar hali bajarilishi kerak.

### 2-bosqich — davomiy integratsiya (2026-11-15)
- `offers.html`: yangi taklif egasiga profil IDsi/emaili biriktiriladi; yangi arizaga arizachi va taklif egasi identifikatorlari yoziladi.
- Taklifga takroriy ariza tekshiruvi profil IDsi mavjud bo‘lsa ID orqali ishlaydi; profilsiz eski demo oqimi ism orqali saqlanadi.
- `exchange.html`: yangi talab/taklif yozuvlariga egasining profil identifikatorlari qo‘shiladi.
- `profile.html`: yagona arizalar markaziga taklif arizalari qo‘shildi; eski identifikatorsiz yozuvlar avtomatik egaga biriktirilmaydi.
- Eski `offers`, `offerApplications`, `offerMessages` va `ideaLabExchangeItems` yozuvlari migratsiya qilinmadi yoki o‘zgartirilmadi.

### Vizual dizayn — yagona SaaS ish maydoni (2026-11-15)
- Umumiy dizayn tizimi premium SaaS ko‘rinishida qayta ishlanmoqda: och rangli sirtlar, aniq tipografika, indigo asosiy rang, yumshoq chegaralar va chuqurlik.
- Barcha sahifalarda bitta ixcham navigatsiya, faol bo‘lim belgisi, guruhlangan bo‘limlar menyusi va mobilga mos menyu qo‘llanadi.
- Takroriy eski menyular yashiriladi; sahifa kontenti, formalar va modullar saqlanadi.
- Hero, kartalar, statistik bloklar, tugmalar, formalar, filtrlar va mobil gridlar uchun umumiy stil qo‘llanadi.
- Demo rejimi ochiq ko‘rsatiladi; haqiqiy server ulanishi bor deb ko‘rsatilmaydi.
- CSS/JS sintaksisi va vizual regresiya tekshiruvlari qo‘shildi; haqiqiy brauzer screenshot/interaction testi hali bajarilishi kerak.

### Keyingi ish
- Vakansiya va jamoa e’lonlarini yaratishdan oldin profil saqlanganini tushuntiruvchi, foydalanuvchini majburlamaydigan UX qo‘shish.
- Ariza statusini kabinetdan o‘zgartirish uchun tegishli moduldagi mavjud xavfsiz status funksiyalariga yo‘naltirish yoki umumiy API yaratish.
- Takliflar va resurs buyurtmalarini profil IDsi bilan bog‘lash.
- So‘ng test brauzerida to‘liq oqimni tekshirish.
