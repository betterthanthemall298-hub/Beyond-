import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { HoodieSize } from '../types';
import {
  X,
  Heart,
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  Truck,
  RotateCcw,
  Check,
  Star,
  Share2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Flame,
  Zap
} from 'lucide-react';

export const QuickLookModal: React.FC = () => {
  const {
    quickLookProduct,
    closeQuickLook,
    addToCart,
    wishlist,
    toggleWishlist,
    setIsSizeAdvisorOpen,
    openShareModal,
    setSelectedProduct,
    setActiveView,
    setIsCheckoutOpen
  } = useStore();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<HoodieSize>('L');
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Reset state when a new product is opened in Quick Look
  useEffect(() => {
    if (quickLookProduct) {
      setActiveImageIndex(0);
      setSelectedSize('L');
      setSelectedColorIndex(0);
      setQuantity(1);
    }
  }, [quickLookProduct]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeQuickLook();
      }
    };
    if (quickLookProduct) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickLookProduct, closeQuickLook]);

  if (!quickLookProduct) return null;

  const product = quickLookProduct;
  const isFav = wishlist.includes(product.id);
  const sizes: HoodieSize[] = ['M', 'L', 'XL', '2XL'];
  const colors = product.colors || [];
  const currentColor = colors[selectedColorIndex] || colors[0];
  const currentStock = product.sizesStock[selectedSize] || 0;
  const isOutOfStock = currentStock <= 0;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart(
      product,
      selectedSize,
      currentColor?.name,
      currentColor?.hex,
      quantity
    );
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    addToCart(
      product,
      selectedSize,
      currentColor?.name,
      currentColor?.hex,
      quantity
    );
    closeQuickLook();
    setIsCheckoutOpen(true);
  };

  const handleNavigateToFullPage = () => {
    setSelectedProduct(product);
    setActiveView('product');
    closeQuickLook();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasDiscount = product.originalPrice != null && product.originalPrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)
    : 0;

  return (
    <div
      id="quick-look-backdrop"
      onClick={closeQuickLook}
      className="fixed inset-0 z-[115] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in"
    >
      <div
        id="quick-look-panel"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col relative animate-in zoom-in-95 duration-200"
      >
        {/* Subtle top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 z-20" />

        {/* Floating Top Controls (Close, Wishlist, Share) */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          <button
            id="quick-look-wishlist-btn"
            type="button"
            onClick={() => toggleWishlist(product.id)}
            className={`w-9 h-9 rounded-full backdrop-blur-md border flex items-center justify-center transition-all ${
              isFav
                ? 'bg-rose-950/80 border-rose-800/80 text-rose-400'
                : 'bg-stone-950/80 border-stone-700/80 text-stone-300 hover:text-white'
            }`}
            title={isFav ? 'إزالة من المفضلة' : 'حفظ في المفضلة'}
          >
            <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-400' : ''}`} />
          </button>

          <button
            id="quick-look-share-btn"
            type="button"
            onClick={() => openShareModal(product)}
            className="w-9 h-9 rounded-full bg-stone-950/80 backdrop-blur-md border border-stone-700/80 text-stone-300 hover:text-amber-400 flex items-center justify-center transition-all"
            title="مشاركة المنتج"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            id="close-quick-look-btn"
            type="button"
            onClick={closeQuickLook}
            className="w-9 h-9 rounded-full bg-stone-950/90 border border-stone-700 text-stone-300 hover:text-white hover:bg-stone-800 flex items-center justify-center transition-all shadow-md"
            aria-label="إغلاق كويك لوك"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2">
          {/* Images Section */}
          <div className="p-4 sm:p-6 bg-stone-950 flex flex-col justify-between gap-3 border-b md:border-b-0 md:border-l border-stone-800/80">
            {/* Main Image Frame */}
            <div className="w-full aspect-[4/5] rounded-2xl overflow-hidden bg-stone-900 border border-stone-800/90 relative group">
              <img
                src={product.images[activeImageIndex] || product.images[0]}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />

              {/* Tag / Badge */}
              <div className="absolute top-4 right-4 flex flex-col gap-1.5 z-10">
                <span className="px-3 py-1 rounded-xl bg-amber-500 text-black text-xs font-black shadow-lg">
                  {product.badge || 'BEYOND OVERSIZED'}
                </span>
                {hasDiscount && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-rose-600 text-white text-[11px] font-bold shadow-md">
                    خصم {discountPercent}%
                  </span>
                )}
              </div>

              {/* Arrows for multi-images */}
              {product.images && product.images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : product.images.length - 1))
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-stone-950/70 border border-stone-700 text-white flex items-center justify-center hover:bg-stone-900 transition-colors"
                    aria-label="الصورة السابقة"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveImageIndex((prev) => (prev < product.images.length - 1 ? prev + 1 : 0))
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-stone-950/70 border border-stone-700 text-white flex items-center justify-center hover:bg-stone-900 transition-colors"
                    aria-label="الصورة التالية"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Row */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    id={`quick-look-thumb-${idx}`}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-14 sm:w-16 h-18 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                      activeImageIndex === idx
                        ? 'border-amber-400 scale-105 shadow-md shadow-amber-950/60'
                        : 'border-stone-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} ${idx}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Guarantees Mini Badges */}
            <div className="grid grid-cols-3 gap-2 text-[11px] text-stone-400 pt-2 border-t border-stone-800/60">
              <div className="bg-stone-900/60 p-2 rounded-xl border border-stone-800 text-center">
                <Truck className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1" />
                <span>شحن لكافة مصر</span>
              </div>
              <div className="bg-stone-900/60 p-2 rounded-xl border border-stone-800 text-center">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1" />
                <span>معاينة قبل الدفع</span>
              </div>
              <div className="bg-stone-900/60 p-2 rounded-xl border border-stone-800 text-center">
                <RotateCcw className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1" />
                <span>استبدال سهل</span>
              </div>
            </div>
          </div>

          {/* Details & Actions Section */}
          <div className="p-5 sm:p-7 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              {/* Category, Quick Look Tag & Rating */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold">
                    معاينة سريعة
                  </span>
                  <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                    {product.subtitle}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 bg-stone-950 px-2 py-1 rounded-lg border border-stone-800 text-xs">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="font-bold text-stone-200">{product.rating}</span>
                  <span className="text-[11px] text-stone-500">({product.reviewsCount})</span>
                </div>
              </div>

              {/* Title & Short Description */}
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-stone-100 leading-snug">
                  {product.name}
                </h2>
                <p className="text-xs text-stone-400 mt-2 line-clamp-2 leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Pricing Section */}
              <div className="bg-stone-950/80 border border-stone-800/80 p-3.5 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-stone-400 block mb-0.5">السعر عند الاستلام:</span>
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-2xl font-black text-amber-400 font-mono">
                      {product.price} ج.م
                    </span>
                    {hasDiscount && (
                      <span className="text-sm font-bold text-stone-500 line-through font-mono">
                        {product.originalPrice} ج.م
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-left text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" />
                  <span>دفع عند الاستلام</span>
                </div>
              </div>

              {/* Colors Swatches */}
              {colors.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-stone-300">
                    <span className="font-semibold">
                      اللون المحدد: <strong className="text-amber-400">{currentColor?.name}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {colors.map((color, idx) => {
                      const isSelected = selectedColorIndex === idx;
                      return (
                        <button
                          key={color.name}
                          id={`quick-look-color-${idx}`}
                          type="button"
                          onClick={() => setSelectedColorIndex(idx)}
                          className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                            isSelected
                              ? 'bg-stone-950 border-amber-400 text-white shadow-sm'
                              : 'bg-stone-950/50 border-stone-800 text-stone-400 hover:border-stone-700'
                          }`}
                        >
                          <span
                            className="w-4 h-4 rounded-full border border-stone-700 shrink-0"
                            style={{ backgroundColor: color.hex }}
                          />
                          <span>{color.name}</span>
                          {isSelected && <Check className="w-3 h-3 text-amber-400 mr-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sizes Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-stone-300">
                  <span className="font-semibold">
                    المقاس: <strong className="text-amber-400">{selectedSize}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      closeQuickLook();
                      setIsSizeAdvisorOpen(true);
                    }}
                    className="text-amber-400 hover:text-amber-300 text-[11px] font-bold flex items-center gap-1 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>حاسبة المقاسات الذكية</span>
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {sizes.map((sz) => {
                    const inStock = (product.sizesStock[sz] || 0) > 0;
                    const isSelected = selectedSize === sz;
                    return (
                      <button
                        key={sz}
                        id={`quick-look-size-${sz}`}
                        type="button"
                        disabled={!inStock}
                        onClick={() => setSelectedSize(sz)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 ${
                          isSelected
                            ? 'bg-amber-500 text-black border-amber-500 shadow-md shadow-amber-950/40'
                            : inStock
                            ? 'bg-stone-950 border-stone-800 text-stone-200 hover:border-stone-600'
                            : 'bg-stone-950/30 border-stone-900 text-stone-600 line-through cursor-not-allowed'
                        }`}
                      >
                        <span>{sz}</span>
                        <span className="text-[9px] font-normal opacity-80">
                          {inStock ? 'متوفر' : 'نفد'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantity Counter */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-stone-300 font-semibold">الكمية المطلوبة:</span>
                <div className="flex items-center gap-3 bg-stone-950 border border-stone-800 rounded-xl p-1 px-2">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="w-7 h-7 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-200 flex items-center justify-center disabled:opacity-40 transition-colors"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-sm text-stone-100 min-w-[20px] text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(currentStock || 10, q + 1))}
                    disabled={quantity >= currentStock}
                    className="w-7 h-7 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-200 flex items-center justify-center disabled:opacity-40 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="space-y-2.5 pt-3 border-t border-stone-800">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  id="quick-look-add-to-cart-btn"
                  type="button"
                  disabled={isOutOfStock}
                  onClick={handleAddToCart}
                  className="py-3 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 active:bg-stone-800 text-stone-100 border border-stone-700 text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingBag className="w-4 h-4 text-amber-400" />
                  <span>{isOutOfStock ? 'نفد من المخزن' : 'أضف للسلة'}</span>
                </button>

                <button
                  id="quick-look-buy-now-btn"
                  type="button"
                  disabled={isOutOfStock}
                  onClick={handleBuyNow}
                  className="py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black text-xs font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-950/40 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Zap className="w-4 h-4 fill-black" />
                  <span>{isOutOfStock ? 'غير متاح' : 'شراء فوري'}</span>
                </button>
              </div>

              {/* View Full Product Page Shortcut */}
              <button
                id="quick-look-view-full-page-btn"
                type="button"
                onClick={handleNavigateToFullPage}
                className="w-full py-2.5 rounded-xl bg-stone-950/80 hover:bg-stone-950 text-stone-400 hover:text-amber-400 border border-stone-800/80 text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <span>عرض صفحة المنتج الكاملة والمقاسات التفصيلية</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
