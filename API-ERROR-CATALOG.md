# IDEA LAB — API xatolari katalogi

Backend adapter va UI xatolarini yagona ko'rinishda boshqarish uchun.

| Kod | HTTP | Ma'nosi | UI harakati |
|---|---:|---|---|
| `AUTH_REQUIRED` | 401 | Sessiya yo'q yoki muddati tugagan | Kirish sahifasiga yo'naltirish; formani saqlab qolish |
| `FORBIDDEN` | 403 | Amalga ruxsat yo'q | Ruxsat yo'qligini ko'rsatish; ma'lumotni yashirish |
| `NOT_FOUND` | 404 | Yozuv topilmadi yoki ko'rish huquqi yo'q | Umumiy topilmadi holati |
| `VALIDATION_ERROR` | 422 | Maydon tekshiruvi o'tmadi | Tegishli maydon xabarini ko'rsatish |
| `CONFLICT` | 409 | Takroriy ariza yoki eskirgan yangilanish | Yangilangan ma'lumotni qayta yuklash |
| `RATE_LIMITED` | 429 | So'rovlar limiti | Qayta urinish vaqtini ko'rsatish |
| `NETWORK_ERROR` | — | Tarmoq uzilishi | Kiritilgan matnni yo'qotmaslik; qayta urinish |
| `BACKEND_NOT_CONFIGURED` | — | Backend sozlanmagan | Demo rejimini aniq ko'rsatish |
| `BACKEND_UNAVAILABLE` | 5xx | Server vaqtincha ishlamayapti | Xavfsiz xabar va qayta urinish |
| `UNKNOWN_ERROR` | — | Kutilmagan xato | Request ID bilan texnik log; sirlarni loglamaslik |

## Umumiy javob shakli

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Maydonlarni tekshiring.",
    "fields": { "title": "Sarlavha kiritilishi kerak." },
    "requestId": "server-generated-id"
  }
}
```

UI stack trace, SQL matni, token, parol, email/telefon kabi maxfiy ma'lumotni foydalanuvchiga yoki analytics logga chiqarmaydi.
