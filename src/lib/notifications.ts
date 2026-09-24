/**
 * Sound synthesizer and Desktop/Mobile Push Notifications for incoming store orders
 * Supports Service Worker background notifications, vibration, and audio chimes
 */

import { authFetch } from './authFetch';

const SOUND_ENABLED_KEY = 'beyond_sound_notifications_enabled';

export function isSoundNotificationEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(SOUND_ENABLED_KEY);
  return stored !== 'false';
}

export function setSoundNotificationEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SOUND_ENABLED_KEY, enabled ? 'true' : 'false');
}

/**
 * Plays the authentic Shopify "Cha-Ching!" cash register & bell sound using Web Audio API.
 * Synthesizes the mechanical drawer kick, sliding mechanism, crystal bell chime, and coin clinks.
 */
export function playOrderNotificationSound() {
  if (typeof window === 'undefined') return;
  if (!isSoundNotificationEnabled()) return;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // 1. Mechanical "Clack" (Drawer release / lever latch)
    const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.08), ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1400, now);
    noiseFilter.Q.setValueAtTime(3, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    whiteNoise.start(now);

    // 2. High-Pitched Cash Register Bell "CHING!" (Authentic Shopify Bell: ~1760Hz & harmonic overtones)
    const bellFrequencies = [
      { freq: 1760, gain: 0.32, decay: 0.8 }, // Primary register bell A6
      { freq: 2640, gain: 0.22, decay: 0.6 }, // Fifth harmonic E7
      { freq: 3520, gain: 0.15, decay: 0.45 }, // Octave A7
      { freq: 1046, gain: 0.18, decay: 0.7 }  // Warm body resonance C6
    ];

    bellFrequencies.forEach(({ freq, gain: peakGain, decay }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + 0.04);

      gain.gain.setValueAtTime(0, now + 0.04);
      gain.gain.linearRampToValueAtTime(peakGain, now + 0.045);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04 + decay);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + 0.04);
      osc.stop(now + 0.04 + decay + 0.05);
    });

    // 3. Metallic Coin Drops / Clinking "Clink-Chink"
    const coins = [
      { time: 0.15, freq: 3100, duration: 0.08, vol: 0.18 },
      { time: 0.24, freq: 4186, duration: 0.12, vol: 0.22 },
      { freq: 2093, time: 0.26, duration: 0.15, vol: 0.12 }
    ];

    coins.forEach(({ time, freq, duration, vol }) => {
      const coinOsc = ctx.createOscillator();
      const coinGain = ctx.createGain();

      coinOsc.type = 'triangle';
      coinOsc.frequency.setValueAtTime(freq, now + time);
      coinOsc.frequency.exponentialRampToValueAtTime(freq * 0.9, now + time + duration);

      coinGain.gain.setValueAtTime(0, now + time);
      coinGain.gain.linearRampToValueAtTime(vol, now + time + 0.005);
      coinGain.gain.exponentialRampToValueAtTime(0.0001, now + time + duration);

      coinOsc.connect(coinGain);
      coinGain.connect(ctx.destination);

      coinOsc.start(now + time);
      coinOsc.stop(now + time + duration + 0.02);
    });
  } catch (err) {
    console.warn('Could not play Shopify notification audio:', err);
  }
}

/**
 * Vibrate phone if supported (identical to WhatsApp vibration pattern)
 */
export function triggerPhoneVibration() {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([250, 100, 250, 100, 250]);
    } catch {
      // Ignore vibration errors if unsupported by device permissions
    }
  }
}

/**
 * Check if the browser supports notifications
 */
export function isDesktopNotificationSupported(): boolean {
  return typeof window !== 'undefined' && ('Notification' in window || 'serviceWorker' in navigator);
}

/**
 * Get current browser notification permission
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isDesktopNotificationSupported()) return 'unsupported';
  if ('Notification' in window) {
    return Notification.permission;
  }
  return 'unsupported';
}

/**
 * Request notification permission from browser/phone
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isDesktopNotificationSupported()) return 'unsupported';
  try {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      return result;
    }
    return 'unsupported';
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return 'unsupported';
  }
}

const PUSH_TOPIC_KEY = 'beyond_push_notification_topic';
export const DEFAULT_PUSH_TOPIC = 'beyond_orders_alerts';

export const DEFAULT_VAPID_PUBLIC_KEY = 'BK-YuLDxApl-Gt3kS6awCGqMNUcsodMJB6UG79jJ1_fgeP_pQ34_Xv2ofazDyt6-jak32qW16snJQvOLwgy9BLk';

/**
 * Converts a Base64URL string into a Uint8Array required for applicationServerKey
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Retrieves VAPID public key from backend server with fallback
 */
