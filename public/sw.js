// Beyond Store - Service Worker for Shopify-Style Lock Screen Notifications
const CACHE_NAME = 'beyond-store-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming background push notifications
self.addEventListener('push', (event) => {
  let data = {
    title: 'Order #2138',
    body: 'E£1,170.00, 2 items from Online Store - Beyond',
    icon: '/shopify-icon-192.png',
    badge: '/shopify-badge-72.png',
    url: '/?view=admin'
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch (err) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/shopify-icon-192.png',
    badge: data.badge || '/shopify-badge-72.png',
    vibrate: [250, 100, 250, 100, 250],
    tag: data.tag || 'beyond-order-' + Date.now(),
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || '/?view=admin'
    }
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Handle user clicking the phone notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/?view=admin';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
