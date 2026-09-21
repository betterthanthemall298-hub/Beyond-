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
    `🛍️ *${product.name}* من متجر *Nocturne Hoodies*\n` +
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
  return `🔥 هودي ${product.name} بسعر ${product.price} ج.م من متجر Nocturne Hoodies`;
}

/**
 * Share directly on WhatsApp with pre-filled marketing message.
 */
export function shareToWhatsApp(product: Product): void {
  const text = getMarketingShareText(product);
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Share on Instagram Direct / Web. Copies link/message and opens Instagram.
 */
export async function shareToInstagram(product: Product): Promise<void> {
  const text = getMarketingShareText(product);
  await copyToClipboard(text);
  // Open Instagram direct / web
  window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
}

/**
 * Share directly on Telegram (kept for compatibility).
 */
export function shareToTelegram(product: Product): void {
  const url = getProductShareUrl(product.id);
  const text = getShortMarketingText(product);
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  window.open(telegramUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Share on Facebook.
 */
export function shareToFacebook(product: Product): void {
  const url = getProductShareUrl(product.id);
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  window.open(fbUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Share on X (Twitter).
 */
export function shareToTwitter(product: Product): void {
  const url = getProductShareUrl(product.id);
  const text = getShortMarketingText(product);
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  window.open(twitterUrl, '_blank', 'noopener,noreferrer');
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
      title: `${product.name} | Nocturne Hoodies`,
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
