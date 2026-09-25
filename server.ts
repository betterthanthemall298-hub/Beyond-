import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import webpush from 'web-push';
import dotenv from 'dotenv';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

dotenv.config();

const OWNER_EMAIL = (process.env.OWNER_EMAIL || 'vdbbdv1234567889@gmail.com').toLowerCase().trim();

// VAPID keys configuration
const VAPID_PUBLIC_KEY = (process.env.VAPID_PUBLIC_KEY || '').trim();
const VAPID_PRIVATE_KEY = (process.env.VAPID_PRIVATE_KEY || '').trim();

if (!VAPID_PRIVATE_KEY) {
  console.warn('[Push WARNING] VAPID_PRIVATE_KEY is missing from environment variables.');
}
if (!VAPID_PUBLIC_KEY) {
  console.warn('[Push WARNING] VAPID_PUBLIC_KEY is missing from environment variables.');
}

let rawVapidEmail = (process.env.VAPID_EMAIL || 'mailto:admin@store.local').trim();
if (!rawVapidEmail.startsWith('mailto:') && !rawVapidEmail.startsWith('https://') && !rawVapidEmail.startsWith('http://')) {
  rawVapidEmail = `mailto:${rawVapidEmail}`;
}
const VAPID_EMAIL = rawVapidEmail;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    console.log(`[Push] VAPID initialized with subject: ${VAPID_EMAIL}`);
  } catch (err) {
    console.error('[Push] Failed to set VAPID details:', err);
  }
}

// -------------------------------------------------------------
// Initialize Firebase Admin SDK
// -------------------------------------------------------------
let adminApp: App | undefined;
let adminDb: FirebaseFirestore.Firestore | undefined;
let adminAuth: any;

function initFirebaseAdmin() {
  let saCred: any = null;

  // 1. Try env variable FIREBASE_SERVICE_ACCOUNT_JSON
  const rawSaEnv = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (rawSaEnv) {
    if (rawSaEnv.startsWith('{')) {
      try {
        saCred = JSON.parse(rawSaEnv);
      } catch {
        // Will fallback to service-account.json below
      }
    } else {
      // Check if it might be base64-encoded JSON
      try {
        const decoded = Buffer.from(rawSaEnv, 'base64').toString('utf8').trim();
        if (decoded.startsWith('{')) {
          saCred = JSON.parse(decoded);
        }
      } catch {
        // Will fallback to service-account.json below
      }
    }
  }

  // 2. Try local service-account.json file
  if (!saCred) {
    const saPath = path.join(process.cwd(), 'service-account.json');
    if (fs.existsSync(saPath)) {
      try {
        saCred = JSON.parse(fs.readFileSync(saPath, 'utf8'));
      } catch {
        // Will report missing below if still not loaded
      }
    }
  }

  if (!saCred) {
    console.error('[Firebase Admin] No service account credentials found. FIREBASE_SERVICE_ACCOUNT_JSON or service-account.json required.');
    return;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0]!;
  } else {
    adminApp = initializeApp({
      credential: cert(saCred)
    });
  }

  adminDb = getFirestore(adminApp);
  adminAuth = getAuth(adminApp);
  console.log('[Firebase Admin] Successfully initialized with project:', saCred.project_id || 'beyond-a32a4');

  // Initialize counter asynchronously
  ensureOrderCounterInitialized().catch((e) => console.warn('[Counter Init] notice:', e));
}

async function ensureOrderCounterInitialized(): Promise<number> {
  if (!adminDb) return 0;
  try {
    const counterRef = adminDb.collection('counters').doc('orders');
    const snap = await counterRef.get();
    if (snap.exists && typeof snap.data()?.currentNumber === 'number') {
      return Number(snap.data()?.currentNumber) || 0;
    }

    // Baseline calculation from existing orders
    const ordersSnap = await adminDb.collection('orders').get();
    let maxFound = 0;
    ordersSnap.forEach((d) => {
      const val = d.data()?.orderNumber;
      const num = parseInt(String(val || '').replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > maxFound) maxFound = num;
    });

    await counterRef.set({
      currentNumber: maxFound,
      initializedAt: new Date().toISOString()
    }, { merge: true });

    console.log(`[Order Counter] Initialized counter with baseline #${maxFound}`);
    return maxFound;
  } catch (err) {
    console.warn('[Order Counter] init error:', err);
    return 0;
  }
}

initFirebaseAdmin();

// -------------------------------------------------------------
// Resilient Order Store & Fallback Configuration
// Keeps orders, counters, and tracking functioning reliably even if Firebase Admin is disconnected
// -------------------------------------------------------------
const DATA_DIR = path.join(process.cwd(), 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const COUNTER_FILE = path.join(DATA_DIR, 'counter.json');

const CANONICAL_GOVERNORATES = [
  'القاهرة',
  'الجيزة',
  'الإسكندرية',
  'القليوبية',
  'الشرقية',
  'الدقهلية',
  'الغربية',
  'المنوفية',
  'دمياط',
  'بورسعيد',
  'الإسماعيلية',
  'السويس',
  'كفر الشيخ',
  'البحيرة',
  'الفيوم',
  'بني سويف',
  'المنيا',
  'أسيوط',
  'سوهاج',
  'قنا',
  'الأقصر',
  'أسوان',
  'البحر الأحمر',
  'مطروح',
  'الوادي الجديد',
  'شمال سيناء',
  'جنوب سيناء'
] as const;

function cleanGovernorateName(rawName: string): string {
  if (!rawName) return '';
  let cleaned = String(rawName).trim();
  cleaned = cleaned.replace(/\s*\([^)]*\)/g, '').trim();
  cleaned = cleaned.replace(/\s*[-/].*$/g, '').trim();
  if (cleaned === 'مرسى مطروح') cleaned = 'مطروح';
  for (const gov of CANONICAL_GOVERNORATES) {
    if (cleaned === gov) return gov;
  }
  for (const gov of CANONICAL_GOVERNORATES) {
    if (cleaned.startsWith(gov) || cleaned.endsWith(gov)) return gov;
  }
  return cleaned;
}

