import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import webpush from 'web-push';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface Deps {
  db: any;
  auth: any;
  increment: (n: number) => any;
  sendPush: (sub: { endpoint: string; keys: any }, payload: string) => Promise<void>;
  httpPost: (url: string, headers: Record<string, string>, body: string) => Promise<void>;
  vapidPublicKey: () => string;
  now: () => Date;
}

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/* -------------------------------------------------------------------------- */
/*  Config                                                                     */
/* -------------------------------------------------------------------------- */

const DEFAULT_ADMINS = ['vdbbdv1234567889@gmail.com', 'eslsmgomaa47@gmail.com'];
let rawOwner = (process.env.OWNER_EMAIL || 'vdbbdv1234567889@gmail.com').toLowerCase().trim();
if (!rawOwner.includes('@') && rawOwner.includes('2gmail.com')) {
  rawOwner = rawOwner.replace('2gmail.com', '@gmail.com');
}
const OWNER_EMAIL = rawOwner || 'vdbbdv1234567889@gmail.com';

const envAdmins = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .map((e) => (!e.includes('@') && e.includes('2gmail.com') ? e.replace('2gmail.com', '@gmail.com') : e))
  .filter(Boolean);

const ADMIN_EMAILS = new Set([
  ...DEFAULT_ADMINS,
  ...envAdmins,
  OWNER_EMAIL
]);

const PHONE_REGEX = /^01[0125][0-9]{8}$/;
const VALID_SIZES = new Set(['M', 'L', 'XL', '2XL']);

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** "الدقهلية (المنصورة)" -> "الدقهلية" */
export function normalizeGovName(name: unknown): string {
  return String(name ?? '')
    .replace(/\s*[\(（][^\)）]*[\)）]\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cairoParts(d: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '00';
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour'), min: get('minute') };
}

export function cairoDateString(d: Date): string {
  const p = cairoParts(d);
  return `${p.y}-${p.m}-${p.d}`;
}

export function cairoDateTimeString(d: Date): string {
  const p = cairoParts(d);
  return `${p.y}-${p.m}-${p.d} ${p.h}:${p.min}`;
}

function cairoHour(d: Date): string {
  return String(parseInt(cairoParts(d).h, 10) || 0);
}

function getIp(req: Request): string {
  const v = req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'];
  const first = Array.isArray(v) ? v[0] : String(v || '').split(',')[0];
  return (first || req.socket?.remoteAddress || 'unknown').trim();
}

function shortHash(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex').slice(0, 32);
}

function str(v: unknown, max: number): string {
  return String(v ?? '').trim().slice(0, max);
}

/** Firestore-backed rate limiter (works across serverless instances). Fails open. */
async function allow(deps: Deps, key: string, max: number, windowMs: number): Promise<boolean> {
  try {
    const ref = deps.db.collection('rate_limits').doc(shortHash(key));
    const nowMs = deps.now().getTime();
    return await deps.db.runTransaction(async (t: any) => {
      const snap = await t.get(ref);
      const data = snap.exists ? snap.data() : null;
      if (!data || Number(data.resetAt) <= nowMs) {
        t.set(ref, { count: 1, resetAt: nowMs + windowMs });
        return true;
      }
      if (Number(data.count) >= max) return false;
      t.update(ref, { count: Number(data.count) + 1 });
      return true;
    });
  } catch (err) {
    console.warn('[rate-limit] check failed, allowing request:', (err as any)?.message || err);
    return true;
  }
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | undefined> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      () => {
        clearTimeout(timer);
        resolve(undefined);
      }
    );
  });
}

/* -------------------------------------------------------------------------- */
/*  Real dependencies (lazy, cached across warm invocations)                   */
/* -------------------------------------------------------------------------- */

function parseServiceAccount(): any | null {
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  const tryParse = (text: string): any | null => {
    try {
      return JSON.parse(text);
    } catch {
      try {
        // Tolerate raw newlines pasted inside the private key
        return JSON.parse(text.replace(/\r?\n/g, '\\n'));
      } catch {
        return null;
      }
    }
  };

  let cred: any = null;
  if (raw) {
    cred = raw.startsWith('{') ? tryParse(raw) : null;
    if (!cred) {
      try {
        const decoded = Buffer.from(raw, 'base64').toString('utf8').trim();
        if (decoded.startsWith('{')) cred = tryParse(decoded);
      } catch {
        /* ignore */
      }
    }
  }

  if (!cred) {
    const p = path.join(process.cwd(), 'service-account.json');
    if (fs.existsSync(p)) cred = tryParse(fs.readFileSync(p, 'utf8'));
  }

  if (cred && typeof cred.private_key === 'string') {
    cred.private_key = cred.private_key.replace(/\\n/g, '\n');
  }
  return cred;
}

function getProjectId(): string {
  if (process.env.FIREBASE_PROJECT_ID) return process.env.FIREBASE_PROJECT_ID;
  if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT;
  try {
    const p = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(p)) {
      const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (cfg.projectId) return cfg.projectId;
    }
  } catch {}
  return 'beyond-a32a4';
}

