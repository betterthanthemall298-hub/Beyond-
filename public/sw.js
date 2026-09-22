// Beyond Store - Service Worker for Background Phone & Desktop Push Notifications
const CACHE_NAME = 'beyond-store-v4';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
    ])
  );
});

// Handle incoming background push notifications (From Web Push API / VAPID)
self.addEventListener('push', (event) => {
  let data = {
    title: 'أوردر جديد',
    body: 'وصل أوردر جديد في متجر Beyond',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    url: '/?view=admin',
    tag: 'beyond-order-' + Date.now()
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch (err) {
    if (event.data) {
      try {
        data.body = event.data.text();
      } catch (e) {
        // fallback
      }
    }
  }

  // Ensure high-visibility notification options compatible with Android, iOS PWA, Windows & Mac
  const options = {
    body: data.body || 'وصل أوردر جديد في المتجر',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [300, 100, 300, 100, 300],
    tag: data.tag || 'beyond-order-' + Date.now(),
    renotify: true,
    data: {
      url: data.url || '/?view=admin',
      orderNumber: data.orderNumber || ''
    },
    actions: [
      {
        action: 'open_order',
        title: 'عرض الأوردر 📦'
      }
    ]
  };

  event.waitUntil(
    self.registration
      .showNotification(data.title || 'أوردر جديد', options)
      .then(() => {
        // Also notify all open client tabs so they can play the Shopify cash sound immediately
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      })
      .then((clientList) => {
        if (clientList && clientList.length > 0) {
          clientList.forEach((client) => {
            client.postMessage({
              type: 'NEW_ORDER_PUSH_RECEIVED',
              payload: data
            });
          });
        }
      })
      .catch((err) => {
        console.error('[SW] Error showing push notification:', err);
      })
  );
});

// Handle user clicking the phone notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/?view=admin';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