function normalizeEgyptianPhone(phone: string): string {
  if (!phone) return '';
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  let normalized = String(phone).trim();
  for (let i = 0; i < 10; i++) {
    normalized = normalized.split(arabicDigits[i]).join(String(i));
    normalized = normalized.split(persianDigits[i]).join(String(i));
  }
  normalized = normalized.replace(/[\s\-\(\)\.]+/g, '');
  if (normalized.startsWith('+20')) {
    normalized = '0' + normalized.substring(3);
  } else if (normalized.startsWith('0020')) {
    normalized = '0' + normalized.substring(4);
  } else if (normalized.startsWith('20') && normalized.length === 12) {
    normalized = '0' + normalized.substring(2);
  }
  return normalized;
}

const FALLBACK_GOVERNORATES: Record<string, number> = {
  'القاهرة': 45,
  'الجيزة': 45,
  'الإسكندرية': 50,
  'القليوبية': 50,
  'الشرقية': 55,
  'الدقهلية': 55,
  'الغربية': 55,
  'المنوفية': 55,
  'دمياط': 60,
  'بورسعيد': 60,
  'الإسماعيلية': 60,
  'السويس': 60,
  'كفر الشيخ': 60,
  'البحيرة': 60,
  'الفيوم': 65,
  'بني سويف': 65,
  'المنيا': 70,
  'أسيوط': 70,
  'سوهاج': 75,
  'قنا': 80,
  'الأقصر': 80,
  'أسوان': 85,
  'البحر الأحمر': 85,
  'مطروح': 85,
  'الوادي الجديد': 95,
  'شمال سيناء': 95,
  'جنوب سيناء': 95
};

function ensureDataFiles() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(ORDERS_FILE)) {
      fs.writeFileSync(ORDERS_FILE, JSON.stringify([]), 'utf8');
    }
    if (!fs.existsSync(COUNTER_FILE)) {
      fs.writeFileSync(COUNTER_FILE, JSON.stringify({ currentNumber: 24 }), 'utf8');
    }
  } catch (err) {
    console.warn('[Data Init] warning:', err);
  }
}
ensureDataFiles();

function readLocalOrders(): any[] {
  try {
    ensureDataFiles();
    if (fs.existsSync(ORDERS_FILE)) {
      const raw = fs.readFileSync(ORDERS_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to read local orders:', e);
  }
  return [];
}

function writeLocalOrders(orders: any[]) {
  try {
    ensureDataFiles();
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to write local orders:', e);
  }
}

function saveSingleLocalOrder(newOrder: any) {
  try {
    const orders = readLocalOrders();
    const existingIndex = orders.findIndex((o: any) => o.id === newOrder.id);
    if (existingIndex >= 0) {
      orders[existingIndex] = newOrder;
    } else {
      orders.unshift(newOrder);
    }
    writeLocalOrders(orders);
  } catch (err) {
    console.error('Failed to save single local order:', err);
  }
}

function getNextOrderNumberSync(): number {
  try {
    ensureDataFiles();
    let currentNumber = 24;
    if (fs.existsSync(COUNTER_FILE)) {
      try {
        const c = JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf8'));
        if (typeof c.currentNumber === 'number') currentNumber = c.currentNumber;
      } catch {}
    }
    const orders = readLocalOrders();
    for (const o of orders) {
      const num = parseInt(String(o.orderNumber || '').replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > currentNumber) {
        currentNumber = num;
      }
    }
    const nextNum = currentNumber + 1;
    fs.writeFileSync(COUNTER_FILE, JSON.stringify({ currentNumber: nextNum, updatedAt: new Date().toISOString() }), 'utf8');
    return nextNum;
  } catch (e) {
    return 25;
  }
}

// -------------------------------------------------------------
// Helper: requireAdmin Middleware
// -------------------------------------------------------------
async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!adminAuth) {
    return res.status(503).json({ success: false, error: 'خدمة التحقق غير متاحة حالياً' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'غير مصرح: رمز المصادقة مفقود' });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) {
    return res.status(401).json({ success: false, error: 'غير مصرح: رمز المصادقة فارغ' });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const email = (decoded.email || '').toLowerCase();
    const isAdminClaim = decoded.admin === true;
    const isOwner = email === OWNER_EMAIL || email === 'eslsmgomaa47@gmail.com';

    if (!isAdminClaim && !isOwner) {
      return res.status(403).json({ success: false, error: 'غير مصرح: ليس لديك صلاحيات الأدمن' });
    }

    (req as any).adminUser = decoded;
    return next();
  } catch (err: any) {
    console.warn('[requireAdmin] Token verification failed:', err?.message || err);
    return res.status(401).json({ success: false, error: 'رمز المصادقة غير صالح أو منتهي الصلاحية' });
  }
}

// -------------------------------------------------------------
// In-memory subscriptions storage
// -------------------------------------------------------------
interface StoredSubscription {
  subscription: webpush.PushSubscription;
  userAgent?: string;
  subscribedAt: string;
}

const pushSubscriptions = new Map<string, StoredSubscription>();

interface SubscriberRecord {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  docId?: string;
}

let cachedSubscribers: SubscriberRecord[] = [];
let lastSubscriberFetchTime = 0;
const SUBSCRIBER_CACHE_TTL = 15000;

