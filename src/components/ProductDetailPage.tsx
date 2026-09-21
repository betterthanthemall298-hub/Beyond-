import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { HoodieSize } from '../types';
import {
  ArrowRight,
  ShoppingBag,
  Heart,
  Sparkles,
  ShieldCheck,
  Truck,
  RotateCcw,
  Star,
  Check,
  Package,
  Layers,
  Flame,
  Share2,
  MessageCircle,
  Instagram,
  Copy
} from 'lucide-react';
import { ProductCard } from './ProductCard';
import {
  shareToWhatsApp,
  shareToInstagram,
  copyToClipboard,
  getProductShareUrl
} from '../utils/shareProduct';

export const ProductDetailPage: React.FC = () => {
  const {
    selectedProduct,
    setSelectedProduct,
    addToCart,
    wishlist,
    toggleWishlist,
    setActiveView,
    setIsSizeAdvisorOpen,
    openShareModal,
    addToast,
    products
  } = useStore();

  // If no product is selected, fallback gracefully
  const product = selectedProduct || products[0];

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<HoodieSize>('L');
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-stone-400">
        <p>لم يتم العثور على المنتج المطلوب.</p>
        <button
          type="button"
          onClick={() => setActiveView('home')}
          className="mt-4 px-5 py-2.5 rounded-xl bg-amber-500 text-black font-bold text-xs"
        >
          العودة للرئيسية
        </button>
      </div>
    );
  }

  const isFav = wishlist.includes(product.id);
  const sizes: HoodieSize[] = ['M', 'L', 'XL', '2XL'];
  const colors = product.colors || [];
  const currentColor = colors[selectedColorIndex] || colors[0];

  const handleAddToCart = () => {
    addToCart(
      product,
      selectedSize,
      currentColor?.name,
      currentColor?.hex,
      quantity
    );
  };

  const handleBuyNow = () => {
    addToCart(
      product,
      selectedSize,
      currentColor?.name,
      currentColor?.hex,
      quantity
    );
    setActiveView('cart');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyLink = async () => {
    const url = getProductShareUrl(product.id);
    const success = await copyToClipboard(url);
    if (success) {
      setCopiedLink(true);
      addToast({
        type: 'success',
        title: 'تم نسخ رابط المنتج بنجاح!',
        description: 'يمكنك الآن لصقه ومشاركته في أي مكان.'
      });
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Recommended Products: other products in the store
  const relatedProducts = products
    .filter((p) => p.id !== product.id)
    .slice(0, 3);

  return (
    <div id="product-detail-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      {/* Top Breadcrumb & Clean Back Button */}
      <div className="flex items-center justify-between border-b border-stone-800/80 pb-4 mb-8">
        <button
          id="back-to-shop-btn"
          type="button"
          onClick={() => {
            setActiveView('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-white text-xs font-bold transition-all shadow-sm group"
        >
          <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
          <span>الرجوع إلى المتجر وتصفح الهوديز</span>
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs text-stone-500">
          <button
            type="button"
            onClick={() => setActiveView('home')}
            className="hover:text-amber-400"
          >
            الرئيسية
          </button>
          <span>/</span>
          <span className="text-stone-300 truncate max-w-xs">{product.name}</span>
        </div>
      </div>

      {/* Main Product Showcase Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start mb-16">
        {/* Gallery Column (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Main Large Image */}
          <div className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-stone-900 border border-stone-800 shadow-2xl group">
            <img
              src={product.images[activeImageIndex] || product.images[0]}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />

            {product.badge && (
              <div className="absolute top-4 right-4 px-3 py-1.5 rounded-xl bg-amber-500 text-black text-xs font-black shadow-lg">
                {product.badge}
              </div>
            )}

            <button
              id="product-page-wishlist-toggle"
              type="button"
              onClick={() => toggleWishlist(product.id)}
              className={`absolute top-4 left-4 p-3 rounded-2xl backdrop-blur-md border transition-all ${
                isFav
                  ? 'bg-rose-950/80 border-rose-800 text-rose-400'
                  : 'bg-stone-950/70 border-stone-800 text-stone-300 hover:text-white'
              }`}
            >
              <Heart className={`w-5 h-5 ${isFav ? 'fill-rose-400' : ''}`} />
            </button>

            {/* Share Button on Image */}
            <button
              id="product-page-share-image-btn"
              type="button"
              onClick={() => openShareModal(product)}
              className="absolute top-4 left-18 p-3 rounded-2xl backdrop-blur-md border border-stone-800 bg-stone-950/70 text-stone-300 hover:text-white hover:border-amber-500/50 transition-all"
              title="مشاركة المنتج عبر واتساب وانستجرام"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          {/* Thumbnail Strip */}
          {product.images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative w-20 h-24 rounded-xl overflow-hidden border-2 transition-all shrink-0 bg-stone-900 ${
                    activeImageIndex === idx
                      ? 'border-amber-500 shadow-md shadow-amber-950/50 scale-105'
                      : 'border-stone-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img}
                    alt={`${product.name} - ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details & Purchase Controls (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            <span className="text-xs font-bold text-amber-500 uppercase tracking-widest block mb-1">
              {product.subtitle}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-100 leading-tight">
              {product.name}
            </h1>

            {/* Pricing */}
            <div className="flex items-baseline gap-4 mt-3">
              <span className="text-3xl font-black text-amber-400 font-mono">
                {product.price} ج.م
              </span>
              {product.originalPrice != null && product.originalPrice > product.price && (
                <>
                  <span className="text-sm font-bold text-stone-500 line-through font-mono">
                    {product.originalPrice} ج.م
                  </span>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-0.5 rounded-lg">
                    وفر {product.originalPrice - product.price} ج.م
                  </span>
                </>
              )}
            </div>

            <p className="text-xs sm:text-sm text-stone-400 mt-3.5 leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Color Selection with swatches */}
          {colors.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-stone-800/80">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-300 font-semibold">الألوان المتوفرة:</span>
                <span className="text-amber-400 font-bold">{currentColor?.name}</span>
              </div>
              <div className="flex items-center gap-3">
                {colors.map((clr, idx) => {
                  const isSelected = selectedColorIndex === idx;
                  return (
                    <button
                      key={clr.name}
                      type="button"
                      onClick={() => setSelectedColorIndex(idx)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-stone-900 border-amber-500 shadow-sm shadow-amber-950/40'
                          : 'bg-stone-950 border-stone-800 hover:border-stone-700 text-stone-400'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-stone-600 inline-block shadow-inner"
                        style={{ backgroundColor: clr.hex }}
                      />
                      <span className="text-xs font-bold text-stone-200">{clr.name}</span>
                      {isSelected && <Check className="w-3 h-3 text-amber-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size Selection */}
          <div className="space-y-2.5 pt-2 border-t border-stone-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-300 font-semibold">المقاس المطلوب:</span>
              <button
                type="button"
                onClick={() => setIsSizeAdvisorOpen(true)}
                className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 hover:underline"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>حاسبة ناصح المقاسات</span>
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {sizes.map((sz) => {
                const stock = product.sizesStock[sz] || 0;
                const isAvailable = stock > 0;
                const isSelected = selectedSize === sz;

                return (
                  <button
                    key={sz}
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => setSelectedSize(sz)}
                    className={`py-3 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-amber-500 text-black border-amber-500 shadow-md shadow-amber-950/50'
                        : isAvailable
                        ? 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700'
                        : 'bg-stone-950 border-stone-900 text-stone-600 line-through cursor-not-allowed'
                    }`}
                  >
                    <span>{sz}</span>
                    <span className="text-[10px] font-normal opacity-80 mt-0.5">
                      {!isAvailable
                        ? 'نفد'
                        : stock < 5
                        ? `متبقي ${stock} فقط`
                        : 'متوفر'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Low stock alert only if less than 5 pieces available */}
            {product.sizesStock[selectedSize] > 0 && product.sizesStock[selectedSize] < 5 && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <span>سارع بالطلب، متبقي <strong className="font-mono font-bold text-amber-200">{product.sizesStock[selectedSize]} قطع فقط</strong> في المخزون!</span>
              </div>
            )}
          </div>

          {/* Quantity & Action Buttons */}
          <div className="space-y-3 pt-4 border-t border-stone-800/80">
            <div className="flex items-center gap-3">
              {/* Quantity selector */}
              <div className="flex items-center bg-stone-950 border border-stone-800 rounded-xl p-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-9 h-9 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center text-sm"
                >
                  -
                </button>
                <span className="w-10 text-center text-xs font-mono font-bold text-stone-100">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-9 h-9 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center text-sm"
                >
                  +
                </button>
              </div>

              {/* Add to Cart */}
              <button
                id="product-page-add-to-cart-btn"
                type="button"
                onClick={handleAddToCart}
                className="flex-1 py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 hover:text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span>إضافة إلى السلة</span>
              </button>
            </div>

            {/* Action Buttons: Primary Add to Cart as requested */}
            <button
              id="product-page-buy-now-btn"
              type="button"
              onClick={handleAddToCart}
              className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-950/40"
            >
              <ShoppingBag className="w-5 h-5" />
              <span>أضف إلى السلة</span>
            </button>
          </div>

          {/* Social Media Sharing & Marketing Card */}
          <div
            id="product-social-share-card"
            className="p-4 rounded-2xl bg-stone-900/80 border border-stone-800/90 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-stone-200">
                  مشاركة المنتج والتسويق:
                </span>
              </div>
              <button
                id="product-page-open-share-modal-btn"
                type="button"
                onClick={() => openShareModal(product)}
                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors hover:underline flex items-center gap-1"
              >
                <span>خيارات أكثر ونصوص إعلانية ←</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* WhatsApp Share */}
              <button
                id="product-detail-whatsapp-share-btn"
                type="button"
                onClick={() => shareToWhatsApp(product)}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-950/30 group"
              >
                <MessageCircle className="w-4 h-4 text-white fill-white/20" />
                <span>مشاركة واتساب</span>
              </button>

              {/* Instagram Share */}
              <button
                id="product-detail-instagram-share-btn"
                type="button"
                onClick={async () => {
                  await shareToInstagram(product);
                  addToast({
                    type: 'success',
                    title: 'تم نسخ تفاصيل ورابط الهودي!',
                    description: 'تم فتح انستجرام للمشاركة مع أصدقائك.'
                  });
                }}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] hover:opacity-95 active:scale-[0.99] text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-pink-950/30 group"
              >
                <Instagram className="w-4 h-4 text-white" />
                <span>مشاركة انستجرام</span>
              </button>

              {/* Copy Direct Link */}
              <button
                id="product-detail-copy-link-btn"
                type="button"
                onClick={handleCopyLink}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  copiedLink
                    ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300'
                    : 'bg-stone-950 hover:bg-stone-800 border-stone-800 hover:border-stone-700 text-stone-300 hover:text-white'
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>تم النسخ!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-stone-400" />
                    <span>نسخ الرابط</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Measurements Guide (الطول والعرض بالسنتيمتر) */}
          {product.sizeMeasurements && Object.keys(product.sizeMeasurements).length > 0 && (
            <div className="bg-stone-900/70 border border-stone-800 rounded-2xl p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-stone-200 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-500" />
                  <span>جدول قياسات الهودي (طول × عرض بالسم)</span>
                </h4>
                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                  {product.fit || 'قصة واسعة مريحة'}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-center border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-stone-800 text-stone-400">
                      <th className="py-1.5 px-2 text-right">المقاس</th>
                      <th className="py-1.5 px-2">الطول (cm)</th>
                      <th className="py-1.5 px-2">العرض (cm)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/60 font-mono text-stone-200">
                    {sizes.map((sz) => {
                      const m = product.sizeMeasurements?.[sz];
                      if (!m) return null;
                      const isSelected = selectedSize === sz;
                      return (
                        <tr
                          key={sz}
                          className={`transition-colors ${
                            isSelected ? 'bg-amber-500/15 text-amber-300 font-bold' : ''
                          }`}
                        >
                          <td className="py-2 px-2 text-right font-sans font-bold">{sz}</td>
                          <td className="py-2 px-2">{m.length || '-'} سم</td>
                          <td className="py-2 px-2">{m.width || '-'} سم</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recommended / Products You May Like Section */}
      <section id="recommended-hoodies-section" className="border-t border-stone-800/80 pt-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-stone-100">
              منتجات قد تنال إعجابك أيضاً
            </h3>
            <p className="text-xs text-stone-400 mt-1">
              قطع أخرى من تشكيلة الهوديز الشتوية المختارة
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveView('catalog');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-xs font-bold text-amber-400 hover:underline"
          >
            عرض الكل
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {relatedProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
};