let realDeps: Deps | null = null;

function getRealDeps(): Deps {
  if (realDeps) return realDeps;

  const cred = parseServiceAccount();
  const projectId = cred?.project_id || getProjectId();

  const app =
    getApps().length > 0
      ? getApps()[0]!
      : initializeApp(cred ? { credential: cert(cred), projectId } : { projectId });

  const vapidPublic = (process.env.VAPID_PUBLIC_KEY || '').trim();
  const vapidPrivate = (process.env.VAPID_PRIVATE_KEY || '').trim();
  let vapidEmail = (process.env.VAPID_EMAIL || `mailto:${OWNER_EMAIL}`).trim();
  if (!/^(mailto:|https?:\/\/)/.test(vapidEmail)) vapidEmail = `mailto:${vapidEmail}`;
  let vapidReady = false;
  if (vapidPublic && vapidPrivate) {
    try {
      webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);
      vapidReady = true;
    } catch (err) {
      console.error('[Push] Invalid VAPID configuration:', (err as any)?.message || err);
    }
  }

  realDeps = {
    db: getFirestore(app),
    auth: getAuth(app),
    increment: (n: number) => FieldValue.increment(n),
    sendPush: async (sub, payload) => {
      if (!vapidReady) throw new Error('VAPID not configured');
      await webpush.sendNotification(sub as any, payload, {
        TTL: 60,
        urgency: 'high',
        timeout: 4000,
        headers: { Topic: 'order-alert' }
      } as any);
    },
    httpPost: async (url, headers, body) => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      try {
        await fetch(url, { method: 'POST', headers, body, signal: ctrl.signal });
      } finally {
        clearTimeout(timer);
      }
    },
    vapidPublicKey: () => vapidPublic,
    now: () => new Date()
  };
  return realDeps;
}

/* -------------------------------------------------------------------------- */
/*  App factory                                                                */
/* -------------------------------------------------------------------------- */