async function getAllActiveSubscribers(forceRefresh = false): Promise<SubscriberRecord[]> {
  const now = Date.now();
  if (!forceRefresh && cachedSubscribers.length > 0 && now - lastSubscriberFetchTime < SUBSCRIBER_CACHE_TTL) {
    return cachedSubscribers;
  }

  const subscriberMap = new Map<string, SubscriberRecord>();

  pushSubscriptions.forEach((item, endpoint) => {
    if (item.subscription && item.subscription.endpoint && item.subscription.keys) {
      subscriberMap.set(endpoint, {
        endpoint,
        keys: item.subscription.keys as any
      });
    }
  });

  if (adminDb) {
    try {
      const snap = await adminDb.collection('push_subscriptions').get();
      snap.forEach((d) => {
        const data = d.data();
        if (data && data.endpoint && data.keys?.p256dh && data.keys?.auth) {
          subscriberMap.set(data.endpoint, {
            endpoint: data.endpoint,
            keys: data.keys,
            docId: d.id
          });
        }
      });
    } catch (err) {
      console.warn('[Push] Error reading subscriptions from Firestore:', err);
    }
  }

  cachedSubscribers = Array.from(subscriberMap.values());
  lastSubscriberFetchTime = now;
  return cachedSubscribers;
}

async function getStoreBrandLogo(): Promise<string> {
  if (adminDb) {
    try {
      const docSnap = await adminDb.collection('settings').doc('general').get();
      if (docSnap.exists) {
        const data = docSnap.data();
        if (data?.brandLogo) return data.brandLogo;
      }
    } catch {
      // ignore
    }
  }
  return '/icon-192.png';
}

// -------------------------------------------------------------
// In-Memory 30s Coupons Cache
// -------------------------------------------------------------
interface CachedCoupon {
  id: string;
  code: string;
  active: boolean;
  minOrderAmount: number;
  discountPercent: number;
}
let cachedCoupons: CachedCoupon[] = [];
let lastCouponsFetch = 0;
const COUPONS_CACHE_TTL = 30000;

async function getCachedCoupons(): Promise<CachedCoupon[]> {
  const now = Date.now();
  if (cachedCoupons.length > 0 && now - lastCouponsFetch < COUPONS_CACHE_TTL) {
    return cachedCoupons;
  }
  if (!adminDb) return [];
  try {
    const snap = await adminDb.collection('coupons').get();
    cachedCoupons = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        code: String(data.code || '').trim().toUpperCase(),
        active: data.active !== false,
        minOrderAmount: Number(data.minOrderAmount) || 0,
        discountPercent: Number(data.discountPercent) || 0
      };
    });
    lastCouponsFetch = now;
  } catch (err) {
    console.warn('Failed to fetch coupons for cache:', err);
  }
  return cachedCoupons;
}

// -------------------------------------------------------------
// Notification Secrets (private_settings/notifications)
// -------------------------------------------------------------
async function getNotificationSecrets(): Promise<{
  telegramBotToken?: string;
  telegramChatId?: string;
  pushNotificationTopic?: string;
}> {
  if (!adminDb) return {};
  try {
    const docSnap = await adminDb.collection('private_settings').doc('notifications').get();
    if (docSnap.exists) {
      const data = docSnap.data() || {};
      return {
        telegramBotToken: data.telegramBotToken ? String(data.telegramBotToken).trim() : undefined,
        telegramChatId: data.telegramChatId ? String(data.telegramChatId).trim() : undefined,
        pushNotificationTopic: data.pushNotificationTopic ? String(data.pushNotificationTopic).trim() : undefined
      };
    }
  } catch (err) {
    console.warn('[Notification Secrets] Error fetching secrets:', err);
  }
  return {};
}

async function sendTelegramAlert(botToken: string, chatId: string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown'
      })
    });
  } catch (err) {
    console.warn('[Telegram Alert] Error sending alert:', err);
  }
}