export async function getVapidPublicKey(): Promise<string> {
  try {
    const res = await fetch('/api/push/vapid-public-key');
    if (res.ok) {
      const data = await res.json();
      if (data?.publicKey) return data.publicKey;
    }
  } catch (e) {
    console.warn('Failed to fetch VAPID key from backend, using fallback:', e);
  }
  return DEFAULT_VAPID_PUBLIC_KEY;
}

/**
 * Checks if current browser has an active PushManager subscription
 */
export async function getActivePushSubscription(): Promise<PushSubscription | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch (err) {
    console.warn('Failed to get push subscription:', err);
    return null;
  }
}

/**
 * Subscribes the current device to Web Push Notifications using VAPID keys,
 * and registers the subscription in both the Node.js backend and Firestore database.
 */
export async function subscribeToWebPush(): Promise<{
  success: boolean;
  subscription?: PushSubscription;
  error?: string;
  isIosBrowser?: boolean;
  isInIframe?: boolean;
}> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'نافذة المتصفح غير متاحة' };
  }

  // Detect iframe preview (Browser security strictly blocks Notification permission in iframes)
  const isInIframe = window.self !== window.top;
  if (isInIframe) {
    return {
      success: false,
      isInIframe: true,
      error: 'المتصفح يمنع تفعيل الإشعارات داخل نافذة المعاينة (iFrame). يرجى فتح الموقع في تبويب مستقل لتفعيل الإشعارات.'
    };
  }

  // Detect iOS Safari running in regular browser (not standalone PWA)
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;

  if (isIos && !isStandalone && !('PushManager' in window)) {
    return {
      success: false,
      isIosBrowser: true,
      error: 'على الآيفون، يجب إضافة الموقع إلى الشاشة الرئيسية (Add to Home Screen) أولاً لتفعيل إشعارات الويب Web Push.'
    };
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return {
      success: false,
      error: 'المتصفح الحالي لا يدعم Web Push Notifications.'
    };
  }

  try {
    // 1. Ensure Service Worker is registered
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch (e) {
      console.warn('Explicit SW register notice:', e);
    }

    // 2. Request user permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'تم رفض إذن الإشعارات من إعدادات المتصفح. يرجى السماح بالإشعارات من إعدادات الموقع أعلى المتصفح.' };
    }

    // 3. Wait for Service Worker registration
    const registration = await navigator.serviceWorker.ready;

    // 3. Obtain VAPID Public Key
    const vapidKey = await getVapidPublicKey();
    const applicationServerKey = urlBase64ToUint8Array(vapidKey);

    // 4. Force clean re-subscription with active VAPID public key
    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) {
      try {
        await existingSub.unsubscribe();
        console.log('[Push] Cleared previous push subscription to refresh with active VAPID key');
      } catch (unsubErr) {
        console.warn('[Push] Unsubscribe warning:', unsubErr);
      }
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });

    const subJson = subscription.toJSON();

    // 5. Send subscription to Node.js backend server
    try {
      await authFetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subJson,
          userAgent: navigator.userAgent
        })
      });
    } catch (apiErr) {
      console.warn('Backend server push registration warning:', apiErr);
    }

    // 6. Save subscription into Firestore database (push_subscriptions collection)
    try {
      const { setDoc, doc } = await import('firebase/firestore');
      const { db } = await import('./firebase');
      const safeId = btoa(subscription.endpoint.slice(-40)).replace(/[^a-zA-Z0-9]/g, '_');
      await setDoc(
        doc(db, 'push_subscriptions', safeId),
        {
          endpoint: subscription.endpoint,
          keys: subJson.keys || {},
          userAgent: navigator.userAgent,
          priority: 'high',
          createdAt: new Date().toISOString()
        },
        { merge: true }
      );
    } catch (firestoreErr) {
      console.warn('Firestore subscription save warning:', firestoreErr);
    }

    return { success: true, subscription };
  } catch (err: any) {
    console.error('Push subscription failed:', err);
    return { success: false, error: err?.message || 'تعذر تسجيل اشتراك الإشعارات' };
  }
}

export function getPushTopic(): string {
  if (typeof window === 'undefined') return DEFAULT_PUSH_TOPIC;
  return localStorage.getItem(PUSH_TOPIC_KEY) || DEFAULT_PUSH_TOPIC;
}

export function setPushTopic(topic: string) {
  if (typeof window === 'undefined') return;
  const clean = topic.trim().replace(/[^a-zA-Z0-9_-]/g, '') || DEFAULT_PUSH_TOPIC;
  localStorage.setItem(PUSH_TOPIC_KEY, clean);
}

/**
 * Send a phone / desktop notification using Service Worker (so it works when browser tab is inactive/backgrounded)
 */
