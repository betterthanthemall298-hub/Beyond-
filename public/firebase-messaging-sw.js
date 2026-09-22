// Firebase Cloud Messaging Background Service Worker (FCM High Priority)
// Provides instant background delivery on locked screens, Android Doze mode, and desktop
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAAeQsiCgJ3i4_hb4-rAo_gBnD54P5TW94",
  authDomain: "robotic-vial-mvxch.firebaseapp.com",
  projectId: "robotic-vial-mvxch",
  storageBucket: "robotic-vial-mvxch.firebasestorage.app",
  messagingSenderId: "90304089159",
  appId: "1:90304089159:web:d51f969fbd5fd7a253f562"
};

firebase.initializeApp(firebaseConfig);

let messaging = null;
try {
  messaging = firebase.messaging();
} catch (e) {
  console.warn('[FCM SW] messaging initialization notice:', e);
}

// WhatsApp-style vibration pattern: 350ms vibe, 100ms pause, 350ms vibe, 100ms pause, 350ms vibe
const HIGH_PRIORITY_VIBRATION = [350, 100, 350, 100, 350];

if (messaging) {
  // FCM High-Priority Background Message Handler
  messaging.onBackgroundMessage((payload) => {
    console.log('[FCM SW] Received background FCM message with High Priority:', payload);

    const title = payload.notification?.title || payload.data?.title || 'أوردر جديد 🛒';
    const body = payload.notification?.body || payload.data?.body || 'وصل طلب جديد في متجر Beyond';
    const icon = payload.notification?.icon || payload.data?.icon || payload.data?.logoUrl || '/beyond-logo.jpg';
    const tag = payload.data?.tag || `beyond-order-${Date.now()}`;
    const url = payload.data?.url || '/?view=admin';

    const notificationOptions = {
      body,
      icon,
      badge: icon,
      tag,
      renotify: true,
      requireInteraction: true, // Keep on screen until acknowledged, like WhatsApp
      vibrate: HIGH_PRIORITY_VIBRATION,
      data: {
        url,
        orderNumber: payload.data?.orderNumber || '',
        receivedAt: Date.now()
      },
      actions: [
        {
          action: 'open_order',
          title: 'عرض الأوردر 📦'
        }
      ]
    };

    return self.registration.showNotification(title, notificationOptions).then(() => {
      // Forward to open browser tabs to trigger audio chime immediately
      return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'FCM_ORDER_NOTIFICATION',
            payload
          });
        });
      });
    });
  });
}

// Fallback direct Push event handler for raw push payloads
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const raw = event.data.text();
    // If it's handled by FCM internal mechanism, avoid duplicate display
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // plain text
    }

    // Only handle if FCM onBackgroundMessage didn't already capture it
    if (parsed && !parsed.fcmMessageId && !parsed.from) {
      const title = parsed.title || 'أوردر جديد 🛒';
      const body = parsed.body || 'وصل طلب جديد في المتجر';
      const icon = parsed.icon || parsed.logoUrl || '/beyond-logo.jpg';

      event.waitUntil(
        self.registration.showNotification(title, {
          body,
          icon,
          badge: icon,
          tag: parsed.tag || `order-${Date.now()}`,
          renotify: true,
          requireInteraction: true,
          vibrate: HIGH_PRIORITY_VIBRATION,
          data: {
            url: parsed.url || '/?view=admin',
            orderNumber: parsed.orderNumber || ''
          },
          actions: [
            {
              action: 'open_order',
              title: 'عرض الأوردر 📦'
            }
          ]
        }).then(() => {
          return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        }).then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'NEW_ORDER_PUSH_RECEIVED',
              payload: parsed
            });
          });
        })
      );
    }
  } catch (err) {
    console.warn('[FCM SW] push event fallback error:', err);
  }
});

// Handle notification interaction / click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/?view=admin';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
