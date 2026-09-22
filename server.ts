import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import webpush from 'web-push';
import dotenv from 'dotenv';
import fs from 'fs';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, getDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';

dotenv.config();

// VAPID keys configuration
const DEFAULT_VAPID_PUBLIC_KEY = 'BK-YuLDxApl-Gt3kS6awCGqMNUcsodMJB6UG79jJ1_fgeP_pQ34_Xv2ofazDyt6-jak32qW16snJQvOLwgy9BLk';
const DEFAULT_VAPID_PRIVATE_KEY = 'WS9dkAbvZ4ob8rumdNTcf2T9htduSNvJnr2hk6tByeM';
const DEFAULT_VAPID_EMAIL = 'mailto:betterthanthemall298@gmail.com';

const VAPID_PUBLIC_KEY = (process.env.VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY).trim();
const VAPID_PRIVATE_KEY = (process.env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE_KEY).trim();

// Ensure VAPID subject is a valid URL/URI (RFC 8292 requires mailto: or https://)
let rawVapidEmail = (process.env.VAPID_EMAIL || DEFAULT_VAPID_EMAIL).trim();
if (!rawVapidEmail.startsWith('mailto:') && !rawVapidEmail.startsWith('https://') && !rawVapidEmail.startsWith('http://')) {
  rawVapidEmail = `mailto:${rawVapidEmail}`;
}
const VAPID_EMAIL = rawVapidEmail;

// Initialize web-push
try {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log(`[Push] VAPID configuration initialized successfully with subject: ${VAPID_EMAIL}`);
} catch (err) {
  console.error('[Push] Failed to set VAPID details:', err);
}

// Connect to Firestore for multi-device push subscription persistence across all admin instances
let firestoreDb: any = null;
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const fbApp = getApps().length > 0 ? getApps()[0] : initializeApp(config, 'backend-server');
    firestoreDb = getFirestore(fbApp, config.firestoreDatabaseId);
    console.log('[Push] Firestore real-time push subscription synchronization enabled');
  }
} catch (err) {
  console.warn('[Push] Firestore initialization notice in server:', err);
}

// In-memory subscriptions storage (keyed by endpoint URL)
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

// In-memory cache for fast push dispatch with zero latency
let cachedSubscribers: SubscriberRecord[] = [];
let lastSubscriberFetchTime = 0;
const SUBSCRIBER_CACHE_TTL = 15000; // 15 seconds

// Helper to retrieve brand logo from Firestore settings
let cachedBrandLogo = '';
let lastLogoFetchTime = 0;

async function getStoreBrandLogo(): Promise<string> {
  const now = Date.now();
  if (cachedBrandLogo && now - lastLogoFetchTime < 30000) {
    return cachedBrandLogo;
  }
  if (firestoreDb) {
    try {
      const docSnap = await getDoc(doc(firestoreDb, 'settings', 'general'));
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data?.brandLogo) {
          cachedBrandLogo = data.brandLogo;
          lastLogoFetchTime = now;
          return cachedBrandLogo;
        }
      }
    } catch {
      // ignore
    }
  }
  return cachedBrandLogo || '/icon-192.png';
}

