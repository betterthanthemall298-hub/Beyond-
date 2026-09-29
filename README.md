# Beyond — متجر هوديز

مشروع React (Vite) + واجهة برمجية (Express) واحدة تعمل على Vercel كدالة Serverless، وقاعدة بيانات Firebase.

## بنية المشروع

- `src/` — الواجهة (React + Vite)
- `api-src/index.ts` — الكود المصدري للـ API (Express app)
- `api/index.cjs` — **ملف مُولَّد تلقائيًا** أثناء البناء (`npm run build`) من `api-src/index.ts` عبر esbuild، وهو الملف الفعلي اللي بيشتغل على Vercel. متتعدلش فيه يدويًا ولا ترفعه على Git — بيتنسى ويتبنى من جديد في كل Deploy.
- `server.ts` — سيرفر التطوير المحلي فقط (`npm run dev`)، بيشغّل نفس كود `api-src/index.ts` مباشرة بدون تجميع.

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

أمر البناء على Vercel هو `npm run build`، وهو بيعمل حاجتين: `vite build` للواجهة، ثم `esbuild` لتجميع `api-src/index.ts` في ملف واحد (`api/index.cjs`). التجميع ده ضروري لتفادي مشكلة `ERR_REQUIRE_ESM` اللي بتحصل مع بعض مكتبات Firebase Admin على بيئة Vercel لو اتسابت غير مجمّعة.

## نشر قواعد Firebase

```
npm i -g firebase-tools
firebase login
firebase deploy --only firestore:rules,storage
```

## الاختبارات

`npm test` يشغّل اختبارات نقطة النهاية (API) على قاعدة بيانات وهمية في الذاكرة، بدون الحاجة لاتصال حقيقي بـ Firebase.
