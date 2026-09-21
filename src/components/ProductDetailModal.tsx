import React, { useState } from 'react';
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
  Info
} from 'lucide-react';

export const ProductDetailModal: React.FC = () => {
  const {
    selectedProduct,
    setSelectedProduct,
    addToCart,
    wishlist,
    toggleWishlist,
    setIsSizeAdvisorOpen,
    activeView,
    setActiveView
  } = useStore();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<HoodieSize>('L');
  const [quantity, setQuantity] = useState(1);

  // If there's no selected product, or if we are already viewing the full product page, do not display the modal
  if (!selectedProduct || activeView === 'product') return null;

  const isFav = wishlist.includes(selectedProduct.id);
  const sizes: HoodieSize[] = ['M', 'L', 'XL', '2XL'];
  const currentStock = selectedProduct.sizesStock[selectedSize] || 0;

  const handleAddToCart = () => {
    const currentColor = selectedProduct.colors?.[0];
    addToCart(selectedProduct, selectedSize, currentColor?.name, currentColor?.hex, quantity);
  };

  const handleGoToFullPage = () => {
    setActiveView('product');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div
        id="product-detail-dialog"
        className="w-full max-w-4xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col relative"
      >
        {/* Header Close Button */}
        <button
          id="close-product-detail-btn"
          onClick={() => setSelectedProduct(null)}
          className="absolute top-4 left-4 z-10 w-9 h-9 rounded-full bg-stone-950/80 border border-stone-700 text-stone-300 hover:text-white flex items-center justify-center transition-colors"
          aria-label="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2">
          {/* Images Section */}
          <div className="p-4 sm:p-6 bg-stone-950 flex flex-col gap-3">
            {/* Main Image */}
            <div className="w-full aspect-[4/5] rounded-xl overflow-hidden bg-stone-900 border border-stone-800 relative group">
              <img
                src={selectedProduct.images[selectedImageIndex] || selectedProduct.images[0]}
                alt={selectedProduct.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-all duration-300"
              />
              {selectedProduct.badge && (
                <div className="absolute top-3 right-3 px-3 py-1 rounded-lg bg-amber-500 text-black text-xs font-bold shadow-md">
                  {selectedProduct.badge}
                </div>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {selectedProduct.images.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {selectedProduct.images.map((img, idx) => (
                  <button
                    key={idx}
                    id={`product-thumb-${idx}`}
                    type="button"
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`w-16 h-20 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                      selectedImageIndex === idx
                        ? 'border-amber-500 scale-105'
                        : 'border-stone-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${selectedProduct.name} ${idx}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Guarantees Box */}
            <div className="grid grid-cols-3 gap-2 pt-2 text-[11px] text-stone-400">
              <div className="bg-stone-900/60 p-2.5 rounded-xl border border-stone-800/80 text-center">
                <Truck className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                <span>شحن لكافة مصر</span>
              </div>
              <div className="bg-stone-900/60 p-2.5 rounded-xl border border-stone-800/80 text-center">
                <ShieldCheck className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                <span>معاينة قبل الاستلام</span>
              </div>
              <div className="bg-stone-900/60 p-2.5 rounded-xl border border-stone-800/80 text-center">
                <RotateCcw className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                <span>استبدال واسترجاع سهل</span>
              </div>
            </div>
          </div>

          {/* Details & Options Section */}
          <div className="p-5 sm:p-7 flex flex-col justify-between space-y-5">
            <div>
              {/* Category & Rating */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  {selectedProduct.subtitle}
                </span>
                <div className="flex items-center gap-1.5 bg-stone-950 px-2 py-1 rounded-lg border border-stone-800">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-xs font-bold text-stone-200">{selectedProduct.rating}</span>
                  <span className="text-[11px] text-stone-500">({selectedProduct.reviewsCount} تقييم)</span>
                </div>
              </div>

              {/* Title */}
              <h2 className="text-xl sm:text-2xl font-bold text-stone-100 leading-snug">
                {selectedProduct.name}
              </h2>

              {/* Price */}
              <div className="flex items-baseline gap-3 mt-3">
                <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
                  {selectedProduct.price} ج.م
                </span>
                {selectedProduct.originalPrice > selectedProduct.price && (
                  <span className="text-sm font-bold text-stone-500 line-through font-mono">
                    {selectedProduct.originalPrice} ج.م
                  </span>
                )}
                {selectedProduct.originalPrice > selectedProduct.price && (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 px-2 py-0.5 rounded-md">
                    وفر {selectedProduct.originalPrice - selectedProduct.price} ج.م
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed mt-4">
                {selectedProduct.description}
              </p>

              {/* Size Selector */}
              <div className="mt-6 pt-5 border-t border-stone-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-200">المقاس:</span>
                    <span className="text-xs font-bold text-amber-400 font-mono">({selectedSize})</span>
                  </div>

                  {/* Size Advisor trigger button */}
                  <button
                    id="open-size-advisor-from-product-btn"
                    type="button"
                    onClick={() => setIsSizeAdvisorOpen(true)}
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1.5 underline decoration-amber-500/50 underline-offset-4 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>ناصح المقاسات الذكي</span>
                  </button>
                </div>

                {/* Size Chips */}
                <div className="grid grid-cols-4 gap-2">
                  {sizes.map((sz) => {
                    const stock = selectedProduct.sizesStock[sz] || 0;
                    const isAvailable = stock > 0;
                    const isSelected = selectedSize === sz;

                    return (
                      <button
                        key={sz}
                        id={`select-size-${sz}`}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => setSelectedSize(sz)}
                        className={`py-3 px-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                          isSelected
                            ? 'bg-amber-500 text-black border-amber-500 font-bold shadow-md shadow-amber-950/30'
                            : isAvailable
                            ? 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700 hover:text-stone-100'
                            : 'bg-stone-950/40 border-stone-900 text-stone-600 cursor-not-allowed line-through'
                        }`}
                      >
                        <span className="text-sm font-bold">{sz}</span>
                        <span className={`text-[10px] ${isSelected ? 'text-stone-900' : 'text-stone-500'}`}>
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
                {currentStock > 0 && currentStock < 5 && (
                  <div className="mt-2.5 flex items-center gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                    <span>سارع بالطلب، متبقي <strong className="font-mono font-bold text-amber-200">{currentStock} قطع فقط</strong> في المخزون!</span>
                  </div>
                )}
              </div>

              {/* Technical Specifications Specs */}
              <div className="mt-5 space-y-2 text-xs bg-stone-950/60 p-3.5 rounded-xl border border-stone-800/80">
                <div className="flex items-start gap-2">
                  <span className="text-stone-400 shrink-0 font-medium">الخامة:</span>
                  <span className="text-stone-200">{selectedProduct.fabric}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-stone-400 shrink-0 font-medium">القصّة:</span>
                  <span className="text-stone-200">{selectedProduct.fit}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-stone-400 shrink-0 font-medium">الوزن المناسب:</span>
                  <span className="text-amber-400">{selectedProduct.weightRange}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-stone-400 shrink-0 font-medium">العناية:</span>
                  <span className="text-stone-300">{selectedProduct.careInstructions}</span>
                </div>
              </div>
            </div>

            {/* Actions (Add to cart & Wishlist) */}
            <div className="pt-4 border-t border-stone-800 flex flex-col gap-2.5">
              <div className="flex items-center gap-3">
                <button
                  id="modal-add-to-cart-btn"
                  type="button"
                  onClick={handleAddToCart}
                  className="flex-1 py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-950/40"
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span>إضافة إلى السلة (مقاس {selectedSize})</span>
                </button>

                <button
                  id="modal-toggle-wishlist-btn"
                  type="button"
                  onClick={() => toggleWishlist(selectedProduct.id)}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isFav
                      ? 'bg-rose-950/60 border-rose-800/60 text-rose-400'
                      : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700'
                  }`}
                  title={isFav ? 'إزالة من المفضلة' : 'حفظ في المفضلة'}
                >
                  <Heart className={`w-5 h-5 ${isFav ? 'fill-rose-400' : ''}`} />
                </button>
              </div>

              <button
                id="modal-view-full-page-btn"
                type="button"
                onClick={handleGoToFullPage}
                className="w-full py-2.5 px-4 rounded-xl bg-stone-950 hover:bg-stone-800/80 border border-stone-800 text-stone-300 hover:text-amber-400 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <span>الانتقال لصفحة تفاصيل المنتج الكاملة</span>
                <span className="text-amber-500 font-bold">←</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
