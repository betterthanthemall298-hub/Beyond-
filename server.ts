import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import webpush from 'web-push';
import dotenv from 'dotenv';

dotenv.config();

// VAPID keys configuration
const DEFAULT_VAPID_PUBLIC_KEY = 'BHAMTxXec0bTYWzXsI9g008qduH8qwo4TwIhPP4PHXYO75OpBapmlCHQA06gvVRzNGz-Ur609mhV9iYqpggJgNw';
const DEFAULT_VAPID_PRIVATE_KEY = 'jYxuwCsIgenUEhGo7fT-cSw1mOt1D0oxFN0d5d0Rg0I';
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

// In-memory subscriptions storage (keyed by endpoint URL)
interface StoredSubscription {
  subscription: webpush.PushSubscription;
  userAgent?: string;
  subscribedAt: string;
}

const pushSubscriptions = new Map<string, StoredSubscription>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'beyond-store',
      subscriptionsCount: pushSubscriptions.size
    });
  });

  // 1. Get VAPID Public Key for client subscription
  app.get('/api/push/vapid-public-key', (_req, res) => {
    res.json({
      publicKey: VAPID_PUBLIC_KEY
    });
  });

  // 2. Register Web Push Subscription
  app.post('/api/push/subscribe', (req, res) => {
    const { subscription, userAgent } = req.body || {};

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Invalid push subscription payload' });
    }

    pushSubscriptions.set(subscription.endpoint, {
      subscription,
      userAgent: userAgent || 'Unknown Browser',
      subscribedAt: new Date().toISOString()
    });

    console.log(`[Push] Registered push subscription. Total active: ${pushSubscriptions.size}`);
    return res.json({
      success: true,
      message: 'Subscription stored successfully',
      activeCount: pushSubscriptions.size
    });
  });

  // 3. Unsubscribe Web Push Subscription
  app.post('/api/push/unsubscribe', (req, res) => {
    const { endpoint } = req.body || {};
    if (endpoint && pushSubscriptions.has(endpoint)) {
      pushSubscriptions.delete(endpoint);
      console.log(`[Push] Removed subscription. Remaining: ${pushSubscriptions.size}`);
    }
    return res.json({ success: true, activeCount: pushSubscriptions.size });
  });

  // 4. Status endpoint
  app.get('/api/push/status', (_req, res) => {
    res.json({
      configured: true,
      publicKey: VAPID_PUBLIC_KEY,
      subscriptionsCount: pushSubscriptions.size
    });
  });

  // 5. Send order notification using Web Push API
  app.post('/api/push/send-order-alert', async (req, res) => {
    const { orderNumber, customerName, total, extraSubscriptions } = req.body || {};

    // Combine in-memory subscriptions with any extra subscriptions passed by client
    const targetMap = new Map<string, webpush.PushSubscription>();

    pushSubscriptions.forEach((item, key) => {
      targetMap.set(key, item.subscription);
    });

    if (Array.isArray(extraSubscriptions)) {
      for (const sub of extraSubscriptions) {
        if (sub && sub.endpoint && sub.keys) {
          targetMap.set(sub.endpoint, sub);
        }
      }
    }

    const payload = JSON.stringify({
      title: 'أوردر جديد',
      body: `اسم العميل: ${customerName || 'عميل جديد'}\nسعر الأوردر: ${total || 0} ج.م`,
      icon: '/icon-192.png',
      badge: '/favicon.ico',
      url: '/?view=admin',
      orderNumber: String(orderNumber || ''),
      tag: `order-${orderNumber || Date.now()}`
    });

    const sendPromises: Promise<{ endpoint: string; success: boolean; error?: string }>[] = [];
    const deadEndpoints: string[] = [];

    targetMap.forEach((sub, endpoint) => {
      sendPromises.push(
        webpush
          .sendNotification(sub, payload, {
            TTL: 86400, // 24 hours
            urgency: 'high'
          })
          .then(() => ({ endpoint, success: true }))
          .catch((err: any) => {
            // Check if subscription has expired or unsubscribed (HTTP 404 or 410)
            if (err?.statusCode === 410 || err?.statusCode === 404) {
              deadEndpoints.push(endpoint);
            }
            return { endpoint, success: false, error: err?.message || String(err) };
          })
      );
    });

    const results = await Promise.all(sendPromises);
    const sentCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    // Prune dead subscriptions
    deadEndpoints.forEach((ep) => {
      pushSubscriptions.delete(ep);
    });

    console.log(`[Push] Order #${orderNumber} alert sent. Success: ${sentCount}, Failed: ${failedCount}, Pruned: ${deadEndpoints.length}`);

    return res.json({
      success: true,
      sentCount,
      failedCount,
      totalSubscribers: targetMap.size
    });
  });

  // 6. Test push notification endpoint
  app.post('/api/push/test', async (req, res) => {
    const { subscription } = req.body || {};
    const targetMap = new Map<string, webpush.PushSubscription>();

    pushSubscriptions.forEach((item, key) => {
      targetMap.set(key, item.subscription);
    });

    if (subscription && subscription.endpoint && subscription.keys) {
      targetMap.set(subscription.endpoint, subscription);
    }

    if (targetMap.size === 0) {
      return res.status(400).json({
        success: false,
        error: 'No active push subscriptions found. Please click "فعّل الإشعارات" first.'
      });
    }

    const payload = JSON.stringify({
      title: 'أوردر جديد',
      body: 'اسم العميل: أحمد محمد\nسعر الأوردر: 890 ج.م',
      icon: '/icon-192.png',
      badge: '/favicon.ico',
      url: '/?view=admin',
      tag: 'test-push-' + Date.now()
    });

    const sendPromises: Promise<any>[] = [];
    targetMap.forEach((sub) => {
      sendPromises.push(
        webpush.sendNotification(sub, payload, { TTL: 3600, urgency: 'high' }).catch((err: any) => {
          console.warn('[Push] Test push delivery error:', err?.message || err);
          return null;
        })
      );
    });

    await Promise.all(sendPromises);
    return res.json({
      success: true,
      message: 'Test notification sent',
      count: targetMap.size
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
