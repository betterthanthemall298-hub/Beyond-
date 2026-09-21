import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  X,
  MessageCircle,
  Instagram,
  Share2,
  Copy,
  Check,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import {
  shareToWhatsApp,
  shareToInstagram,
  shareToFacebook,
  shareToTwitter,
  canNativeShare,
  shareNative,
  copyToClipboard,
  getProductShareUrl,
  getMarketingShareText
} from '../utils/shareProduct';

export const ProductShareModal: React.FC = () => {
  const { shareModalProduct, closeShareModal, addToast } = useStore();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMarketingText, setCopiedMarketingText] = useState(false);
  const [showMarketingPreview, setShowMarketingPreview] = useState(false);

  if (!shareModalProduct) return null;

  const product = shareModalProduct;
  const productUrl = getProductShareUrl(product.id);
  const marketingText = getMarketingShareText(product);
  const isNativeShareSupported = canNativeShare();

  const handleCopyLink = async () => {
    const success = await copyToClipboard(productUrl);
    if (success) {
      setCopiedLink(true);
      addToast({
        type: 'success',
        title: 'تم نسخ رابط المنتج!',
        description: 'يمكنك الآن لصقه ومشاركته في أي مكان.'
      });
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleCopyMarketingText = async () => {
    const success = await copyToClipboard(marketingText);
    if (success) {
      setCopiedMarketingText(true);
      addToast({
        type: 'success',
        title: 'تم نسخ النص التسويقي بالكامل!',
        description: 'جاهز للنشر على جروبات الفيسبوك وحالات الواتساب.'
      });
      setTimeout(() => setCopiedMarketingText(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    await shareNative(product);
  };

  return (
    <div
      id="product-share-modal-backdrop"
      onClick={closeShareModal}
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      <div
        id="product-share-modal-container"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-stone-800/80 bg-stone-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 id="share-modal-title" className="text-base font-bold text-stone-100">
                مشاركة المنتج والتسويق
              </h3>
              <p className="text-[11px] text-stone-400">
                شارك هذا الهودي المميز مع أصدقائك أو على منصات التواصل
              </p>
            </div>
          </div>

          <button
            id="close-share-modal-btn"
            type="button"
            onClick={closeShareModal}
            className="w-8 h-8 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center transition-colors"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Product Mini Preview Card */}
          <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-stone-950/80 border border-stone-800/80">
            <div className="w-16 h-20 rounded-xl overflow-hidden bg-stone-900 border border-stone-800 shrink-0">
              <img
                src={product.images[0]}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              {product.badge && (
                <span className="inline-block px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold mb-1">
                  {product.badge}
                </span>
              )}
              <h4 className="text-sm font-bold text-stone-100 truncate">
                {product.name}
              </h4>
              <p className="text-[11px] text-stone-400 truncate mt-0.5">
                {product.subtitle}
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-sm font-black text-amber-400 font-mono">
                  {product.price} ج.م
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-[11px] font-bold text-stone-500 line-through font-mono">
                    {product.originalPrice} ج.م
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Primary Social Media Share Actions */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-stone-400 block">
              مشاركة مباشرة بنقرة واحدة:
            </span>

            {/* WhatsApp Share Button */}
            <button
              id="share-whatsapp-btn"
              type="button"
              onClick={() => shareToWhatsApp(product)}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold transition-all shadow-lg shadow-emerald-950/40 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5 text-white fill-white/20" />
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold block">مشاركة عبر واتساب (WhatsApp)</span>
                  <span className="text-[11px] text-emerald-100/80 block font-normal">
                    إرسال رسالة جاهزة تتضمن تفاصيل المنتج والسعر ورابط مباشر
                  </span>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-black/20 text-white shrink-0 hidden sm:inline-block">
                مباشر
              </span>
            </button>

            {/* Instagram Share Button */}
            <button
              id="share-instagram-btn"
              type="button"
              onClick={async () => {
                await shareToInstagram(product);
                addToast({
                  type: 'success',
                  title: 'تم نسخ تفاصيل ورابط المنتج!',
                  description: 'تم فتح انستجرام للمشاركة في الرسائل المباشرة أو الستوري.'
                });
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] hover:opacity-95 active:scale-[0.99] text-white font-bold transition-all shadow-lg shadow-pink-950/40 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Instagram className="w-5 h-5 text-white" />
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold block">مشاركة عبر انستجرام (Instagram)</span>
                  <span className="text-[11px] text-pink-100/90 block font-normal">
                    نسخ النص والرابط تلقائياً والفتح في انستجرام للمشاركة مع الأصدقاء
                  </span>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-black/20 text-white shrink-0 hidden sm:inline-block">
                مباشر
              </span>
            </button>

            {/* Native Mobile Device Share (if available) */}
            {isNativeShareSupported && (
              <button
                id="share-native-device-btn"
                type="button"
                onClick={handleNativeShare}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-stone-800 hover:bg-stone-750 border border-stone-700 text-stone-200 font-bold transition-all shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold block">مشاركة عبر تطبيقات أخرى</span>
                    <span className="text-[11px] text-stone-400 block font-normal">
                      انستجرام، مسنجر، سناب شات، الرسائل القصيرة
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-stone-400" />
              </button>
            )}

            {/* Quick social shortcuts (Facebook, X) */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                id="share-facebook-btn"
                type="button"
                onClick={() => shareToFacebook(product)}
                className="py-2.5 px-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-stone-700 text-stone-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Share2 className="w-3.5 h-3.5 text-blue-400" />
                <span>فيسبوك (Facebook)</span>
              </button>

              <button
                id="share-twitter-btn"
                type="button"
                onClick={() => shareToTwitter(product)}
                className="py-2.5 px-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 hover:border-stone-700 text-stone-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Share2 className="w-3.5 h-3.5 text-stone-300" />
                <span>منصة X (تويتر)</span>
              </button>
            </div>
          </div>

          {/* Copy Direct Product Link Box */}
          <div className="space-y-2 pt-3 border-t border-stone-800/80">
            <span className="text-xs font-bold text-stone-400 block">
              رابط المنتج المباشر:
            </span>
            <div className="flex items-center gap-2 bg-stone-950 border border-stone-800 rounded-2xl p-1.5 focus-within:border-amber-500/60 transition-colors">
              <input
                type="text"
                readOnly
                value={productUrl}
                aria-label="رابط المنتج"
                className="flex-1 bg-transparent px-3 py-1.5 text-xs text-stone-300 font-mono focus:outline-none select-all truncate"
              />
              <button
                id="copy-product-link-btn"
                type="button"
                onClick={handleCopyLink}
                className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                  copiedLink
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-amber-500 hover:bg-amber-400 text-black font-extrabold shadow-sm'
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>تم النسخ!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ الرابط</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Copy Ready Marketing Copy (For Social Groups, Ads, & WhatsApp Status) */}
          <div className="space-y-2 pt-2 border-t border-stone-800/80">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowMarketingPreview(!showMarketingPreview)}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {showMarketingPreview
                    ? 'إخفاء النص الإعلاني الجاهز'
                    : 'عرض ونسخ النص الإعلاني الجاهز للتسويق'}
                </span>
              </button>

              <button
                id="copy-marketing-text-quick-btn"
                type="button"
                onClick={handleCopyMarketingText}
                className={`text-[11px] font-bold px-3 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                  copiedMarketingText
                    ? 'bg-emerald-950/60 border-emerald-700 text-emerald-400'
                    : 'bg-stone-800 hover:bg-stone-700 border-stone-700 text-stone-300 hover:text-white'
                }`}
              >
                {copiedMarketingText ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>تم نسخ النص</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>نسخ المنشور بالكامل</span>
                  </>
                )}
              </button>
            </div>

            {showMarketingPreview && (
              <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 text-xs text-stone-300 whitespace-pre-line leading-relaxed font-sans select-all animate-in fade-in">
                {marketingText}
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-stone-800/80 bg-stone-950/40 text-center">
          <p className="text-[11px] text-stone-500">
            عند فتح الرابط المشترك سيتم توجيه العميل مباشرة لصفحة هذا الهودي لتسهيل الشراء.
          </p>
        </div>
      </div>
    </div>
  );
};
