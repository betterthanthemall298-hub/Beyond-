/**
 * Sound synthesizer and Desktop/Mobile Push Notifications for incoming store orders
 * Supports Service Worker background notifications, vibration, and audio chimes
 */

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
export async function sendDesktopNotification(title: string, body: string, onClick?: () => void) {
  if (!isDesktopNotificationSupported()) return;

  // Attempt vibration
  triggerPhoneVibration();

  if ('Notification' in window && Notification.permission !== 'granted') {
    return;
  }

  // 1. Try Service Worker showNotification first (Standard for Android & iOS PWA background notifications)
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(title, {
          body,
          icon: '/shopify-icon-192.png',
          badge: '/shopify-badge-72.png',
          tag: 'beyond-order-' + Date.now(),
          vibrate: [250, 100, 250, 100, 250],
          data: { url: '/?view=admin' },
          requireInteraction: true
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
        icon: '/shopify-icon-192.png',
        badge: '/shopify-badge-72.png',
        tag: 'beyond-order-' + Date.now(),
        requireInteraction: true
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
  governorate: string;
  itemsCount?: number;
  itemsSummary?: string;
  timestamp: number;
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
    id: 'shopify-alert-' + Date.now(),
    timestamp: Date.now()
  };
  shopifyAlertListeners.forEach((fn) => {
    try {
      fn(alertData);
    } catch (err) {
      console.warn('Error in shopify alert listener:', err);
    }
  });
}

/**
 * Dispatches remote background push notification that reaches admin's phone lock screen even when the site is closed
 */
export async function dispatchRemotePushNotification(order: {
  orderNumber: string;
  customerName: string;
  total: number;
  governorate: string;
  itemsCount?: number;
  phone?: string;
  address?: string;
  pushTopic?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
}) {
  const topic = (order.pushTopic && order.pushTopic.trim()) || getPushTopic();
  const count = order.itemsCount || 1;
  const itemsText = `${count} ${count === 1 ? 'item' : 'items'}`;
  const formattedPrice = `E£${Number(order.total || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

  const title = `Order #${order.orderNumber}`;
  const body = `${formattedPrice}, ${itemsText} from Online Store - Beyond\n${order.customerName} (${order.governorate})`;

  // 1. Send via ntfy.sh (Delivers instant lock-screen push notification on iOS and Android even with website closed)
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    await fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      headers: {
        'Title': title,
        'Priority': 'high',
        'Tags': 'moneybag,package',
        'Click': origin ? `${origin}/?view=admin` : '/?view=admin'
      },
      body: body
    });
  } catch (err) {
    console.warn('ntfy remote push error:', err);
  }

  // 2. Send via Telegram Bot if admin provided credentials
  if (order.telegramBotToken && order.telegramChatId) {
    try {
      const msg = `🛍️ *Order #${order.orderNumber}*\n${formattedPrice}, ${itemsText} from Online Store - Beyond\n\n👤 العميل: ${order.customerName}\n📱 الهاتف: ${order.phone || 'غير مسجل'}\n📍 المحافظة: ${order.governorate}\n🏠 العنوان: ${order.address || ''}`;
      await fetch(`https://api.telegram.org/bot${order.telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: order.telegramChatId,
          text: msg,
          parse_mode: 'Markdown'
        })
      });
    } catch (err) {
      console.warn('Telegram push error:', err);
    }
  }
}

/**
 * Complete trigger for incoming order: plays Shopify Cha-Ching chime + phone vibration + push notification + in-app banner
 */
export function triggerNewOrderNotification(
  orderNumber: string,
  customerName: string,
  total: number,
  governorate: string,
  itemsCount: number = 1,
  itemsSummary?: string
) {
  playOrderNotificationSound();
  triggerPhoneVibration();
  dispatchShopifyOrderAlert({
    orderNumber,
    customerName,
    total,
    governorate,
    itemsCount,
    itemsSummary
  });

  const formattedTotal = `E£${Number(total || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
  const itemsText = `${itemsCount} ${itemsCount === 1 ? 'item' : 'items'}`;

  // Title & Body matching the exact iOS Shopify Notification Stack in the user's screenshot
  const title = `Order #${orderNumber}`;
  const body = `${formattedTotal}, ${itemsText} from Online Store - Beyond\n${customerName} (${governorate})`;

  sendDesktopNotification(title, body, () => {
    window.focus();
  });
}

/**
 * Test phone notification directly for the store manager
 */
export async function testPhoneNotification(topicOverride?: string) {
  playOrderNotificationSound();
  triggerPhoneVibration();
  dispatchShopifyOrderAlert({
    orderNumber: '2138',
    customerName: 'حلا أحمد',
    total: 1170,
    governorate: 'القاهرة',
    itemsCount: 2,
    itemsSummary: 'هودي أوفر سايز فاخر (أسود - L) + (بيج - XL)'
  });

  const title = 'Order #2138';
  const body = 'E£1,170.00, 2 items from Online Store - Beyond\nحلا أحمد (القاهرة)';

  await sendDesktopNotification(title, body);

  // Also send remote test push to phone lock screen
  await dispatchRemotePushNotification({
    orderNumber: '2138',
    customerName: 'حلا أحمد',
    total: 1170,
    governorate: 'القاهرة',
    itemsCount: 2,
    phone: '01011565723',
    pushTopic: topicOverride
  });
}

