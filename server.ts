import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import webpush from 'web-push';
import dotenv from 'dotenv';
import fs from 'fs';
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

dotenv.config();

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
// Initialize Firebase Admin SDK with Service Account Key
// -------------------------------------------------------------
let adminApp: App;
let adminDb: FirebaseFirestore.Firestore;
let adminAuth: any;

function initFirebaseAdmin() {
  let saCred: any = null;

  // 1. Try env variable FIREBASE_SERVICE_ACCOUNT_JSON
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      saCred = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', e);
    }
  }

  // 2. Try local service-account.json file
  if (!saCred) {
    const saPath = path.join(process.cwd(), 'service-account.json');
    if (fs.existsSync(saPath)) {
      try {
        saCred = JSON.parse(fs.readFileSync(saPath, 'utf8'));
      } catch (e) {
        console.error('Failed to parse service-account.json file:', e);
      }
    }
  }

  // 3. Fallback to beyond-a32a4 credentials
  if (!saCred) {
    saCred = {
      type: 'service_account',
      project_id: 'beyond-a32a4',
      private_key_id: 'd968973cf813d44a0d823a1d97b7df6e5743cbf5',
      private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDiStswltI7g7+E\nWuaFmHcbdhEfPdwEv6icb6GVcmQ1m9HUBa7wj4Mmo5KaTNOq5CWkY4/G791o4Mst\nMPgzxDxemPAYQVUf1ohwcXFJpgVjFz+oNJrkBZs8J1llRDPA+OJl10OoPQqh+3iA\nm9T4SHo0qAz50vpoEoR449luxcfPQG74JIzvCeQWhIBCPkywLptaqhOMyeFIoyR0\nrTvCGB/f12ONRvy1gNfFxvhgvZARd+IF28wiUPMxGG60sfqkSYouetptPD/y6I/X\n3nVyHHmaOpbZVYcT0PhIPz6fpABk+14pFGf8SpXJU2aYcqrKl1P9nEfe+4vlsNJy\n8tW06V4zAgMBAAECggEAMrEkIuFWXQCpcWPPihPacqtjMIVx+RpaEhkrsEe8zQmH\n2qAfTUJI1eoEmE4niHutNwManSz0g18ABLKYlzgZcfN+rWBNSmGLlOzEvQPU5xq5\nJtwJ6pSa7sG90+KQWWUnijrLrC9oZ1rm5qCB99B8l7khlwE9GP008cPQ3HCvzuwr\nWT0bpgDW3ujKf/H2gAxITeezAvE4iNo/0rV19VWmHvuDkD/LFTmvb8oTCV9xBn5+\n2Zw5f9uf+GaaBvTC+tGhnkbn/ksnYgjPL1gLBl28qDkGNnyAUB2PFtg6IEvLRmYW\nGqrsin4Dp5BJPjcHkdtYM0DxnwYHo0FlPqy3Bj0+uQKBgQDySI8L8k20uBL1afCh\nyK0uTV1xCphV7j6hibGSShVa/Q2AC7SQmBSmTqTMCwD/TeLxGGRYjLPGo4JeeuI0\nYdIkJGAYZ2NqPR+phDN9Cz2/JnmqbssW70h/soYSK9vyU+XLNvQEb8Iq0CjOldd3\nWBtZmx9wXbzTWemXGLYhLUs2ZwKBgQDvGoml+GJ4pUxJ6Yp/0OkNCawbSXcclrrr\nfcjR7Wgte4M9Zo4Xj2XwZdOaUqjEWGJmt1JlF6kjn+cs2TYmskPYgDePWJFmJEPz\nzagaqM4uAt5nGPkeDbohJWuYPeal1uOW35/1P94wvUl6nocU83Qc3ZyCsH1B90wd\nRYWmyjCCVQKBgC5b6+MhTfUSc645wy1xtJFzhDmpCVUH7TwDmNKhEk0Ctp6Vnss8\nDld0HNxeDqbLRG1VeX3oDk4n4z4ozTewsADyZODGh6NAZtqMzT1T9VCqEAWohXux\n9XFZu4WmlsNbglDMBw0CRWjjw6sjyMKxPSp8IBvkE8ltHuEmfVMD06xpAoGAYFe6\nFQUjcGdyeOnAY8Yi0Z0PGyOb+goGITNawrO9YW4+MHRtVrLyKU5uV+VsmUjfxXGi\nopdJENCyjpCrUCZOTiNDv9+5HoYIV2mLjcps4X9IbBRU9LYlRIvWcc6nbDVNGRLc\nWi608cCjpePQnDGInMTy9nn0zqq9oaHMu6sGps0CgYBvgxt3LEbKUv0KIihKHvEN\nrfWOYgzx3McFZN86EMzfA+B+gBSsGVQvHvXIRpnHuUypDq4f9GyGVdm/kac5y45U\nTN8wHwoou/47UXYQRHvigtRm+cR+sI1qKLC9diGnuXVYA2hpxCnVrkvxTiW8m9MO\nViNEp0MBOpJ8XgNwA2Z/8A==\n-----END PRIVATE KEY-----\n',
      client_email: 'firebase-adminsdk-fbsvc@beyond-a32a4.iam.gserviceaccount.com'
    };
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
  if (!adminDb) return 1000;
  try {
    const counterRef = adminDb.collection('counters').doc('orders');
    const snap = await counterRef.get();
    if (snap.exists) {
      return Number(snap.data()?.currentNumber) || 1000;
    }

    // Baseline calculation from existing orders
    const ordersSnap = await adminDb.collection('orders').limit(150).get();
    let maxFound = 1000;
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
    return 1000;
  }
}