// Helper to retrieve all active subscriptions from memory and Firestore
async function getAllActiveSubscribers(forceRefresh = false): Promise<SubscriberRecord[]> {
  const now = Date.now();
  if (!forceRefresh && cachedSubscribers.length > 0 && now - lastSubscriberFetchTime < SUBSCRIBER_CACHE_TTL) {
    return cachedSubscribers;
  }

  const subscriberMap = new Map<string, SubscriberRecord>();

  // 1. In-memory subscriptions
  pushSubscriptions.forEach((item, endpoint) => {
    if (item.subscription && item.subscription.endpoint && item.subscription.keys) {
      subscriberMap.set(endpoint, {
        endpoint,
        keys: item.subscription.keys as any
      });
    }
  });

  // 2. Persistent Firestore subscriptions
  if (firestoreDb) {
    try {
      const snap = await getDocs(collection(firestoreDb, 'push_subscriptions'));
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  // Health check endpoint
  app.get('/api/health', async (_req, res) => {
    const subscribers = await getAllActiveSubscribers();
    res.json({
      status: 'ok',
      service: 'beyond-store',
      subscriptionsCount: subscribers.length
    });
  });

  // 1. Get VAPID Public Key for client subscription
  app.get('/api/push/vapid-public-key', (_req, res) => {
    res.json({
      publicKey: VAPID_PUBLIC_KEY
    });
  });

  // 2. Register Web Push Subscription
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

    // Also persist directly to Firestore
    if (firestoreDb) {
      try {
        const subId = Buffer.from(subscription.endpoint).toString('base64').replace(/[^a-zA-Z0-9_-]/g, '').slice(-40);
        await setDoc(doc(firestoreDb, 'push_subscriptions', subId), {
          endpoint: subscription.endpoint,
          keys: subscription.keys,
          userAgent: userAgent || 'Unknown Browser',
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn('[Push] Could not persist subscription to Firestore:', err);
      }
    }

    const allSubs = await getAllActiveSubscribers();
    console.log(`[Push] Registered push subscription. Total active admin devices: ${allSubs.length}`);
    return res.json({
      success: true,
      message: 'Subscription stored successfully',
      activeCount: allSubs.length
    });
  });

  // 2b. Optional token registration endpoint
  app.post('/api/push/fcm-token', (_req, res) => {
    return res.json({ success: true });
  });

  // 3. Unsubscribe Web Push Subscription
  app.post('/api/push/unsubscribe', async (req, res) => {
    const { endpoint } = req.body || {};
    if (endpoint) {
      pushSubscriptions.delete(endpoint);
      if (firestoreDb) {
        try {
          const subId = Buffer.from(endpoint).toString('base64').replace(/[^a-zA-Z0-9_-]/g, '').slice(-40);
          await deleteDoc(doc(firestoreDb, 'push_subscriptions', subId));
        } catch {
          // ignore
        }
      }
    }
    const allSubs = await getAllActiveSubscribers();
    return res.json({ success: true, activeCount: allSubs.length });
  });

  // 4. Status endpoint
  app.get('/api/push/status', async (_req, res) => {
    const subscribers = await getAllActiveSubscribers();
    res.json({
      configured: true,
      publicKey: VAPID_PUBLIC_KEY,
      subscriptionsCount: subscribers.length
    });
  });

  // 5. Send order notification to ALL admin devices using Web Push API
  app.post('/api/push/send-order-alert', async (req, res) => {
    const { orderNumber, customerName, total, extraSubscriptions, logoUrl, icon } = req.body || {};

    const allSubscribers = await getAllActiveSubscribers();
    const subscriberMap = new Map<string, SubscriberRecord>();

    allSubscribers.forEach((sub) => {
      subscriberMap.set(sub.endpoint, sub);
    });

    if (Array.isArray(extraSubscriptions)) {
      for (const sub of extraSubscriptions) {
        if (sub && sub.endpoint && sub.keys) {
          subscriberMap.set(sub.endpoint, {
            endpoint: sub.endpoint,
            keys: sub.keys
          });
        }
      }
    }

    const finalLogo = logoUrl || icon || (await getStoreBrandLogo()) || '/icon-192.png';

    const payload = JSON.stringify({
      title: 'أوردر جديد',
      body: `اسم العميل: ${customerName || 'عميل جديد'}\nسعر الأوردر: ${total || 0} ج.م`,
      icon: finalLogo,
      badge: finalLogo,
      logoUrl: finalLogo,
      url: '/?view=admin',
      orderNumber: String(orderNumber || ''),
      tag: `order-${orderNumber || Date.now()}`,
      timestamp: Date.now()
    });

    const sendPromises: Promise<{ endpoint: string; success: boolean; error?: string }>[] = [];
    const deadSubscribers: SubscriberRecord[] = [];

    subscriberMap.forEach((sub) => {
      sendPromises.push(
        webpush
          .sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys
            },
            payload,
            {
              TTL: 60, // Immediate high-priority delivery, no 24-hour queuing
              urgency: 'high',
              headers: {
                Urgency: 'high',
                Topic: 'order-alert'
              }
            }
          )
          .then(() => ({ endpoint: sub.endpoint, success: true }))
          .catch((err: any) => {
            // Prune if expired, unsubscribed, or key mismatched (404, 410, 403)
            if (err?.statusCode === 410 || err?.statusCode === 404 || err?.statusCode === 403) {
              deadSubscribers.push(sub);
            }
            return { endpoint: sub.endpoint, success: false, error: err?.message || String(err) };
          })
      );
    });

    const results = await Promise.all(sendPromises);
    const sentCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    // Prune dead subscriptions from memory and Firestore asynchronously
    if (deadSubscribers.length > 0) {
      setTimeout(() => {
        deadSubscribers.forEach((sub) => {
          pushSubscriptions.delete(sub.endpoint);
          if (sub.docId && firestoreDb) {
            deleteDoc(doc(firestoreDb, 'push_subscriptions', sub.docId)).catch(() => {});
          }
        });
      }, 0);
    }

    console.log(`[Push] Order #${orderNumber} alert sent. Success: ${sentCount}, Failed: ${failedCount}, Pruned: ${deadSubscribers.length}`);

    return res.json({
      success: true,
      sentCount,
      failedCount,
      totalSubscribers: subscriberMap.size
    });
  });

  // 6. Test push notification endpoint (Sends to ALL subscribed admin devices)
  app.post('/api/push/test', async (req, res) => {
    const { subscription, logoUrl, icon } = req.body || {};
    const allSubscribers = await getAllActiveSubscribers();
    const subscriberMap = new Map<string, SubscriberRecord>();

    allSubscribers.forEach((sub) => {
      subscriberMap.set(sub.endpoint, sub);
    });

    if (subscription && subscription.endpoint && subscription.keys) {
      subscriberMap.set(subscription.endpoint, {
        endpoint: subscription.endpoint,
        keys: subscription.keys
      });
    }

    if (subscriberMap.size === 0) {
      return res.status(400).json({
        success: false,
        error: 'لا توجد أجهزة مسجلة حالياً. يرجى الضغط على "فعّل الإشعارات" في لوحة الإدارة أولاً.'
      });
    }

    const finalLogo = logoUrl || icon || (await getStoreBrandLogo()) || '/icon-192.png';

    const payload = JSON.stringify({
      title: 'أوردر جديد',
      body: 'اسم العميل: أحمد محمد\nسعر الأوردر: 890 ج.م',
      icon: finalLogo,
      badge: finalLogo,
      logoUrl: finalLogo,
      url: '/?view=admin',
      tag: 'test-push-' + Date.now(),
      timestamp: Date.now()
    });

    const deadSubscribers: SubscriberRecord[] = [];
    const sendPromises: Promise<{ success: boolean; endpoint: string; error?: string }>[] = [];

    subscriberMap.forEach((sub) => {
      sendPromises.push(
        webpush
          .sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys
            },
            payload,
            {
              TTL: 60, // Immediate high-priority delivery, no 24-hour queuing
              urgency: 'high',
              headers: {
                Urgency: 'high',
                Topic: 'order-alert'
              }
            }
          )
          .then(() => ({ success: true, endpoint: sub.endpoint }))
          .catch((err: any) => {
            console.warn('[Push] Test push delivery error for endpoint:', err?.message || err);
            if (err?.statusCode === 410 || err?.statusCode === 404 || err?.statusCode === 403) {
              deadSubscribers.push(sub);
            }
            return { success: false, endpoint: sub.endpoint, error: err?.message };
          })
      );
    });

    const results = await Promise.all(sendPromises);
    const sentCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    if (deadSubscribers.length > 0) {
      setTimeout(() => {
        deadSubscribers.forEach((sub) => {
          pushSubscriptions.delete(sub.endpoint);
          if (sub.docId && firestoreDb) {
            deleteDoc(doc(firestoreDb, 'push_subscriptions', sub.docId)).catch(() => {});
          }
        });
      }, 0);
    }

    return res.json({
      success: true,
      sentCount,
      failedCount,
      totalSubscribers: subscriberMap.size
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
