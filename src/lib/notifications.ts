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
 * Plays a pleasant, distinct customer order notification chime using Web Audio API.
 * Does not require external audio assets.
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
    // Harmonious alert notes: C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50)
    const chords = [
      { freq: 523.25, time: 0, duration: 0.25 },
      { freq: 659.25, time: 0.12, duration: 0.25 },
      { freq: 783.99, time: 0.24, duration: 0.35 },
      { freq: 1046.50, time: 0.38, duration: 0.65 }
    ];

    chords.forEach(({ freq, time, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + time);

      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(0.28, now + time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + time + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + duration + 0.05);
    });
  } catch (err) {
    console.warn('Could not play order notification audio:', err);
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

  // 1. Try Service Worker showNotification first (Standard for Android & mobile background notifications)
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
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
        icon: '/favicon.ico',
        badge: '/favicon.ico',
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

/**
 * Complete trigger for incoming order: plays chime + phone vibration + push notification
 */
export function triggerNewOrderNotification(orderNumber: string, customerName: string, total: number, governorate: string) {
  playOrderNotificationSound();
  triggerPhoneVibration();

  const title = `🔔 طلب جديد وارد في Beyond #${orderNumber}`;
  const body = `العميل: ${customerName} | ${governorate} | الإجمالي: ${total} ج.م`;

  sendDesktopNotification(title, body, () => {
    window.focus();
  });
}

/**
 * Test phone notification directly for the store manager
 */
export async function testPhoneNotification() {
  playOrderNotificationSound();
  triggerPhoneVibration();

  const title = '🔔 تجربة إشعار هاتف Beyond (ناجحة!)';
  const body = 'إشعارات الهاتف تعمل بنجاح مثل الواتساب! ستصلك تنبيهات فورية بكل طلب جديد.';

  await sendDesktopNotification(title, body);
}

