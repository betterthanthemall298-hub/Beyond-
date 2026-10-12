import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { isComingSoon } from '../utils/product';
import { HoodieSize } from '../types';
import {
  ArrowRight,
  ShoppingBag,
  Heart,
  Check,
  Package,
  Share2,
  Palette,
  Tag
} from 'lucide-react';
import { ProductCard } from './ProductCard';

export const ProductDetailPage: React.FC = () => {
  const {
    selectedProduct,
    setSelectedProduct,
    addToCart,
    wishlist,
    toggleWishlist,
    setActiveView,
    openShareModal,
    addToast,
    products,
    setIsCartOpen
  } = useStore();

  // If no product is selected, fallback gracefully
  const product = selectedProduct || products[0];

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<HoodieSize>('L');
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

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
  const totalStock = sizes.reduce((sum, sz) => sum + (Number(product.sizesStock?.[sz]) || 0), 0);
  const isAllOutOfStock = totalStock <= 0;
  const currentStock = Number(product.sizesStock?.[selectedSize]) || 0;
  const isCurrentOutOfStock = currentStock <= 0;

  const colors = product.colors || [];
  const currentColor = colors[selectedColorIndex] || colors[0];

  const handleAddToCart = () => {
    if (isCurrentOutOfStock) return;
    addToCart(
      product,
      selectedSize,
      currentColor?.name,
      currentColor?.hex,
      quantity
    );
  };

  const handleBuyNow = () => {
    if (isCurrentOutOfStock) return;
    addToCart(
      product,
      selectedSize,
      currentColor?.name,
      currentColor?.hex,
      quantity
    );
    setIsCartOpen(true);
  };

  // Recommended Products: other products in the store
  const relatedProducts = products
    .filter((p) => p.id !== product.id && !isComingSoon(p))
    .slice(0, 3);

  const subtotal = (product.price || 0) * quantity;

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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start mb-16">
        {/* Gallery Column (6 cols) - Encased in a beautiful organized Card */}
        <div className="lg:col-span-6">
          <div className="bg-stone-900/60 border border-stone-800/90 rounded-3xl p-4 sm:p-5 shadow-2xl backdrop-blur-sm space-y-4">
            {/* Main Large Image Container */}
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-stone-950 border border-stone-800 shadow-inner group">
              <img
                src={product.images[activeImageIndex] || product.images[0]}
                alt={product.name}
                loading="eager"
                decoding="async"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />

              {product.badge && (
                <div className="absolute top-4 right-4 px-3.5 py-1.5 rounded-xl bg-amber-500 text-black text-xs font-black shadow-lg">
                  {product.badge}
                </div>
              )}

              {/* Wishlist Button */}
              <button
                id="product-page-wishlist-toggle"
                type="button"
                onClick={() => toggleWishlist(product.id)}
                className={`absolute top-4 left-4 p-3 rounded-2xl backdrop-blur-md border transition-all ${
                  isFav
                    ? 'bg-rose-950/80 border-rose-800 text-rose-400'
                    : 'bg-stone-950/70 border-stone-800 text-stone-300 hover:text-white'
                }`}
                title="إضافة للمفضلة"
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

            {/* Thumbnail Strip inside the Gallery Card */}
            {product.images.length > 1 && (
              <div className="pt-1">
                <div className="text-[11px] text-stone-400 font-medium mb-2 flex items-center justify-between">
                  <span>صور تفاصيل الهودي ({product.images.length} صور)</span>
                  <span className="text-stone-500 text-[10px]">اضغط على الصورة للتكبير</span>
                </div>
                <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-20 h-24 rounded-xl overflow-hidden border-2 transition-all shrink-0 bg-stone-950 ${
                        activeImageIndex === idx
                          ? 'border-amber-500 shadow-md shadow-amber-950/50 scale-105 ring-2 ring-amber-500/30'
                          : 'border-stone-800 opacity-60 hover:opacity-100 hover:border-stone-700'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${product.name} - ${idx + 1}`}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Product Details & Purchase Controls (6 cols) - Organized in Neat Distinct Boxes */}
        <div className="lg:col-span-6 space-y-4 sm:space-y-5">
          {/* Box 1: Product Information & Pricing Card */}
          <div className="bg-stone-900/60 border border-stone-800/90 rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-block px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                  {product.subtitle || 'هودي شتوي فاخر'}
                </span>
                {product.fit && (
                  <span className="inline-block px-2.5 py-0.5 rounded-lg bg-stone-800/80 text-stone-300 text-xs font-medium">
                    {product.fit}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-stone-100 leading-tight">
                {product.name}
              </h1>
            </div>

            {/* Pricing Box Container */}
            <div className="bg-stone-950/80 border border-stone-800/80 rounded-xl p-3.5 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[11px] text-stone-400 block">سعر القطعة</span>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-black text-amber-400 font-mono">
                    {product.price} ج.م
                  </span>
                  {product.originalPrice != null && product.originalPrice > product.price && (
                    <span className="text-sm font-bold text-stone-500 line-through font-mono">
                      {product.originalPrice} ج.م
                    </span>
                  )}
                </div>
              </div>

              {product.originalPrice != null && product.originalPrice > product.price && (
                <div className="text-left">
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-1 rounded-lg inline-block">
                    وفرت {product.originalPrice - product.price} ج.م
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed pt-1">
              {product.description}
            </p>
          </div>

          {/* Box 2: Color Selection Card (if colors exist) */}
          {colors.length > 0 && (
            <div className="bg-stone-900/60 border border-stone-800/90 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-200 font-bold flex items-center gap-2">
                  <Palette className="w-4 h-4 text-amber-400" />
                  <span>الألوان المتوفرة:</span>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs">
                  {currentColor?.name}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {colors.map((clr, idx) => {
                  const isSelected = selectedColorIndex === idx;
                  return (
                    <button
                      key={clr.name}
                      type="button"
                      onClick={() => setSelectedColorIndex(idx)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-all text-right ${
                        isSelected
                          ? 'bg-stone-800 border-amber-500 shadow-md shadow-amber-950/40 ring-1 ring-amber-500/40'
                          : 'bg-stone-950/80 border-stone-800 hover:border-stone-700 text-stone-300'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-stone-600 inline-block shadow-inner shrink-0"
                        style={{ backgroundColor: clr.hex }}
                      />
                      <span className="text-xs font-bold text-stone-200 truncate flex-1">{clr.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Box 3: Size Selection Card */}
          <div className="bg-stone-900/60 border border-stone-800/90 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-200 font-bold flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-400" />
                <span>المقاس المطلوب:</span>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs">
                المقاس المختار: {selectedSize}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2.5">
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
                    className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? 'bg-amber-500 text-black border-amber-400 shadow-lg shadow-amber-950/50 scale-[1.02]'
                        : isAvailable
                        ? 'bg-stone-950/80 border-stone-800 text-stone-300 hover:border-stone-700 hover:bg-stone-800/60'
                        : 'bg-stone-950/40 border-stone-900 text-stone-600 line-through cursor-not-allowed opacity-60'
                    }`}
                  >
                    <span className="text-sm font-black">{sz}</span>
                    <span
                      className={`text-[10px] font-medium leading-none ${
                        isSelected
                          ? 'text-black/80 font-bold'
                          : !isAvailable
                          ? 'text-stone-600'
                          : stock < 5
                          ? 'text-amber-400'
                          : 'text-stone-400'
                      }`}
                    >
                      {!isAvailable
                        ? 'نفد'
                        : stock < 5
                        ? `باقي ${stock}`
                        : 'متوفر'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Low stock or Out of Stock Alert Box */}
            {isAllOutOfStock ? (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <span>نفدت كمية هذا المنتج بالكامل حالياً. تواصل معنا لتأكيد إعادة التوفر قريباً!</span>
              </div>
            ) : isCurrentOutOfStock ? (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <span>المقاس المختار ({selectedSize}) نفد حالياً، يرجى اختيار مقاس آخر متوفر.</span>
              </div>
            ) : currentStock > 0 && currentStock < 5 ? (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <span>سارع بالطلب، متبقي <strong className="font-mono font-bold text-amber-200">{currentStock} قطع فقط</strong> في المخزون!</span>
              </div>
            ) : null}
          </div>

          {/* Box 4: Quantity Selection & Order Action Card */}
          <div className="bg-stone-900/80 border-2 border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 ring-1 ring-amber-500/10">
            {/* Quantity Stepper Row */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-800/80">
              <span className="text-xs font-bold text-stone-200">الكمية المطلوبة:</span>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-stone-950 border border-stone-800 rounded-xl p-1">
                  <button
                    type="button"
                    disabled={isCurrentOutOfStock}
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-lg hover:bg-stone-800 text-stone-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center text-sm font-bold transition-colors"
                  >
                    -
                  </button>
                  <span className="w-9 text-center text-xs font-mono font-bold text-stone-100">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    disabled={isCurrentOutOfStock || quantity >= currentStock}
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 rounded-lg hover:bg-stone-800 text-stone-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center text-sm font-bold transition-colors"
                  >
                    +
                  </button>
                </div>

                <div className="text-left font-mono">
                  <span className="text-[11px] text-stone-400 block leading-tight">الإجمالي</span>
                  <span className="text-sm font-black text-amber-400">{subtotal.toLocaleString()} ج.م</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              {/* Primary Add to Cart Button */}
              <button
                id="product-page-add-to-cart-btn"
                type="button"
                disabled={isCurrentOutOfStock}
                onClick={handleAddToCart}
                className={`w-full py-3.5 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
                  isAllOutOfStock
                    ? 'bg-stone-800 text-stone-500 border border-stone-700/50 cursor-not-allowed'
                    : isCurrentOutOfStock
                    ? 'bg-stone-800 text-stone-500 border border-stone-700/50 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black shadow-amber-950/40 hover:scale-[1.01]'
                }`}
              >
                <ShoppingBag className="w-5 h-5" />
                <span>
                  {isAllOutOfStock
                    ? 'نفدت كمية المنتج بالكامل'
                    : isCurrentOutOfStock
                    ? `المقاس (${selectedSize}) غير متوفر حالياً`
                    : 'أضف إلى السلة'}
                </span>
              </button>

              {/* Fast Direct Order / Buy Now Button */}
              {!isCurrentOutOfStock && (
                <button
                  id="product-page-buy-now-btn"
                  type="button"
                  onClick={handleBuyNow}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-stone-950 hover:bg-stone-800 border border-stone-700 text-stone-200 hover:text-white flex items-center justify-center gap-2 transition-all"
                >
                  <Package className="w-4 h-4 text-amber-400" />
                  <span>شراء فوري ومتابعة السلة</span>
                </button>
              )}
            </div>
          </div>
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
