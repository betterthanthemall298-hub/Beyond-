import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { triggerNewOrderNotification } from './lib/notifications';

// Register Service Worker for Mobile Notifications & Background Support
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('Beyond Service Worker registered:', reg.scope);
        // Prompt immediate SW update if available
        reg.update().catch(() => {});
      })
      .catch((err) => {
        console.warn('Beyond Service Worker registration failed:', err);
      });
  });

  // Listen for push notifications received by Service Worker while browser tab is open
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'NEW_ORDER_PUSH_RECEIVED') {
      const payload = event.data.payload || {};
      triggerNewOrderNotification(
        payload.orderNumber || '101',
        payload.customerName || 'عميل جديد',
        payload.total || 0,
        payload.governorate,
        payload.itemsCount,
        payload.itemsSummary
      );
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