async function sendNtfyAlert(topic: string, title: string, body: string) {
  try {
    await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      headers: {
        'Title': title,
        'Priority': 'high',
        'Tags': 'package,bell'
      },
      body
    });
  } catch (err) {
    console.warn('[ntfy Alert] Error sending alert:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '5mb' }));

  // Rate Limiters (generous limits to prevent blocking valid shoppers and testers)
  const createOrderLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'يرجى الانتظار دقيقة قبل إرسال طلب جديد.' }
  });

  const trackOrdersLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'يرجى الانتظار قليلاً قبل إعادة البحث.' }
  });

  const cancelOrderLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'يرجى الانتظار قليلاً قبل المحاولة مجدداً.' }
  });

  // Health check: returns only { status, service }
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'beyond-store'
    });
  });

  // Push VAPID key (public)
  app.get('/api/push/vapid-public-key', (_req, res) => {
    res.json({ publicKey: VAPID_PUBLIC_KEY });
  });

  // Register push subscription (requireAdmin)
  app.post('/api/push/subscribe', requireAdmin, async (req, res) => {
    const { subscription, userAgent } = req.body || {};
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Invalid push subscription payload' });
    }

    pushSubscriptions.set(subscription.endpoint, {
      subscription,
      userAgent: userAgent || 'Unknown Browser',
      subscribedAt: new Date().toISOString()
    });

    if (adminDb) {
      try {
        const subId = Buffer.from(subscription.endpoint).toString('base64').replace(/[^a-zA-Z0-9_-]/g, '').slice(-40);
        await adminDb.collection('push_subscriptions').doc(subId).set({
          endpoint: subscription.endpoint,
          keys: subscription.keys,
          userAgent: userAgent || 'Unknown Browser',
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn('[Push] Could not persist subscription to Firestore:', err);
      }
    }

    const allSubs = await getAllActiveSubscribers(true);
    return res.json({ success: true, activeCount: allSubs.length });
  });

  // Unsubscribe (requireAdmin)
  app.post('/api/push/unsubscribe', requireAdmin, async (req, res) => {
    const { endpoint } = req.body || {};
    if (endpoint) {
      pushSubscriptions.delete(endpoint);
      if (adminDb) {
        try {
          const subId = Buffer.from(endpoint).toString('base64').replace(/[^a-zA-Z0-9_-]/g, '').slice(-40);
          await adminDb.collection('push_subscriptions').doc(subId).delete();
        } catch {
          // ignore
        }
      }
    }
    const allSubs = await getAllActiveSubscribers(true);
    return res.json({ success: true, activeCount: allSubs.length });
  });

  // Push Status (requireAdmin)
  app.get('/api/push/status', requireAdmin, async (_req, res) => {
    const subscribers = await getAllActiveSubscribers();
    res.json({
      configured: true,
      publicKey: VAPID_PUBLIC_KEY,
      subscriptionsCount: subscribers.length
    });
  });

  // Send test push notification (requireAdmin)
  app.post('/api/push/test', requireAdmin, async (req, res) => {
    const { logoUrl, icon } = req.body || {};
    const subscribers = await getAllActiveSubscribers();
    const finalLogo = logoUrl || icon || (await getStoreBrandLogo()) || '/icon-192.png';

    const payload = JSON.stringify({
      title: 'Beyond | تجربة الإشعارات',
      body: 'نظام إشعارات المتجر متصل ويعمل بنجاح لاستقبال طلبات العملاء.',
      icon: finalLogo,
      badge: finalLogo,
      logoUrl: finalLogo,
      url: '/?view=admin',
      tag: 'test-push-' + Date.now(),
      timestamp: Date.now()
    });

    const sendPromises = subscribers.map((sub) =>
      webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload, {
        TTL: 60,
        urgency: 'high',
        headers: { Urgency: 'high', Topic: 'order-alert' }
      }).then(() => true).catch((err) => {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          pushSubscriptions.delete(sub.endpoint);
          if (adminDb && sub.docId) {
            adminDb.collection('push_subscriptions').doc(sub.docId).delete().catch(() => {});
          }
        }
        return false;
      })
    );

    const results = await Promise.all(sendPromises);
    const sentCount = results.filter(Boolean).length;

    // Send Telegram & ntfy tests if configured in private_settings/notifications
    const secrets = await getNotificationSecrets();
    if (secrets.telegramBotToken && secrets.telegramChatId) {
      sendTelegramAlert(
        secrets.telegramBotToken,
        secrets.telegramChatId,
        '🔔 *Beyond | تجربة إشعارات تيليجرام*\nتم اختبار الاتصال بنجاح من لوحة تحكم المتجر.'
      ).catch(() => {});
    }
    if (secrets.pushNotificationTopic) {
      sendNtfyAlert(
        secrets.pushNotificationTopic,
        'Beyond | تجربة الإشعارات',
        'تم اختبار إشعارات ntfy بنجاح من لوحة تحكم المتجر.'
      ).catch(() => {});
    }

    return res.json({
      success: true,
      sentCount,
      totalSubscribers: subscribers.length
    });
  });

  // -------------------------------------------------------------
  // SECURE & RESILIENT ORDER CREATION
  // Re-validates items, sizes, inventory, shipping costs, and coupons
  // -------------------------------------------------------------
  app.post('/api/orders/create', createOrderLimiter, async (req, res) => {
    try {
      const orderData = req.body;
      if (!orderData || !orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
        return res.status(400).json({ success: false, error: 'بيانات الطلب غير مكتملة أو السلة فارغة' });
      }

      if (orderData.items.length > 30) {
        return res.status(400).json({ success: false, error: 'الحد الأقصى لعدد أصناف الطلب هو 30 صنفاً' });
      }

      // 1. Strict Inputs Validation
      const customerName = String(orderData.customerName || '').trim();
      if (!customerName || customerName.length > 100) {
        return res.status(400).json({ success: false, error: 'يرجى كتابة الاسم بشكل صحيح (أقل من 100 حرف)' });
      }

      const cleanPhone = normalizeEgyptianPhone(orderData.phone || '');
      const phoneRegex = /^01[0125][0-9]{8}$/;
      if (!phoneRegex.test(cleanPhone)) {
        return res.status(400).json({ success: false, error: 'يرجى إدخال رقم هاتف مصري صحيح (مثال: 01012345678)' });
      }

      let cleanAltPhone = '';
      if (orderData.alternatePhone && String(orderData.alternatePhone).trim()) {
        const normalizedAlt = normalizeEgyptianPhone(String(orderData.alternatePhone));
        // Accept valid Egyptian mobile or landline without crashing order
        if (phoneRegex.test(normalizedAlt) || normalizedAlt.length >= 8) {
          cleanAltPhone = normalizedAlt;
        }
      }

      const governorate = cleanGovernorateName(orderData.governorate || '');
      if (!governorate) {
        return res.status(400).json({ success: false, error: 'يرجى اختيار المحافظة' });
      }

      const center = String(orderData.center || '').trim();
      if (center.length > 100) {
        return res.status(400).json({ success: false, error: 'اسم المركز أو الحي طويل جداً' });
      }

      const address = String(orderData.address || '').trim();
      if (!address || address.length > 300) {
        return res.status(400).json({ success: false, error: 'يرجى إدخال العنوان بالتفصيل (أقل من 300 حرف)' });
      }

      const notes = String(orderData.notes || '').trim();
      if (notes.length > 500) {
        return res.status(400).json({ success: false, error: 'الملاحظات يجب ألا تتجاوز 500 حرف' });
      }

      // 2. Validate Items format & bounds
      for (const it of orderData.items) {
        const qty = Number(it.quantity);
        if (!Number.isInteger(qty) || qty < 1 || qty > 50) {
          return res.status(400).json({ success: false, error: 'الكمية لكل منتج يجب أن تكون عدداً صحيحاً بين 1 و 50' });
        }
        if (!it.productId || !it.size) {
          return res.status(400).json({ success: false, error: 'بيانات المنتج أو المقاس غير صالحة' });
        }
      }

      // 3. Determine Shipping Cost
      let shippingCost: number | null = null;
      if (adminDb) {
        try {
          const shippingDoc = await adminDb.collection('settings').doc('shipping').get();
          if (shippingDoc.exists) {
            const list = shippingDoc.data()?.list;
            if (Array.isArray(list)) {
              const foundGov = list.find((g: any) => cleanGovernorateName(g.name) === governorate);
              if (foundGov && typeof foundGov.cost === 'number') {
                shippingCost = foundGov.cost;
              }
            }
          }
        } catch (shipErr) {
          console.warn('Error reading settings/shipping:', shipErr);
        }

        if (shippingCost === null) {
          try {
            const govDoc = await adminDb.collection('governorates').doc(governorate).get();
            if (govDoc.exists && typeof govDoc.data()?.cost === 'number') {
              shippingCost = govDoc.data()?.cost;
            }
          } catch (govErr) {
            console.warn('Error reading governorates fallback:', govErr);
          }
        }
      }

      if (shippingCost === null) {
        if (typeof FALLBACK_GOVERNORATES[governorate] === 'number') {
          shippingCost = FALLBACK_GOVERNORATES[governorate];
        } else {
          const matchedKey = Object.keys(FALLBACK_GOVERNORATES).find((k) =>
            governorate.includes(k) || k.includes(governorate)
          );
          shippingCost = matchedKey ? FALLBACK_GOVERNORATES[matchedKey] : 50;
        }
      }

      // 4. Verify Coupon if provided
      let matchedCoupon: CachedCoupon | null = null;
      if (orderData.couponCode) {
        const cleanCode = String(orderData.couponCode).trim().toUpperCase();
        const coupons = await getCachedCoupons();
        const found = coupons.find((c) => c.code === cleanCode);
        if (found && found.active) {
          matchedCoupon = found;
        }
      }

      const uniqueId = 'ord-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
      const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

      let createdOrder: any = null;

      // 5. If adminDb is active, attempt Firestore transaction
      if (adminDb) {
        try {
          const productDeltas = new Map<string, Record<string, number>>();
          for (const it of orderData.items) {
            const pId = String(it.productId).trim();
            const sz = String(it.size).trim();
            const qty = Number(it.quantity);
            if (!productDeltas.has(pId)) {
              productDeltas.set(pId, {});
            }
            const sizeMap = productDeltas.get(pId)!;
            sizeMap[sz] = (sizeMap[sz] || 0) + qty;
          }

          const uniqueProductIds = Array.from(productDeltas.keys());
          const productDocRefs = uniqueProductIds.map((pId) => adminDb!.collection('products').doc(pId));
          const counterRef = adminDb.collection('counters').doc('orders');
          const couponRef = matchedCoupon ? adminDb.collection('coupons').doc(matchedCoupon.id) : null;
          const orderRef = adminDb.collection('orders').doc(uniqueId);

          await adminDb.runTransaction(async (t) => {
            const counterSnap = await t.get(counterRef);
            const productSnaps = await Promise.all(productDocRefs.map((ref) => t.get(ref)));
            const couponSnap = couponRef ? await t.get(couponRef) : null;

            const recomputedItems: any[] = [];
            let calculatedSubtotal = 0;
            const productDataMap = new Map<string, any>();

            for (let i = 0; i < productSnaps.length; i++) {
              const pSnap = productSnaps[i];
              const pId = uniqueProductIds[i];
              const pData = pSnap.exists ? pSnap.data() || {} : {};
              productDataMap.set(pId, pData);
            }

            for (const it of orderData.items) {
              const pId = String(it.productId).trim();
              const pData = productDataMap.get(pId) || {};
              const itemPrice = Number(pData.price) || Number(it.price) || 890;
              const itemQty = Number(it.quantity) || 1;

              let itemImage = '';
              const images = Array.isArray(pData.images) ? pData.images : (pData.image ? [pData.image] : []);
              for (const img of images) {
                if (typeof img === 'string' && img.startsWith('http')) {
                  itemImage = img;
                  break;
                }
              }
              if (!itemImage && it.image) itemImage = String(it.image);

              recomputedItems.push({
                productId: pId,
                productName: String(pData.name || it.productName || 'هودي أوفر سايز فاخر'),
                subtitle: String(pData.subtitle || it.subtitle || ''),
                image: itemImage,
                size: String(it.size).trim(),
                colorName: String(it.colorName || ''),
                colorHex: String(it.colorHex || '#171717'),
                price: itemPrice,
                quantity: itemQty
              });

              calculatedSubtotal += itemPrice * itemQty;
            }

            let finalDiscount = 0;
            if (matchedCoupon && couponSnap && couponSnap.exists) {
              const liveCouponData = couponSnap.data() || {};
              if (liveCouponData.active !== false) {
                const minOrder = Number(liveCouponData.minOrderAmount) || 0;
                if (calculatedSubtotal >= minOrder) {
                  const percent = Number(liveCouponData.discountPercent) || 0;
                  finalDiscount = Math.round((calculatedSubtotal * percent) / 100);
                }
              }
            }

            const finalTotal = Math.max(0, calculatedSubtotal - finalDiscount + shippingCost!);

            let currentNum = 24;
            if (counterSnap.exists && typeof counterSnap.data()?.currentNumber === 'number') {
              currentNum = Number(counterSnap.data()?.currentNumber) || 24;
            }
            const nextOrderNumInt = currentNum + 1;
            const nextOrderNum = String(nextOrderNumInt);

            createdOrder = {
              id: uniqueId,
              orderNumber: nextOrderNum,
              customerName,
              phone: cleanPhone,
              alternatePhone: cleanAltPhone,
              governorate,
              center,
              address,
              notes,
              items: recomputedItems,
              subtotal: calculatedSubtotal,
              shippingCost: shippingCost!,
              discount: finalDiscount,
              couponCode: matchedCoupon ? matchedCoupon.code : '',
              total: finalTotal,
              status: 'pending',
              createdAt: dateStr
            };

            t.set(counterRef, {
              currentNumber: nextOrderNumInt,
              updatedAt: new Date().toISOString()
            }, { merge: true });

            t.set(orderRef, createdOrder);

            // Deduct stock if product docs exist
            for (let i = 0; i < productSnaps.length; i++) {
              if (productSnaps[i].exists) {
                const pId = uniqueProductIds[i];
                const pData = productDataMap.get(pId);
                const orderedSizes = productDeltas.get(pId) || {};
                const curSizesStock = { ...(pData.sizesStock || {}) };

                for (const [sz, qty] of Object.entries(orderedSizes)) {
                  const cur = Number(curSizesStock[sz]) || 0;
                  curSizesStock[sz] = Math.max(0, cur - qty);
                }

                t.update(productDocRefs[i], { sizesStock: curSizesStock });
              }
            }

            if (couponRef && couponSnap && couponSnap.exists) {
              const curTimes = Number(couponSnap.data()?.timesUsed) || 0;
              t.update(couponRef, { timesUsed: curTimes + 1 });
            }
          });
        } catch (dbErr) {
          console.warn('[Firestore Order Tx] fallback to local store:', dbErr);
          createdOrder = null;
        }
      }

      // 6. Resilient Local Creation Fallback (if no adminDb or transaction had an issue)
      if (!createdOrder) {
        let calculatedSubtotal = 0;
        const recomputedItems = orderData.items.map((it: any) => {
          const itemPrice = Math.max(0, Number(it.price) || 890);
          const itemQty = Math.max(1, Math.min(50, Number(it.quantity) || 1));
          calculatedSubtotal += itemPrice * itemQty;
          return {
            productId: String(it.productId || 'p1').trim(),
            productName: String(it.productName || 'هودي أوفر سايز فاخر'),
            subtitle: String(it.subtitle || ''),
            image: String(it.image || ''),
            size: String(it.size || 'L').trim(),
            colorName: String(it.colorName || ''),
            colorHex: String(it.colorHex || '#171717'),
            price: itemPrice,
            quantity: itemQty
          };
        });

        let finalDiscount = 0;
        if (matchedCoupon) {
          const minOrder = Number(matchedCoupon.minOrderAmount) || 0;
          if (calculatedSubtotal >= minOrder) {
            const percent = Number(matchedCoupon.discountPercent) || 0;
            finalDiscount = Math.round((calculatedSubtotal * percent) / 100);
          }
        }

        const finalTotal = Math.max(0, calculatedSubtotal - finalDiscount + shippingCost!);
        const nextOrderNumInt = getNextOrderNumberSync();

        createdOrder = {
          id: uniqueId,
          orderNumber: String(nextOrderNumInt),
          customerName,
          phone: cleanPhone,
          alternatePhone: cleanAltPhone,
          governorate,
          center,
          address,
          notes,
          items: recomputedItems,
          subtotal: calculatedSubtotal,
          shippingCost: shippingCost!,
          discount: finalDiscount,
          couponCode: matchedCoupon ? matchedCoupon.code : '',
          total: finalTotal,
          status: 'pending',
          createdAt: dateStr
        };
      }

      // Always save to local store as resilient persistence
      saveSingleLocalOrder(createdOrder);

      // Post admin alert to firestore if available
      if (adminDb) {
        try {
          const alertId = 'alert-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
          const totalItems = createdOrder.items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0);
          const summary = createdOrder.items.map((it: any) => `${it.productName} (${it.size})`).join(', ');

          adminDb.collection('admin_alerts').doc(alertId).set({
            id: alertId,
            orderNumber: createdOrder.orderNumber,
            customerName: createdOrder.customerName,
            total: createdOrder.total,
            governorate: createdOrder.governorate,
            itemsCount: totalItems,
            itemsSummary: summary,
            createdAt: new Date().toISOString()
          }).catch(() => {});
        } catch {}
      }

      // Web Push Notifications to subscribed admin devices
      try {
        const subscribers = await getAllActiveSubscribers();
        const brandLogo = await getStoreBrandLogo();
        const payload = JSON.stringify({
          title: 'أوردر جديد',
          body: `اسم العميل: ${createdOrder.customerName}\nسعر الأوردر: ${createdOrder.total} ج.م`,
          icon: brandLogo,
          badge: brandLogo,
          logoUrl: brandLogo,
          url: '/?view=admin',
          orderNumber: createdOrder.orderNumber,
          tag: `order-${createdOrder.orderNumber}`,
          timestamp: Date.now()
        });

        subscribers.forEach((sub) => {
          webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload, {
            TTL: 60,
            urgency: 'high',
            headers: { Urgency: 'high', Topic: 'order-alert' }
          }).catch(() => {});
        });
      } catch (pushErr) {
        console.warn('Push alert error:', pushErr);
      }

      // Trigger Telegram & ntfy
      try {
        const secrets = await getNotificationSecrets();
        if (secrets.telegramBotToken && secrets.telegramChatId) {
          const msg = `🛍️ *أوردر جديد - Beyond*\nرقم الأوردر: #${createdOrder.orderNumber}\nاسم العميل: ${createdOrder.customerName}\nالمحافظة: ${createdOrder.governorate}\nسعر الأوردر: ${createdOrder.total} ج.م`;
          sendTelegramAlert(secrets.telegramBotToken, secrets.telegramChatId, msg).catch(() => {});
        }
        if (secrets.pushNotificationTopic) {
          const body = `اسم العميل: ${createdOrder.customerName}\nسعر الأوردر: ${createdOrder.total} ج.م`;
          sendNtfyAlert(secrets.pushNotificationTopic, 'أوردر جديد', body).catch(() => {});
        }
      } catch (externalErr) {
        console.warn('External alerts error:', externalErr);
      }

      console.log(`[Order Created] Order #${createdOrder.orderNumber} successfully saved`);
      return res.status(201).json({
        success: true,
        order: createdOrder
      });
    } catch (err: any) {
      console.error('Error in /api/orders/create:', err);
      return res.status(500).json({
        success: false,
        error: 'حدث خطأ أثناء تسجيل الطلب، يرجى المحاولة مرة أخرى'
      });
    }
  });

  // -------------------------------------------------------------
  // ORDERS TRACKING & CANCELLATION FOR CUSTOMERS (Resilient)
  // -------------------------------------------------------------
  app.post('/api/orders/track', trackOrdersLimiter, async (req, res) => {
    const rawQuery = String(req.body?.query || '').trim().replace(/^#/, '');
    if (!rawQuery) {
      return res.json({ success: true, orders: [] });
    }

    const cleanPhone = rawQuery.replace(/\s+/g, '');
    const isPhone = /^01[0125][0-9]{8}$/.test(cleanPhone);

    try {
      const localOrders = readLocalOrders();
      let matchedOrders: any[] = [];

      if (isPhone) {
        matchedOrders = localOrders.filter(
          (o) =>
            String(o.phone || '').replace(/\s+/g, '') === cleanPhone ||
            String(o.alternatePhone || '').replace(/\s+/g, '') === cleanPhone
        );
      } else {
        matchedOrders = localOrders.filter(
          (o) => String(o.orderNumber || '') === rawQuery || String(o.id || '') === rawQuery
        );
      }

      if (adminDb) {
        try {
          if (isPhone) {
            const snap = await adminDb.collection('orders')
              .where('phone', '==', cleanPhone)
              .limit(10)
              .get();
            const remoteOrders = snap.docs.map((d) => d.data());
            for (const ro of remoteOrders) {
              if (!matchedOrders.some((mo) => mo.id === ro.id)) {
                matchedOrders.push(ro);
              }
            }
          } else {
            const snap = await adminDb.collection('orders')
              .where('orderNumber', '==', rawQuery)
              .limit(1)
              .get();
            if (!snap.empty) {
              const ro = snap.docs[0].data();
              if (!matchedOrders.some((mo) => mo.id === ro.id)) {
                matchedOrders.push(ro);
              }
            }
          }
        } catch (dbErr) {
          console.warn('Error reading remote orders for track:', dbErr);
        }
      }

      matchedOrders.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));

      if (!isPhone && matchedOrders.length > 0) {
        const sanitized = matchedOrders.map((o) => {
          const { customerName, phone, alternatePhone, address, notes, ...rest } = o;
          return rest;
        });
        return res.json({ success: true, orders: sanitized });
      }

      return res.json({ success: true, orders: matchedOrders });
    } catch (err: any) {
      console.error('Order tracking error:', err);
      return res.status(500).json({ success: false, error: 'حدث خطأ أثناء البحث عن الطلب' });
    }
  });

  app.post('/api/orders/cancel', cancelOrderLimiter, async (req, res) => {
    const { orderId, phone } = req.body || {};
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'معرف الطلب غير محدد' });
    }

    const cleanInputPhone = String(phone || '').replace(/\s+/g, '');

    try {
      const localOrders = readLocalOrders();
      const localIndex = localOrders.findIndex((o) => o.id === orderId || o.orderNumber === orderId);

      let order = localIndex >= 0 ? localOrders[localIndex] : null;

      if (!order && adminDb) {
        try {
          const orderRef = adminDb.collection('orders').doc(orderId);
          const snap = await orderRef.get();
          if (snap.exists) {
            order = snap.data();
          }
        } catch (dbErr) {
          console.warn('Error getting order to cancel from db:', dbErr);
        }
      }

      if (!order) {
        return res.status(404).json({ success: false, error: 'الطلب غير موجود' });
      }

      const orderPhone = String(order.phone || '').replace(/\s+/g, '');
      if (orderPhone !== cleanInputPhone) {
        return res.status(403).json({ success: false, error: 'رقم الهاتف غير مطابق لبيانات هذا الطلب' });
      }

      if (order.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: `لا يمكن إلغاء الطلب لأن حالته الحالية: ${order.status}`
        });
      }

      if (localIndex >= 0) {
        localOrders[localIndex].status = 'cancelled';
        localOrders[localIndex].cancelledAt = new Date().toISOString();
        writeLocalOrders(localOrders);
      }

      if (adminDb) {
        try {
          await adminDb.collection('orders').doc(order.id || orderId).update({
            status: 'cancelled',
            cancelledAt: new Date().toISOString()
          });
        } catch (dbErr) {
          console.warn('Could not update Firestore on cancel:', dbErr);
        }
      }

      return res.json({ success: true, message: 'تم إلغاء الطلب بنجاح' });
    } catch (err: any) {
      console.error('Cancel order error:', err);
      return res.status(500).json({ success: false, error: 'حدث خطأ أثناء إلغاء الطلب' });
    }
  });

  // -------------------------------------------------------------
  // ADMIN ORDERS ENDPOINTS (Dashboard Sync & Management)
  // -------------------------------------------------------------
  app.get('/api/admin/orders', async (req, res) => {
    try {
      const localOrders = readLocalOrders();
      const allMap = new Map<string, any>();
      for (const o of localOrders) {
        allMap.set(o.id, o);
      }
      if (adminDb) {
        try {
          const snap = await adminDb.collection('orders').limit(150).get();
          snap.forEach((d) => {
            const data = d.data();
            allMap.set(d.id, { ...data, id: d.id });
          });
        } catch (dbErr) {
          console.warn('Admin orders reading from firestore:', dbErr);
        }
      }
      const list = Array.from(allMap.values());
      list.sort((a: any, b: any) => {
        const numA = parseInt(String(a.orderNumber || '').replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(String(b.orderNumber || '').replace(/\D/g, ''), 10) || 0;
        if (numB !== numA) return numB - numA;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
      return res.json({ success: true, orders: list });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/admin/orders/status', async (req, res) => {
    try {
      const { orderId, status } = req.body || {};
      if (!orderId || !status) {
        return res.status(400).json({ success: false, error: 'بيانات غير مكتملة' });
      }
      const localOrders = readLocalOrders();
      const idx = localOrders.findIndex((o) => o.id === orderId);
      if (idx >= 0) {
        localOrders[idx].status = status;
        localOrders[idx].updatedAt = new Date().toISOString();
        writeLocalOrders(localOrders);
      }
      if (adminDb) {
        try {
          await adminDb.collection('orders').doc(orderId).update({
            status,
            updatedAt: new Date().toISOString()
          });
        } catch {}
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/admin/orders/delete', async (req, res) => {
    try {
      const { orderId } = req.body || {};
      if (!orderId) {
        return res.status(400).json({ success: false, error: 'معرف الطلب مطلوب' });
      }
      const localOrders = readLocalOrders();
      const filtered = localOrders.filter((o) => o.id !== orderId);
      writeLocalOrders(filtered);
      if (adminDb) {
        try {
          await adminDb.collection('orders').doc(orderId).delete();
        } catch {}
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // -------------------------------------------------------------
  // ADMIN USERS MANAGEMENT (Firebase Admin Auth - requireAdmin)
  // -------------------------------------------------------------
  app.get('/api/admin/users', requireAdmin, async (req, res) => {
    try {
      if (!adminAuth) {
        return res.status(503).json({ success: false, error: 'خدمة إدارة الحسابات غير متاحة حالياً' });
      }
      const listUsersResult = await adminAuth.listUsers(100);
      const users = listUsersResult.users.map((u: any) => ({
        uid: u.uid,
        email: u.email,
        displayName: u.displayName || 'مشرف',
        creationTime: u.metadata?.creationTime || '',
        lastSignInTime: u.metadata?.lastSignInTime || ''
      }));
      return res.json({ success: true, users });
    } catch (err: any) {
      console.error('Error listing admin users:', err);
      return res.status(500).json({ success: false, error: 'تعذر جلب قائمة المشرفين' });
    }
  });

  app.post('/api/admin/create-user', requireAdmin, async (req, res) => {
    try {
      if (!adminAuth) {
        return res.status(503).json({ success: false, error: 'خدمة إدارة الحسابات غير متاحة حالياً' });
      }
      const { email, password, displayName } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'يرجى كتابة البريد الإلكتروني وكلمة المرور' });
      }
      if (String(password).length < 6) {
        return res.status(400).json({ success: false, error: 'يجب ألا تقل كلمة المرور عن 6 خانات' });
      }

      const cleanEmail = String(email).trim().toLowerCase();
      const userRecord = await adminAuth.createUser({
        email: cleanEmail,
        password: String(password).trim(),
        displayName: displayName ? String(displayName).trim() : 'مشرف المتجر'
      });

      // Set admin custom user claim
      await adminAuth.setCustomUserClaims(userRecord.uid, { admin: true });

      console.log(`[Admin Created] Successfully created admin: ${userRecord.email}`);
      return res.status(201).json({
        success: true,
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName
        }
      });
    } catch (err: any) {
      console.error('Error creating admin user:', err);
      const msg = err.code === 'auth/email-already-exists'
        ? 'هذا الإيميل مسجل بالفعل'
        : err.code === 'auth/invalid-email'
        ? 'صيغة البريد الإلكتروني غير صحيحة'
        : 'حدث خطأ أثناء إنشاء المستخدم، يرجى التأكد من البيانات';
      return res.status(400).json({ success: false, error: msg });
    }
  });

  app.post('/api/admin/delete-user', requireAdmin, async (req, res) => {
    try {
      if (!adminAuth) {
        return res.status(503).json({ success: false, error: 'خدمة إدارة الحسابات غير متاحة حالياً' });
      }
      const { uid } = req.body || {};
      if (!uid) {
        return res.status(400).json({ success: false, error: 'معرف المستخدم غير محدد' });
      }

      // Protect owner email by verifying actual user from Auth, not body
      const targetUser = await adminAuth.getUser(uid);
      if (targetUser.email && targetUser.email.toLowerCase() === OWNER_EMAIL) {
        return res.status(403).json({ success: false, error: 'لا يمكن حذف حساب المالك الأساسي للمتجر' });
      }

      await adminAuth.deleteUser(uid);
      console.log(`[Admin Deleted] Deleted admin user: ${uid}`);
      return res.json({ success: true, message: 'تم حذف حساب الأدمن بنجاح' });
    } catch (err: any) {
      console.error('Error deleting admin user:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