export async function sendDesktopNotification(
  title: string,
  body: string,
  logoUrl?: string,
  onClick?: () => void
) {
  if (!isDesktopNotificationSupported()) return;

  // Attempt vibration
  triggerPhoneVibration();

  if ('Notification' in window && Notification.permission !== 'granted') {
    return;
  }

  const finalIcon = logoUrl || '/beyond-logo.jpg';

  // 1. Try Service Worker showNotification first (Standard for Android & mobile background notifications)
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(title, {
          body,
          icon: finalIcon,
          badge: finalIcon,
          tag: 'beyond-order-' + Date.now(),
          vibrate: [250, 100, 250, 100, 250],
          data: { url: '/?view=admin' }
        } as NotificationOptions);
        return;
      }
    } catch (swErr) {
      console.warn('Service worker showNotification failed, trying standard Notification:', swErr);
    }
  }

  // 2. Fallback to standard window Notification
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: finalIcon,
        badge: finalIcon,
        tag: 'beyond-order-' + Date.now()
      });

      if (onClick) {
        notification.onclick = () => {
          window.focus();
          onClick();
          notification.close();
        };
      }
    }
  } catch (err) {
    console.warn('Error showing standard notification:', err);
  }
}

export interface ShopifyOrderAlertData {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  governorate?: string;
  itemsCount?: number;
  itemsSummary?: string;
  timestamp: number;
  logoUrl?: string;
}

const shopifyAlertListeners = new Set<(data: ShopifyOrderAlertData) => void>();

export function onShopifyOrderAlert(callback: (data: ShopifyOrderAlertData) => void) {
  shopifyAlertListeners.add(callback);
  return () => {
    shopifyAlertListeners.delete(callback);
  };
}

export function dispatchShopifyOrderAlert(data: Omit<ShopifyOrderAlertData, 'id' | 'timestamp'>) {
  const alertData: ShopifyOrderAlertData = {
    ...data,
    id: 'beyond-alert-' + Date.now(),
    timestamp: Date.now()
  };
  shopifyAlertListeners.forEach((fn) => {
    try {
      fn(alertData);
    } catch (err) {
      console.warn('Error in alert listener:', err);
    }
  });
}

/**
 * Dispatches remote background push notification (kept for backward compatibility, actions handled server-side)
 */
export async function dispatchRemotePushNotification(_order: {
  orderNumber: string;
  customerName: string;
  total: number;
  governorate?: string;
  itemsCount?: number;
  phone?: string;
  address?: string;
  pushTopic?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  logoUrl?: string;
}) {
  // Remote dispatch is now exclusively handled server-side for security
}

/**
 * Complete trigger for incoming order: sound + vibration + phone notification
 */
export function triggerNewOrderNotification(
  orderNumber: string,
  customerName: string,
  total: number,
  governorate?: string,
  itemsCount?: number,
  itemsSummary?: string,
  logoUrl?: string
) {
  playOrderNotificationSound();
  triggerPhoneVibration();
  dispatchShopifyOrderAlert({
    orderNumber,
    customerName,
    total,
    governorate,
    itemsCount,
    itemsSummary,
    logoUrl
  });

  const title = 'أوردر جديد';
  const body = `اسم العميل: ${customerName}\nسعر الأوردر: ${total} ج.م`;

  sendDesktopNotification(title, body, logoUrl, () => {
    window.focus();
  });
}

/**
 * Test phone notification directly for the store manager with instantaneous delivery
 */
export async function testPhoneNotification(_topicOverride?: string, customLogoUrl?: string): Promise<{
  success: boolean;
  sentCount: number;
  totalSubscribers: number;
  error?: string;
}> {
  const logo = customLogoUrl || '/beyond-logo.jpg';

  // 1. Instant local feedback on current device (Sound + Vibration + Desktop Notification)
  playOrderNotificationSound();
  triggerPhoneVibration();

  const title = 'Beyond | اختبار الإشعارات';
  const body = 'نظام التنبيهات والصوت يعمل بنجاح وجاهز لاستقبال طلبات المتجر.';

  sendDesktopNotification(title, body, logo);

  const result = { success: true, sentCount: 0, totalSubscribers: 0, error: '' };

  // 2. High-urgency Web Push & remote channels via backend
  try {
    const res = await authFetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        logoUrl: logo
      })
    });
    if (res.ok) {
      const data = await res.json();
      result.sentCount = data.sentCount || 0;
      result.totalSubscribers = data.totalSubscribers || 0;
      result.success = data.success ?? true;
    } else {
      const data = await res.json().catch(() => ({}));
      result.error = data.error || `Error ${res.status}`;
    }
  } catch (e: any) {
    console.warn('Direct backend test push error:', e);
    result.error = e?.message || 'Failed to reach push server';
  }

  return result;
}


