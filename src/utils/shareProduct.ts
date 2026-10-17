import { Product } from '../types';

/**
 * Generates the direct URL to view a specific product.
 */
export function getProductShareUrl(productId: string): string {
  if (typeof window === 'undefined') return '';
  const baseUrl = `${window.location.origin}${window.location.pathname}`;
  return `${baseUrl}?product=${encodeURIComponent(productId)}`;
}

/**
 * Creates persuasive marketing copy formatted for WhatsApp, Instagram, and social media.
 */
export function getMarketingShareText(product: Product): string {
  const url = getProductShareUrl(product.id);
  const discountText =
    product.originalPrice && product.originalPrice > product.price
      ? ` 🔥 خصم خاص (بدلاً من ${product.originalPrice} ج.م)`
      : '';

  return (
    `🛍️ *${product.name}* من متجر *Beyond Hoodies*\n` +
    (product.subtitle ? `✨ ${product.subtitle}\n` : '') +
    `💰 السعر: *${product.price} ج.م*${discountText}\n` +
    `🧵 خامة قطنية فاخرة مع تقفيل عالي الجودة وتصميم عصري مريح.\n\n` +
    `👇 اطلبه الآن مباشرة وتصفح المقاسات المتوفرة عبر الرابط:\n` +
    `${url}`
  );
}

/**
 * Short headline for Instagram and social posts.
 */
export function getShortMarketingText(product: Product): string {
  return `🔥 هودي ${product.name} بسعر ${product.price} ج.م من متجر Beyond Hoodies`;
}

function safeOpenUrl(targetUrl: string): void {
  try {
    const w = window.open(targetUrl, '_blank', 'noopener,noreferrer');
    if (!w || w.closed || typeof w.closed === 'undefined') {
      window.location.href = targetUrl;
    }
  } catch {
    window.location.href = targetUrl;
  }
}

/**
 * Share directly on WhatsApp with pre-filled marketing message.
 */
export async function shareToWhatsApp(product: Product): Promise<void> {
  const text = getMarketingShareText(product);
  await copyToClipboard(text).catch(() => {});
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  safeOpenUrl(whatsappUrl);
}

/**
 * Share on Instagram Direct / Web. Copies link/message and opens Instagram.
 */
export async function shareToInstagram(product: Product): Promise<void> {
  const text = getMarketingShareText(product);
  await copyToClipboard(text).catch(() => {});
  safeOpenUrl('https://www.instagram.com/');
}

/**
 * Share directly on Telegram (kept for compatibility).
 */
export async function shareToTelegram(product: Product): Promise<void> {
  const url = getProductShareUrl(product.id);
  const text = getShortMarketingText(product);
  await copyToClipboard(text).catch(() => {});
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  safeOpenUrl(telegramUrl);
}

/**
 * Share on Facebook.
 */
export async function shareToFacebook(product: Product): Promise<void> {
  const url = getProductShareUrl(product.id);
  await copyToClipboard(url).catch(() => {});
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  safeOpenUrl(fbUrl);
}

/**
 * Share on X (Twitter).
 */
export async function shareToTwitter(product: Product): Promise<void> {
  const url = getProductShareUrl(product.id);
  const text = getShortMarketingText(product);
  await copyToClipboard(`${text} ${url}`).catch(() => {});
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  safeOpenUrl(twitterUrl);
}

/**
 * Check if the browser supports the native Web Share API.
 */
export function canNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

/**
 * Trigger native device share sheet (WhatsApp, Telegram, Instagram, Messages, etc.)
 */
export async function shareNative(product: Product): Promise<boolean> {
  if (!canNativeShare()) return false;
  const url = getProductShareUrl(product.id);
  const text = getShortMarketingText(product);
  try {
    await navigator.share({
      title: `${product.name} | Beyond Hoodies`,
      text: text,
      url: url
    });
    return true;
  } catch (err: any) {
    if (err?.name !== 'AbortError') {
      console.warn('Native share failed:', err);
    }
    return false;
  }
}

/**
 * Copies text to clipboard with fallback.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for non-secure or older contexts
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}