initFirebaseAdmin();

// In-memory subscriptions storage
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  // Health check
  app.get('/api/health', async (_req, res) => {
    const subscribers = await getAllActiveSubscribers();
    res.json({
      status: 'ok',
      service: 'beyond-store',
      subscriptionsCount: subscribers.length,
      firebaseAdmin: !!adminDb
    });
  });

  // Push VAPID key
  app.get('/api/push/vapid-public-key', (_req, res) => {
    res.json({ publicKey: VAPID_PUBLIC_KEY });
  });

  // Register push subscription
  app.post('/api/push/subscribe', async (req, res) => {
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

  // Unsubscribe
  app.post('/api/push/unsubscribe', async (req, res) => {
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

  // Status
  app.get('/api/push/status', async (_req, res) => {
    const subscribers = await getAllActiveSubscribers();
    res.json({
      configured: true,
      publicKey: VAPID_PUBLIC_KEY,
      subscriptionsCount: subscribers.length
    });
  });

  // -------------------------------------------------------------
  // SECURE SERVER-SIDE ORDER CREATION (Admin SDK)
  // Atomic numerical numbering, single-read product grouping, and case-insensitive coupon validation
  // -------------------------------------------------------------
  app.post('/api/orders/create', async (req, res) => {
    try {
      if (!adminDb) {
        return res.status(503).json({ success: false, error: 'قاعدة بيانات السيرفر غير متصلة حالياً' });
      }

      const orderData = req.body;
      if (!orderData || !orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
        return res.status(400).json({ success: false, error: 'بيانات الطلب غير مكتملة أو السلة فارغة' });
      }

      if (!orderData.customerName || !orderData.phone || !orderData.governorate || !orderData.address) {
        return res.status(400).json({ success: false, error: 'يرجى إدخال جميع البيانات الأساسية (الاسم، الهاتف، المحافظة، العنوان)' });
      }

      const sanitizedItems = orderData.items.map((it: any) => ({
        productId: String(it.productId || ''),
        productName: String(it.productName || 'هودي'),
        subtitle: String(it.subtitle || ''),
        image: String(it.image && it.image.startsWith('http') ? it.image : ''),
        size: String(it.size || 'L'),
        colorName: String(it.colorName || ''),
        colorHex: String(it.colorHex || '#171717'),
        price: Number(it.price) || 0,
        quantity: Number(it.quantity) || 1
      }));

      // 1. Group ordered quantities by productId to avoid duplicate reads in Firestore transaction
      const productDeltas = new Map<string, Record<string, number>>();
      for (const it of sanitizedItems) {
        if (!it.productId) continue;
        if (!productDeltas.has(it.productId)) {
          productDeltas.set(it.productId, {});
        }
        const sizeMap = productDeltas.get(it.productId)!;
        sizeMap[it.size] = (sizeMap[it.size] || 0) + (it.quantity || 1);
      }

      // 2. Case-insensitive coupon lookup
      let matchedCouponId: string | null = null;
      let appliedDiscount = Number(orderData.discount) || 0;
      if (orderData.couponCode) {
        const cleanCouponCode = String(orderData.couponCode).trim().toUpperCase();
        try {
          const couponsSnap = await adminDb.collection('coupons').get();
          for (const cDoc of couponsSnap.docs) {
            const cData = cDoc.data();
            if (cData && String(cData.code || '').trim().toUpperCase() === cleanCouponCode) {
              if (cData.active !== false) {
                matchedCouponId = cDoc.id;
                if (cData.discountPercent && Number(cData.discountPercent) > 0) {
                  const subtotal = Number(orderData.subtotal) || 0;
                  if (subtotal >= (Number(cData.minOrderAmount) || 0)) {
                    appliedDiscount = Math.round((subtotal * Number(cData.discountPercent)) / 100);
                  }
                }
              }
              break;
            }
          }
        } catch (cErr) {
          console.warn('Coupon lookup warning:', cErr);
        }
      }

      const counterRef = adminDb.collection('counters').doc('orders');
      const uniqueProductIds = Array.from(productDeltas.keys());
      const productDocRefs = uniqueProductIds.map((pId) => adminDb.collection('products').doc(pId));
      const couponRef = matchedCouponId ? adminDb.collection('coupons').doc(matchedCouponId) : null;

      const uniqueId = 'ord-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
      const orderRef = adminDb.collection('orders').doc(uniqueId);
      const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

      let createdOrder: any = null;

      // 3. Atomic transaction ensuring purely numerical order numbering & safe stock updates
      let transactionSuccess = false;
      let lastTxError: any = null;

      for (let attempt = 1; attempt <= 4; attempt++) {
        try {
          await adminDb.runTransaction(async (t) => {
            // --- ALL READS FIRST ---
            const counterSnap = await t.get(counterRef);
            const productSnaps = await Promise.all(productDocRefs.map((ref) => t.get(ref)));
            const couponSnap = couponRef ? await t.get(couponRef) : null;

            let currentNum = 1000;
            if (counterSnap.exists) {
              currentNum = Number(counterSnap.data()?.currentNumber) || 1000;
            }

            const nextOrderNumInt = currentNum + 1;
            const nextOrderNum = String(nextOrderNumInt);

            const newOrder = {
              id: uniqueId,
              orderNumber: nextOrderNum,
              customerName: String(orderData.customerName).trim(),
              phone: String(orderData.phone).trim(),
              alternatePhone: orderData.alternatePhone ? String(orderData.alternatePhone).trim() : '',
              governorate: String(orderData.governorate).trim(),
              center: orderData.center ? String(orderData.center).trim() : '',
              address: String(orderData.address).trim(),
              notes: orderData.notes ? String(orderData.notes).trim() : '',
              items: sanitizedItems,
              subtotal: Number(orderData.subtotal) || 0,
              shippingCost: Number(orderData.shippingCost) || 0,
              discount: appliedDiscount,
              couponCode: orderData.couponCode ? String(orderData.couponCode).trim() : '',
              total: Number(orderData.total) || 0,
              status: 'pending',
              createdAt: dateStr
            };

            createdOrder = newOrder;

            // --- ALL WRITES AFTER READS ---
            // Atomic numeric counter increment
            t.set(counterRef, {
              currentNumber: nextOrderNumInt,
              updatedAt: new Date().toISOString()
            }, { merge: true });

            // Save order document
            t.set(orderRef, newOrder);

            // Deduct sizesStock for each product document
            for (let i = 0; i < productSnaps.length; i++) {
              const pSnap = productSnaps[i];
              const pId = uniqueProductIds[i];
              const orderedSizes = productDeltas.get(pId) || {};
              if (pSnap && pSnap.exists) {
                const pData = pSnap.data() || {};
                const curSizesStock = { ...(pData.sizesStock || {}) };
                for (const [sz, qty] of Object.entries(orderedSizes)) {
                  const currentQty = Number(curSizesStock[sz]) || 0;
                  curSizesStock[sz] = Math.max(0, currentQty - qty);
                }
                t.update(productDocRefs[i], { sizesStock: curSizesStock });
              }
            }

            // Increment coupon timesUsed if matched
            if (couponRef && couponSnap && couponSnap.exists) {
              const curTimes = Number(couponSnap.data()?.timesUsed) || 0;
              t.update(couponRef, { timesUsed: curTimes + 1 });
            }
          }, { maxAttempts: 15 });

          transactionSuccess = true;
          break;
        } catch (err: any) {
          lastTxError = err;
          const isContention = err?.code === 10 ||
            String(err?.message || '').includes('contention') ||
            String(err?.message || '').includes('ABORTED');

          if (isContention && attempt < 4) {
            const delay = Math.floor(Math.random() * 150 + attempt * 75);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          throw err;
        }
      }

      if (!transactionSuccess) {
        throw lastTxError || new Error('Transaction failed');
      }

      // 4. Save in-app admin alert
      try {
        const alertId = 'alert-' + Date.now();
        const totalItems = sanitizedItems.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0);
        const summary = sanitizedItems.map((it: any) => `${it.productName} (${it.size})`).join(', ');

        await adminDb.collection('admin_alerts').doc(alertId).set({
          id: alertId,
          orderNumber: createdOrder.orderNumber,
          customerName: createdOrder.customerName,
          total: createdOrder.total,
          governorate: createdOrder.governorate,
          itemsCount: totalItems,
          itemsSummary: summary,
          createdAt: new Date().toISOString()
        });
      } catch (alertErr) {
        console.warn('Could not post admin_alert:', alertErr);
      }

      // 5. Trigger Web Push Notifications to all subscribed admin devices
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

      console.log(`[Order Created] Order #${createdOrder.orderNumber} successfully saved`);
      return res.status(201).json({
        success: true,
        order: createdOrder
      });
    } catch (err: any) {
      console.error('Error in /api/orders/create:', err);
      return res.status(500).json({
        success: false,
        error: 'حدث خطأ أثناء حفظ الطلب في قاعدة البيانات: ' + (err?.message || 'Server error')
      });
    }
  });

  // -------------------------------------------------------------
  // ADMIN USERS MANAGEMENT (Firebase Admin Auth)
  // Allows the owner to list and create new admin accounts safely
  // -------------------------------------------------------------
  app.get('/api/admin/users', async (req, res) => {
    try {
      if (!adminAuth) {
        return res.status(503).json({ success: false, error: 'Firebase Admin Auth غير متصل' });
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
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/admin/create-user', async (req, res) => {
    try {
      if (!adminAuth) {
        return res.status(503).json({ success: false, error: 'Firebase Admin Auth غير متصل' });
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
        ? 'هذا الإيميل مسجل بالفعل كمستخدم في Firebase'
        : err.code === 'auth/invalid-email'
        ? 'صيغة البريد الإلكتروني غير صحيحة'
        : (err.message || 'حدث خطأ أثناء إنشاء المستخدم');
      return res.status(400).json({ success: false, error: msg });
    }
  });

  app.post('/api/admin/delete-user', async (req, res) => {
    try {
      if (!adminAuth) {
        return res.status(503).json({ success: false, error: 'Firebase Admin Auth غير متصل' });
      }
      const { uid, email } = req.body || {};
      if (!uid) {
        return res.status(400).json({ success: false, error: 'معرف المستخدم غير محدد' });
      }
      // Protect original owner email
      if (email && email.toLowerCase() === 'vdbbdv1234567889@gmail.com') {
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

  // Send test push notification
  app.post('/api/push/test', async (req, res) => {
    const { logoUrl, icon } = req.body || {};
    const subscribers = await getAllActiveSubscribers();
    const finalLogo = logoUrl || icon || (await getStoreBrandLogo()) || '/icon-192.png';

    const payload = JSON.stringify({
      title: 'أوردر تجريبي',
      body: 'اسم العميل: أحمد محمد\nسعر الأوردر: 890 ج.م',
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
      }).then(() => true).catch(() => false)
    );

    const results = await Promise.all(sendPromises);
    const sentCount = results.filter(Boolean).length;

    return res.json({
      success: true,
      sentCount,
      totalSubscribers: subscribers.length
    });
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