export function createApp(getDeps: () => Deps) {
  const app = express();
  app.set('trust proxy', true);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });

  const wrap =
    (fn: (req: Request, res: Response, deps: Deps) => Promise<any>) =>
    async (req: Request, res: Response) => {
      try {
        await fn(req, res, getDeps());
      } catch (err: any) {
        const status = err instanceof HttpError ? err.status : Number(err?.status) || 500;
        if (status >= 500) console.error(`[API ${req.method} ${req.path}]`, err);
        if (!res.headersSent) {
          res.status(status).json({
            success: false,
            error: status >= 500 && !(err instanceof HttpError) ? 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى' : err.message
          });
        }
      }
    };

  const requireAdmin =
    (fn: (req: Request, res: Response, deps: Deps) => Promise<any>) =>
    wrap(async (req, res, deps) => {
      const header = String(req.headers.authorization || '');
      const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
      if (!token) throw new HttpError(401, 'غير مصرح');
      let decoded: any;
      try {
        decoded = await deps.auth.verifyIdToken(token);
      } catch {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
            const email = String(payload?.email || '').toLowerCase();
            const nowSec = Math.floor(Date.now() / 1000);
            if (payload?.exp && payload.exp > nowSec && (payload?.admin === true || ADMIN_EMAILS.has(email))) {
              decoded = payload;
            }
          }
        } catch {}
        if (!decoded) {
          throw new HttpError(401, 'انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى');
        }
      }
      const email = String(decoded?.email || '').toLowerCase();
      if (decoded?.admin !== true && !ADMIN_EMAILS.has(email)) {
        throw new HttpError(403, 'ليس لديك صلاحية الوصول');
      }
      (req as any).adminUser = decoded;
      return fn(req, res, deps);
    });

  /* ------------------------------ basic ------------------------------ */

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'beyond-store' });
  });

  app.get('/api/push/vapid-public-key', (_req, res) => {
    let key = '';
    try {
      key = getDeps().vapidPublicKey();
    } catch {
      key = (process.env.VAPID_PUBLIC_KEY || '').trim();
    }
    res.json({ publicKey: key });
  });

  /* ------------------------- push subscriptions ---------------------- */

  const subId = (endpoint: string) => shortHash(endpoint);

  app.post(
    '/api/push/subscribe',
    requireAdmin(async (req, res, deps) => {
      const { subscription, userAgent } = req.body || {};
      if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        throw new HttpError(400, 'بيانات الاشتراك غير صالحة');
      }
      await deps.db
        .collection('push_subscriptions')
        .doc(subId(String(subscription.endpoint)))
        .set(
          {
            endpoint: String(subscription.endpoint),
            keys: { p256dh: String(subscription.keys.p256dh), auth: String(subscription.keys.auth) },
            userAgent: str(userAgent || 'unknown', 300),
            updatedAt: deps.now().toISOString()
          },
          { merge: true }
        );
      const snap = await deps.db.collection('push_subscriptions').get();
      res.json({ success: true, activeCount: snap.size });
    })
  );

  app.post(
    '/api/push/unsubscribe',
    requireAdmin(async (req, res, deps) => {
      const endpoint = String(req.body?.endpoint || '');
      if (endpoint) {
        await deps.db.collection('push_subscriptions').doc(subId(endpoint)).delete().catch(() => {});
      }
      const snap = await deps.db.collection('push_subscriptions').get();
      res.json({ success: true, activeCount: snap.size });
    })
  );

  app.get(
    '/api/push/status',
    requireAdmin(async (_req, res, deps) => {
      const snap = await deps.db.collection('push_subscriptions').get();
      res.json({ configured: !!deps.vapidPublicKey(), subscriptionsCount: snap.size });
    })
  );

  async function getNotificationSecrets(deps: Deps) {
    try {
      const snap = await deps.db.collection('private_settings').doc('notifications').get();
      const d = snap.exists ? snap.data() || {} : {};
      return {
        telegramBotToken: str(d.telegramBotToken, 200),
        telegramChatId: str(d.telegramChatId, 100),
        ntfyTopic: str(d.pushNotificationTopic, 100).replace(/[^a-zA-Z0-9_-]/g, '')
      };
    } catch {
      return { telegramBotToken: '', telegramChatId: '', ntfyTopic: '' };
    }
  }

  async function getBrandLogo(deps: Deps): Promise<string> {
    try {
      const snap = await deps.db.collection('settings').doc('general').get();
      const d = snap.exists ? snap.data() || {} : {};
      const logo = String(d.notificationLogoUrl || d.brandLogo || '');
      return logo.startsWith('http') ? logo : '/icon-192.png';
    } catch {
      return '/icon-192.png';
    }
  }

  /** Send a web push to every admin device, dropping expired subscriptions. */
  async function pushToAdmins(deps: Deps, payload: Record<string, any>): Promise<{ sent: number; total: number }> {
    const snap = await deps.db.collection('push_subscriptions').get();
    const json = JSON.stringify(payload);
    let sent = 0;
    const seen = new Set<string>();
    await Promise.all(
      snap.docs.map(async (d: any) => {
        const s = d.data() || {};
        if (!s.endpoint || !s.keys?.p256dh || !s.keys?.auth) return;
        if (seen.has(s.endpoint)) {
          await d.ref.delete().catch(() => {});
          return;
        }
        seen.add(s.endpoint);
        try {
          await deps.sendPush({ endpoint: s.endpoint, keys: s.keys }, json);
          sent++;
        } catch (err: any) {
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await d.ref.delete().catch(() => {});
          }
        }
      })
    );
    return { sent, total: snap.size };
  }

  async function sendExternalAlerts(deps: Deps, title: string, telegramText: string, plainBody: string) {
    const secrets = await getNotificationSecrets(deps);
    const jobs: Promise<any>[] = [];
    if (secrets.telegramBotToken && secrets.telegramChatId) {
      jobs.push(
        deps.httpPost(
          `https://api.telegram.org/bot${secrets.telegramBotToken}/sendMessage`,
          { 'Content-Type': 'application/json' },
          JSON.stringify({ chat_id: secrets.telegramChatId, text: telegramText })
        )
      );
    }
    if (secrets.ntfyTopic) {
      jobs.push(
        deps.httpPost(
          `https://ntfy.sh/${secrets.ntfyTopic}`,
          { Title: '=?UTF-8?B?' + Buffer.from(title, 'utf8').toString('base64') + '?=', Priority: 'high', Tags: 'package,bell' },
          plainBody
        )
      );
    }
    await Promise.allSettled(jobs);
  }

  app.post(
    '/api/push/test',
    requireAdmin(async (req, res, deps) => {
      const logo = String(req.body?.logoUrl || '').startsWith('http')
        ? String(req.body.logoUrl)
        : await getBrandLogo(deps);
      const result = await withTimeout(
        pushToAdmins(deps, {
          title: 'Beyond | تجربة الإشعارات',
          body: 'الإشعارات تعمل بنجاح.',
          icon: logo,
          badge: logo,
          logoUrl: logo,
          url: '/?view=admin',
          tag: 'test-push-' + Date.now(),
          timestamp: Date.now()
        }),
        6000
      );
      await withTimeout(
        sendExternalAlerts(deps, 'Beyond | تجربة الإشعارات', '🔔 تجربة الإشعارات تعمل بنجاح', 'تجربة الإشعارات تعمل بنجاح'),
        6000
      );
      res.json({ success: true, sentCount: result?.sent ?? 0, totalSubscribers: result?.total ?? 0 });
    })
  );

  /* ------------------------------ orders ------------------------------ */

  async function ensureCounter(deps: Deps) {
    const ref = deps.db.collection('counters').doc('orders');
    const snap = await ref.get();
    if (snap.exists && typeof snap.data()?.currentNumber === 'number') return;
    const orders = await deps.db.collection('orders').get();
    let max = 0;
    orders.forEach((d: any) => {
      const n = parseInt(String(d.data()?.orderNumber || '').replace(/\D/g, ''), 10);
      if (!isNaN(n) && n > max) max = n;
    });
    // Only initialise if still missing (avoid racing with another instance)
    await deps.db.runTransaction(async (t: any) => {
      const again = await t.get(ref);
      if (!again.exists || typeof again.data()?.currentNumber !== 'number') {
        t.set(ref, { currentNumber: max, initializedAt: deps.now().toISOString() }, { merge: true });
      }
    });
  }

  async function loadShippingMap(deps: Deps): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    try {
      const doc = await deps.db.collection('settings').doc('shipping').get();
      const list = doc.exists ? doc.data()?.list : null;
      if (Array.isArray(list)) {
        for (const g of list) {
          const key = normalizeGovName(g?.name);
          if (key && typeof g?.cost === 'number' && !map.has(key)) map.set(key, g.cost);
        }
      }
    } catch (err) {
      console.warn('[orders] shipping list read failed:', (err as any)?.message || err);
    }
    if (map.size === 0) {
      const snap = await deps.db.collection('governorates').get();
      snap.forEach((d: any) => {
        const key = normalizeGovName(d.data()?.name || d.id);
        if (key && typeof d.data()?.cost === 'number' && !map.has(key)) map.set(key, d.data().cost);
      });
    }
    return map;
  }

  app.post(
    '/api/orders/create',
    wrap(async (req, res, deps) => {
      const ip = getIp(req);
      if (!(await allow(deps, 'create-ip:' + ip, 20, 10 * 60 * 1000))) {
        throw new HttpError(429, 'محاولات كثيرة، يرجى الانتظار قليلاً ثم المحاولة مرة أخرى');
      }

      const body = req.body || {};
      const rawItems = Array.isArray(body.items) ? body.items : [];
      if (rawItems.length === 0) throw new HttpError(400, 'السلة فارغة');
      if (rawItems.length > 30) throw new HttpError(400, 'الحد الأقصى لعدد أصناف الطلب 30 صنفاً');

      const customerName = str(body.customerName, 200);
      if (!customerName || customerName.length > 100) throw new HttpError(400, 'يرجى كتابة الاسم بشكل صحيح');

      const phone = String(body.phone || '').replace(/\s+/g, '');
      if (!PHONE_REGEX.test(phone)) throw new HttpError(400, 'يرجى إدخال رقم هاتف مصري صحيح (مثال: 01012345678)');

      let alternatePhone = '';
      if (body.alternatePhone && String(body.alternatePhone).trim()) {
        alternatePhone = String(body.alternatePhone).replace(/\s+/g, '');
        if (!PHONE_REGEX.test(alternatePhone)) throw new HttpError(400, 'رقم الهاتف الاحتياطي غير صالح');
      }

      const governorate = normalizeGovName(body.governorate);
      if (!governorate) throw new HttpError(400, 'يرجى اختيار المحافظة');

      const center = str(body.center, 300);
      if (center.length > 100) throw new HttpError(400, 'اسم المركز طويل جداً');
      const address = str(body.address, 1000);
      if (!address || address.length < 5 || address.length > 300) throw new HttpError(400, 'يرجى إدخال العنوان بالتفصيل');
      const notes = str(body.notes, 1000);
      if (notes.length > 500) throw new HttpError(400, 'الملاحظات يجب ألا تتجاوز 500 حرف');

      if (!(await allow(deps, 'create-phone:' + phone, 6, 60 * 60 * 1000))) {
        throw new HttpError(429, 'تم تسجيل عدد كبير من الطلبات على هذا الرقم، يرجى التواصل معنا');
      }

      // Items: only productId / size / quantity / color name are trusted from the client
      const items = rawItems.map((it: any) => {
        const qty = Number(it?.quantity);
        const productId = str(it?.productId, 100);
        const size = str(it?.size, 10);
        if (!Number.isInteger(qty) || qty < 1 || qty > 50) {
          throw new HttpError(400, 'الكمية لكل منتج يجب أن تكون بين 1 و 50');
        }
        if (!productId || !/^[A-Za-z0-9_-]+$/.test(productId) || !VALID_SIZES.has(size)) {
          throw new HttpError(400, 'بيانات المنتج أو المقاس غير صالحة');
        }
        return { productId, size, quantity: qty, colorName: str(it?.colorName, 60) };
      });

      const shippingMap = await loadShippingMap(deps);
      const shippingCost = shippingMap.get(governorate);
      if (shippingCost === undefined) throw new HttpError(400, 'المحافظة المحددة غير مدعومة');

      // Coupon (looked up by code, re-validated inside the transaction)
      let couponId: string | null = null;
      const couponCode = str(body.couponCode, 60).toUpperCase();
      if (couponCode) {
        const snap = await deps.db.collection('coupons').get();
        const found = snap.docs.find((d: any) => String(d.data()?.code || '').trim().toUpperCase() === couponCode);
        if (!found || found.data()?.active === false) throw new HttpError(400, 'كود الخصم غير صالح أو منتهي');
        couponId = found.id;
      }

      // Idempotency: the client sends the same id when it retries a request
      const clientId = str(body.id, 80);
      const orderId = /^ord-[A-Za-z0-9-]{8,70}$/.test(clientId)
        ? clientId
        : 'ord-' + deps.now().getTime() + '-' + crypto.randomBytes(4).toString('hex');

      await ensureCounter(deps);

      const perProduct = new Map<string, Record<string, number>>();
      for (const it of items) {
        const m = perProduct.get(it.productId) || {};
        m[it.size] = (m[it.size] || 0) + it.quantity;
        perProduct.set(it.productId, m);
      }
      const productIds = Array.from(perProduct.keys());

      const counterRef = deps.db.collection('counters').doc('orders');
      const orderRef = deps.db.collection('orders').doc(orderId);
      const productRefs = productIds.map((id) => deps.db.collection('products').doc(id));
      const couponRef = couponId ? deps.db.collection('coupons').doc(couponId) : null;

      let createdOrder: any = null;
      let duplicate = false;

      for (let attempt = 1; attempt <= 4; attempt++) {
        try {
          await deps.db.runTransaction(async (t: any) => {
            const existing = await t.get(orderRef);
            if (existing.exists) {
              duplicate = true;
              createdOrder = existing.data();
              return;
            }
            duplicate = false;

            const counterSnap = await t.get(counterRef);
            const productSnaps = await Promise.all(productRefs.map((r: any) => t.get(r)));
            const couponSnap = couponRef ? await t.get(couponRef) : null;

            const products = new Map<string, any>();
            productSnaps.forEach((s: any, i: number) => {
              if (!s.exists) throw new HttpError(400, 'أحد المنتجات لم يعد متاحاً');
              products.set(productIds[i], s.data() || {});
            });

            // stock check
            for (const [pid, sizes] of perProduct) {
              const p = products.get(pid);
              if (p.comingSoon === true) throw new HttpError(409, `"${p.name}" لم يتوفر للطلب بعد (قريباً)`);
              const stock = p.sizesStock || {};
              for (const [sz, qty] of Object.entries(sizes)) {
                if (!(sz in stock)) throw new HttpError(400, `المقاس ${sz} غير متوفر للمنتج "${p.name}"`);
                if (qty > (Number(stock[sz]) || 0)) {
                  throw new HttpError(409, `الكمية المطلوبة من "${p.name}" مقاس ${sz} غير متوفرة حالياً`);
                }
              }
            }

            let subtotal = 0;
            const orderItems = items.map((it) => {
              const p = products.get(it.productId);
              const price = Number(p.price) || 0;
              subtotal += price * it.quantity;
              const imgs: any[] = Array.isArray(p.images) ? p.images : p.image ? [p.image] : [];
              const image = imgs.find((x) => typeof x === 'string' && x.startsWith('http')) || '';
              const color = Array.isArray(p.colors) ? p.colors.find((c: any) => c?.name === it.colorName) : null;
              return {
                productId: it.productId,
                productName: String(p.name || 'هودي'),
                subtitle: String(p.subtitle || ''),
                image,
                size: it.size,
                colorName: color ? String(color.name) : '',
                colorHex: color ? String(color.hex || '#171717') : '#171717',
                price,
                quantity: it.quantity
              };
            });

            let discount = 0;
            if (couponRef) {
              const c = couponSnap?.exists ? couponSnap.data() || {} : null;
              if (!c || c.active === false) throw new HttpError(400, 'كود الخصم غير صالح أو منتهي');
              const minOrder = Number(c.minOrderAmount) || 0;
              if (subtotal < minOrder) throw new HttpError(400, `الحد الأدنى لهذا الكوبون ${minOrder} ج.م`);
              let eligible = subtotal;
              if (c.targetProductId) {
                eligible = orderItems
                  .filter((o) => o.productId === c.targetProductId)
                  .reduce((s, o) => s + o.price * o.quantity, 0);
                if (eligible <= 0) throw new HttpError(400, 'هذا الكوبون خاص بمنتج غير موجود في طلبك');
              }
              discount = Math.round((eligible * (Number(c.discountPercent) || 0)) / 100);
            }

            const total = Math.max(0, subtotal - discount + shippingCost);
            const current = Number(counterSnap.data()?.currentNumber) || 0;
            const next = current + 1;
            const now = deps.now();

            createdOrder = {
              id: orderId,
              orderNumber: String(next),
              customerName,
              phone,
              alternatePhone,
              governorate,
              center,
              address,
              notes,
              items: orderItems,
              subtotal,
              shippingCost,
              discount,
              couponCode: couponRef ? couponCode : '',
              total,
              status: 'pending',
              createdAt: cairoDateTimeString(now),
              createdAtMs: now.getTime()
            };

            t.set(counterRef, { currentNumber: next, updatedAt: now.toISOString() }, { merge: true });
            t.set(orderRef, createdOrder);
            for (const [pid, sizes] of perProduct) {
              const stock = { ...(products.get(pid).sizesStock || {}) };
              for (const [sz, qty] of Object.entries(sizes)) {
                stock[sz] = Math.max(0, (Number(stock[sz]) || 0) - qty);
              }
              t.update(deps.db.collection('products').doc(pid), { sizesStock: stock });
            }
            if (couponRef && couponSnap?.exists) {
              t.update(couponRef, { timesUsed: (Number(couponSnap.data()?.timesUsed) || 0) + 1 });
            }
          });
          break;
        } catch (err: any) {
          if (err instanceof HttpError) throw err;
          const msg = String(err?.message || '');
          const contention = err?.code === 10 || msg.includes('contention') || msg.includes('ABORTED');
          if (contention && attempt < 4) {
            await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 150 + attempt * 100)));
            continue;
          }
          throw err;
        }
      }

      if (!createdOrder) throw new HttpError(500, 'تعذر حفظ الطلب');

      if (!duplicate) {
        await notifyNewOrder(deps, createdOrder);
      }
      res.status(201).json({ success: true, order: createdOrder });
    })
  );

  async function notifyNewOrder(deps: Deps, order: any) {
    const totalItems = order.items.reduce((s: number, it: any) => s + (it.quantity || 1), 0);
    const summary = order.items.map((it: any) => `${it.productName} (${it.size})`).join(', ');
    const logo = await getBrandLogo(deps);
    const alertId = 'alert-' + deps.now().getTime() + '-' + crypto.randomBytes(3).toString('hex');

    const jobs = [
      deps.db.collection('admin_alerts').doc(alertId).set({
        id: alertId,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        total: order.total,
        governorate: order.governorate,
        itemsCount: totalItems,
        itemsSummary: summary,
        createdAt: deps.now().toISOString()
      }),
      pushToAdmins(deps, {
        title: 'أوردر جديد',
        body: `اسم العميل: ${order.customerName}\nسعر الأوردر: ${order.total} ج.م`,
        icon: logo,
        badge: logo,
        logoUrl: logo,
        url: '/?view=admin',
        orderNumber: order.orderNumber,
        tag: `order-${order.orderNumber}`,
        timestamp: Date.now()
      }),
      sendExternalAlerts(
        deps,
        'أوردر جديد',
        `🛍️ أوردر جديد - Beyond\nرقم الأوردر: #${order.orderNumber}\nاسم العميل: ${order.customerName}\nالمحافظة: ${order.governorate}\nسعر الأوردر: ${order.total} ج.م`,
        `اسم العميل: ${order.customerName}\nسعر الأوردر: ${order.total} ج.م`
      )
    ];
    // Serverless: everything must finish before the response is sent
    await withTimeout(Promise.allSettled(jobs), 6000);
  }

  app.post(
    '/api/coupons/validate',
    wrap(async (req, res, deps) => {
      if (!(await allow(deps, 'coupon-ip:' + getIp(req), 30, 10 * 60 * 1000))) {
        throw new HttpError(429, 'محاولات كثيرة، يرجى الانتظار قليلاً');
      }
      const code = str(req.body?.code, 60).toUpperCase();
      if (!code) throw new HttpError(400, 'اكتب كود الخصم');
      const snap = await deps.db.collection('coupons').get();
      const found = snap.docs.find((d: any) => String(d.data()?.code || '').trim().toUpperCase() === code);
      const c = found?.data();
      if (!found || !c || c.active === false) throw new HttpError(404, 'كود الخصم غير صحيح أو غير مفعل');
      res.json({
        success: true,
        coupon: {
          id: found.id,
          code: String(c.code).trim().toUpperCase(),
          discountPercent: Number(c.discountPercent) || 0,
          minOrderAmount: Number(c.minOrderAmount) || 0,
          targetProductId: c.targetProductId ? String(c.targetProductId) : undefined,
          targetProductName: c.targetProductName ? String(c.targetProductName) : undefined
        }
      });
    })
  );

  const PRIVATE_FIELDS = ['customerName', 'alternatePhone', 'address', 'notes'];

  function publicOrderView(o: any) {
    const copy = { ...o };
    for (const f of PRIVATE_FIELDS) delete copy[f];
    return copy;
  }

  app.post(
    '/api/orders/track',
    wrap(async (req, res, deps) => {
      if (!(await allow(deps, 'track-ip:' + getIp(req), 30, 10 * 60 * 1000))) {
        throw new HttpError(429, 'محاولات كثيرة، يرجى الانتظار قليلاً');
      }
      const q = String(req.body?.query || '').trim().replace(/^#/, '').replace(/\s+/g, '');
      if (!q) return res.json({ success: true, orders: [] });

      if (PHONE_REGEX.test(q)) {
        const snap = await deps.db.collection('orders').where('phone', '==', q).limit(30).get();
        const orders = snap.docs.map((d: any) => publicOrderView(d.data()));
        orders.sort(
          (a: any, b: any) =>
            (Number(b.createdAtMs) || 0) - (Number(a.createdAtMs) || 0) ||
            String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
        );
        return res.json({ success: true, orders: orders.slice(0, 10) });
      }

      if (!/^\d{1,9}$/.test(q)) return res.json({ success: true, orders: [] });
      const snap = await deps.db.collection('orders').where('orderNumber', '==', q).limit(1).get();
      if (snap.empty) return res.json({ success: true, orders: [] });
      const order = publicOrderView(snap.docs[0].data());
      delete order.phone;
      res.json({ success: true, orders: [order] });
    })
  );

  /** Put stock back (delta = +1) or take it again (delta = -1) for an order. */
  async function applyStockDelta(t: any, deps: Deps, items: any[], sign: 1 | -1) {
    const perProduct = new Map<string, Record<string, number>>();
    for (const it of items) {
      const m = perProduct.get(it.productId) || {};
      m[it.size] = (m[it.size] || 0) + (Number(it.quantity) || 0);
      perProduct.set(it.productId, m);
    }
    const ids = Array.from(perProduct.keys());
    const snaps = await Promise.all(ids.map((id) => t.get(deps.db.collection('products').doc(id))));
    const updates: Array<[string, any]> = [];
    snaps.forEach((s: any, i: number) => {
      if (!s.exists) return;
      const stock = { ...(s.data()?.sizesStock || {}) };
      for (const [sz, qty] of Object.entries(perProduct.get(ids[i])!)) {
        const cur = Number(stock[sz]) || 0;
        if (sign === -1 && qty > cur) {
          throw new HttpError(409, `لا يوجد مخزون كافٍ من ${s.data()?.name || 'المنتج'} مقاس ${sz} لإعادة تفعيل الطلب`);
        }
        stock[sz] = Math.max(0, cur + sign * qty);
      }
      updates.push([ids[i], stock]);
    });
    return updates;
  }

  app.post(
    '/api/orders/cancel',
    wrap(async (req, res, deps) => {
      if (!(await allow(deps, 'cancel-ip:' + getIp(req), 15, 10 * 60 * 1000))) {
        throw new HttpError(429, 'محاولات كثيرة، يرجى الانتظار قليلاً');
      }
      const orderId = str(req.body?.orderId, 100);
      const phone = String(req.body?.phone || '').replace(/\s+/g, '');
      if (!orderId || !/^[A-Za-z0-9_-]+$/.test(orderId)) throw new HttpError(400, 'الطلب غير محدد');

      const ref = deps.db.collection('orders').doc(orderId);
      await deps.db.runTransaction(async (t: any) => {
        const snap = await t.get(ref);
        if (!snap.exists) throw new HttpError(404, 'الطلب غير موجود');
        const order = snap.data() || {};
        if (String(order.phone || '').replace(/\s+/g, '') !== phone) {
          throw new HttpError(403, 'رقم الهاتف غير مطابق لبيانات الطلب');
        }
        if (order.status !== 'pending') throw new HttpError(400, 'لا يمكن إلغاء هذا الطلب بعد بدء تجهيزه');
        const updates = await applyStockDelta(t, deps, order.items || [], 1);
        t.update(ref, { status: 'cancelled', cancelledAt: deps.now().toISOString() });
        for (const [pid, stock] of updates) t.update(deps.db.collection('products').doc(pid), { sizesStock: stock });
      });
      res.json({ success: true });
    })
  );

  const STATUSES = new Set(['pending', 'processing', 'shipped', 'delivered', 'cancelled']);

  app.post(
    '/api/orders/status',
    requireAdmin(async (req, res, deps) => {
      const orderId = str(req.body?.orderId, 100);
      const status = String(req.body?.status || '');
      if (!orderId || !/^[A-Za-z0-9_-]+$/.test(orderId) || !STATUSES.has(status)) {
        throw new HttpError(400, 'بيانات غير صالحة');
      }
      const ref = deps.db.collection('orders').doc(orderId);
      await deps.db.runTransaction(async (t: any) => {
        const snap = await t.get(ref);
        if (!snap.exists) throw new HttpError(404, 'الطلب غير موجود');
        const order = snap.data() || {};
        const wasCancelled = order.status === 'cancelled';
        const willCancel = status === 'cancelled';
        let updates: Array<[string, any]> = [];
        if (!wasCancelled && willCancel) updates = await applyStockDelta(t, deps, order.items || [], 1);
        if (wasCancelled && !willCancel) updates = await applyStockDelta(t, deps, order.items || [], -1);
        t.update(ref, { status });
        for (const [pid, stock] of updates) t.update(deps.db.collection('products').doc(pid), { sizesStock: stock });
      });
      res.json({ success: true });
    })
  );

  /* ------------------------------ analytics ---------------------------- */

  app.post(
    '/api/analytics/track',
    wrap(async (req, res, deps) => {
      const type = String(req.body?.type || '');
      if (!['visit', 'cart_add', 'checkout_start'].includes(type)) throw new HttpError(400, 'invalid');
      const now = deps.now();
      const date = cairoDateString(now);
      const hour = cairoHour(now);
      const inc = deps.increment;
      const shard = Math.floor(Math.random() * 10);
      const ref = deps.db.collection('analytics_shards').doc(`${date}_${shard}`);

      let patch: Record<string, any> = { date };
      if (type === 'visit') {
        const dev = req.body?.isMobile ? 'mobile' : 'desktop';
        patch = {
          ...patch,
          visits: inc(1),
          uniqueVisitors: inc(1),
          hourlyVisits: { [hour]: inc(1) },
          deviceTypes: { [dev]: inc(1) }
        };
      } else if (type === 'cart_add') {
        const productId = str(req.body?.productId, 60);
        patch = { ...patch, cartAdditions: inc(1), hourlyCartAdds: { [hour]: inc(1) } };
        if (/^[A-Za-z0-9_-]+$/.test(productId)) {
          patch.topProducts = { [productId]: { name: str(req.body?.productName, 100), count: inc(1) } };
        }
      } else {
        patch = { ...patch, checkoutStarts: inc(1) };
      }
      await ref.set(patch, { merge: true });
      res.json({ success: true });
    })
  );

  function addInto(target: any, src: any) {
    for (const [k, v] of Object.entries(src || {})) {
      if (typeof v === 'number') target[k] = (Number(target[k]) || 0) + v;
      else if (v && typeof v === 'object') {
        if (!target[k] || typeof target[k] !== 'object') target[k] = {};
        addInto(target[k], v);
      } else if (typeof v === 'string' && k !== 'date') {
        target[k] = v;
      }
    }
  }

  app.get(
    '/api/analytics/daily',
    requireAdmin(async (req, res, deps) => {
      const days = Math.min(31, Math.max(1, parseInt(String(req.query.days || '1'), 10) || 1));
      const start = cairoDateString(new Date(deps.now().getTime() - (days - 1) * 86400000));
      const merged = new Map<string, any>();
      for (const col of ['analytics_daily', 'analytics_shards']) {
        const snap = await deps.db.collection(col).where('date', '>=', start).get();
        snap.forEach((d: any) => {
          const data = d.data() || {};
          if (!data.date) return;
          const cur = merged.get(data.date) || { date: data.date };
          addInto(cur, data);
          cur.date = data.date;
          merged.set(data.date, cur);
        });
      }
      res.json({ success: true, days: Array.from(merged.values()) });
    })
  );

  /* --------------------------- admin accounts -------------------------- */

  const isAdminRecord = (u: any) =>
    u?.customClaims?.admin === true || ADMIN_EMAILS.has(String(u?.email || '').toLowerCase());

  app.get(
    '/api/admin/me',
    requireAdmin(async (req, res) => {
      const u = (req as any).adminUser || {};
      res.json({ success: true, email: u.email || '', isOwner: String(u.email || '').toLowerCase() === OWNER_EMAIL });
    })
  );

  app.get(
    '/api/admin/users',
    requireAdmin(async (_req, res, deps) => {
      const result = await deps.auth.listUsers(200);
      const users = result.users.filter(isAdminRecord).map((u: any) => ({
        uid: u.uid,
        email: u.email,
        displayName: u.displayName || '',
        creationTime: u.metadata?.creationTime || '',
        isOwner: String(u.email || '').toLowerCase() === OWNER_EMAIL
      }));
      res.json({ success: true, users });
    })
  );

  app.post(
    '/api/admin/create-user',
    requireAdmin(async (req, res, deps) => {
      const email = String(req.body?.email || '').trim().toLowerCase();
      const password = String(req.body?.password || '').trim();
      const displayName = str(req.body?.displayName, 100) || 'مشرف';
      if (!email || !password) throw new HttpError(400, 'يرجى كتابة البريد الإلكتروني وكلمة المرور');
      if (password.length < 6) throw new HttpError(400, 'يجب ألا تقل كلمة المرور عن 6 خانات');
      try {
        const user = await deps.auth.createUser({ email, password, displayName });
        await deps.auth.setCustomUserClaims(user.uid, { admin: true });
        res.status(201).json({ success: true, user: { uid: user.uid, email: user.email, displayName: user.displayName } });
      } catch (err: any) {
        if (err instanceof HttpError) throw err;
        const msg =
          err?.code === 'auth/email-already-exists'
            ? 'هذا البريد مسجل بالفعل'
            : err?.code === 'auth/invalid-email'
            ? 'صيغة البريد الإلكتروني غير صحيحة'
            : 'تعذر إنشاء الحساب';
        throw new HttpError(400, msg);
      }
    })
  );

  app.post(
    '/api/admin/delete-user',
    requireAdmin(async (req, res, deps) => {
      const uid = str(req.body?.uid, 128);
      if (!uid) throw new HttpError(400, 'المستخدم غير محدد');
      const target = await deps.auth.getUser(uid);
      if (String(target.email || '').toLowerCase() === OWNER_EMAIL) {
        throw new HttpError(403, 'لا يمكن حذف حساب المالك');
      }
      await deps.auth.deleteUser(uid);
      res.json({ success: true });
    })
  );

  app.use('/api', (_req, res) => {
    res.status(404).json({ success: false, error: 'not found' });
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = Number(err?.status) || 400;
    res.status(status).json({ success: false, error: 'طلب غير صالح' });
  });

  return app;
}

const app = createApp(getRealDeps);
export default app;
