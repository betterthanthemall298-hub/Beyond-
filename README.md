# Beyond — متجر هوديز

مشروع React (Vite) + واجهة برمجية (Express) واحدة تعمل على Vercel كدالة Serverless، وقاعدة بيانات Firebase.

## التشغيل محلياً

1. `npm install`
2. انسخ `.env.example` إلى `.env` واملأ القيم (راجع "الإعداد" أدناه).
3. `npm run dev`

## الإعداد على Vercel

في إعدادات المشروع على Vercel (Environment Variables) أضف:

- `FIREBASE_SERVICE_ACCOUNT_JSON` — محتوى ملف Service Account (Firebase Console → Project settings → Service accounts → Generate new private key) كنص JSON كامل.
- `VAPID_PUBLIC_KEY` و `VAPID_PRIVATE_KEY` — نفذ `npx web-push generate-vapid-keys` محلياً وانسخ الناتج.
- `VAPID_EMAIL` — بريد إلكتروني أو رابط موقعك، مثل `mailto:you@example.com`.
- `OWNER_EMAIL` (اختياري) — بريد حساب المالك الرئيسي في Firebase Authentication.
- `ADMIN_EMAILS` (اختياري) — قائمة بريد إلكتروني إضافية مفصولة بفواصل تُمنح صلاحية الأدمن مباشرة.

## نشر قواعد Firebase

```
npm i -g firebase-tools
firebase login
firebase deploy --only firestore:rules,storage
```

## الاختبارات

`npm test` يشغّل اختبارات نقطة النهاية (API) على قاعدة بيانات وهمية في الذاكرة، بدون الحاجة لاتصال حقيقي بـ Firebase.
