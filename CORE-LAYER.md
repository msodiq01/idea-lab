# IDEA LAB — markaziy frontend qatlam

Versiya: 1.0.0  
Sana: 2026-11-15  
Holat: alohida tayyorlangan frontend yadro; sahifalarga hali ulanmagan.

## Yaratilgan fayl

- `assets/idea-core.js` — umumiy konfiguratsiya, mahalliy demo saqlash adapteri, status lug'ati, hodisalar, ID va yordamchi funksiyalar.

## Nimalarni standartlashtiradi?

- `window.IDEALAB.version` — yadro versiyasi.
- `window.IDEALAB.environment` — hozirgi holat `offline-demo`; backend va autentifikatsiya yo'q.
- `window.IDEALAB.store` — xavfsiz JSON localStorage get/set/remove interfeysi.
- `window.IDEALAB.legacy.inspect(keys)` — ruxsat etilgan eski kalitlarni faqat metadata darajasida tekshiradi; qiymatlarni ko‘rsatmaydi.
- `window.IDEALAB.legacy.createBackup(keys)` — faqat aniq uzatilgan kalitlar uchun, chaqiruvchi tomonidan ishga tushiriladigan zaxira nusxa yaratadi. Xom qiymatlar nusxalanadi; shu sababli maxfiy ma’lumotlar ham zaxiraga kirishi mumkin.
- `window.IDEALAB.legacy.readBackup(id)` — shu brauzerda saqlangan zaxirani tekshirish uchun o‘qiydi.
- `window.IDEALAB.status` va `statusLabel()` — umumiy status lug'ati.
- `subscribe()` / `emit()` — modullararo hodisalar.
- `createId()`, `escapeHtml()`, `formatDate()` — umumiy utilitalar.
- `isValidEmail()`, `isValidPhone()` — oddiy frontend tekshiruvlari.

## Keyin qanday ulash kerak?

Sahifaning boshqa skriptlaridan oldin quyidagini qo'shish mumkin:

```html
<script src="assets/idea-core.js"></script>
```

Misol:

```js
const result = IDEALAB.store.set("sample", { title: "Yangi loyiha" });
const saved = IDEALAB.store.get("sample", {});
const unsubscribe = IDEALAB.subscribe(IDEALAB.events.storageChanged, (event) => {
  console.log("Mahalliy ma'lumot yangilandi:", event.key);
});
```

## Muhim cheklovlar

1. Yadro hozircha hech bir sahifaga avtomatik ulanmagan; mavjud funksiyalar o'zgarmaydi.
2. Yangi store kalitlari `ideaLab.core.` prefiksi bilan saqlanadi va eski localStorage kalitlariga tegmaydi.
3. Bu brauzer ichidagi demo saqlash. Ma'lumotlar boshqa foydalanuvchilarga ko'rinmaydi va autentifikatsiya o'rnini bosmaydi.
4. Email/telefon tekshiruvi faqat qulaylik uchun; server tekshiruvini almashtirmaydi.
5. Status lug'ati keyinchalik barcha sahifalardagi hozirgi turli statuslar bilan alohida mapping sinovidan o'tkaziladi.
6. Faylni sahifalarga ulashdan oldin skript tartibi, konfliktlar va har bir oqim brauzerda tekshirilishi shart.

## Tekshiruv

- JavaScript sintaksisi tekshirilsin.
- Storage mavjud bo'lmagan holatda xato boshqaruvi tekshirilsin.
- XSS uchun `escapeHtml` test qilinsin.
- Status lug'atidagi qiymatlar UI'dagi mavjud statuslar bilan solishtirilsin.
- Ikki sahifaga ulashdan oldin bir sahifadagi mavjud localStorage kalitlari bilan to'qnashuv yo'qligi tekshirilsin.

## Legacy ma’lumotlarini tekshirish va zaxiralash

```js
const report = IDEALAB.legacy.inspect(["projects", "jobApplications"]);
// Faqat foydalanuvchi roziligi va aniq tanlovidan keyin:
const backup = IDEALAB.legacy.createBackup(["projects", "jobApplications"]);
const verified = IDEALAB.legacy.readBackup(backup.backupId);
```

Bu amallar ma’lumotni yangi formatga ko‘chirmaydi va eski kalitlarni o‘chirmaydi. Migratsiya uchun avval maydonlar xaritasi, dublikat/egasiz yozuvlar tekshiruvi, zaxirani qayta tiklash sinovi va alohida tasdiq kerak.

## Ataylab qilinmagan ishlar

- Hech qanday mavjud HTML sahifa o'zgartirilmadi.
- Hech qanday mavjud localStorage ma'lumoti ko'chirilmadi yoki o'chirilmadi.
- Supabase yoki boshqa backendga ulanish qilinmadi.
