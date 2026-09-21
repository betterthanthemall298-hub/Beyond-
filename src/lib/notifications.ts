/**
 * Sound synthesizer and Desktop Push Notifications for incoming store orders
 */

const SOUND_ENABLED_KEY = 'nocturne_sound_notifications_enabled';

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
      gain.gain.linearRampToValueAtTime(0.25, now + time + 0.02);
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
 * Check if the browser supports desktop notifications
 */
export function isDesktopNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Get current browser notification permission
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isDesktopNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Request notification permission from browser
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isDesktopNotificationSupported()) return 'unsupported';
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return Notification.permission;
  }
}

/**
 * Send a desktop notification if permission is granted
 */
export function sendDesktopNotification(title: string, body: string, onClick?: () => void) {
  if (!isDesktopNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;

  try {
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'new-order',
      requireInteraction: true
    });

    if (onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };
    }
  } catch (err) {
    console.warn('Error showing desktop notification:', err);
  }
}

/**
 * Complete trigger for incoming order: plays sound + sends push notification
 */
export function triggerNewOrderNotification(orderNumber: string, customerName: string, total: number, governorate: string) {
  playOrderNotificationSound();

  const title = `🔔 طلب جديد وارد #${orderNumber}`;
  const body = `العميل: ${customerName} | ${governorate} | الإجمالي: ${total} ج.م`;

  sendDesktopNotification(title, body, () => {
    // Focus window or jump to orders
  });
}
