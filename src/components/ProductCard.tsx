import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Product, HoodieSize } from '../types';
import { Heart, ShoppingBag, Star, Check, Eye } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { setSelectedProduct, setActiveView, addToCart, wishlist, toggleWishlist } = useStore();
  const [chosenSize, setChosenSize] = useState<HoodieSize>('L');
  const [chosenColorIndex, setChosenColorIndex] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const isFav = wishlist.includes(product.id);
  const sizes: HoodieSize[] = ['M', 'L', 'XL', '2XL'];
  const colors = product.colors || [];
  const currentColor = colors[chosenColorIndex] || colors[0];

  React.useEffect(() => {
    if (!isHovered || !product.images || product.images.length <= 1) {
      setActiveImageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % product.images.length);
    }, 1100);
    return () => clearInterval(interval);
  }, [isHovered, product.images]);

  const handleCardClick = () => {
    setSelectedProduct(product);
    setActiveView('product');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProduct(product);
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, chosenSize, currentColor?.name, currentColor?.hex, 1);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  return (
    <div
      id={`product-card-${product.id}`}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group bg-stone-900/60 border border-stone-800/80 hover:border-amber-500/50 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-black/70 cursor-pointer relative"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/5] bg-stone-950 overflow-hidden">
        <img
          src={product.images[activeImageIndex] || product.images[0]}
          alt={product.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-all duration-500 transform group-hover:scale-105"
        />

        {/* Multiple Images Dots Indicator */}
        {product.images && product.images.length > 1 && (
          <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1.5 z-10">
            {product.images.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === activeImageIndex
                    ? 'w-4 bg-amber-400'
                    : 'w-1.5 bg-white/40'
                }`}
              />
            ))}
          </div>
        )}

        {/* Badge */}
        {product.badge && (
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-amber-500 text-black text-[11px] font-black shadow-md z-10">
            {product.badge}
          </div>
        )}

        {/* Action Buttons: Wishlist & Quick View */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          <button
            id={`wishlist-btn-${product.id}`}
            type="button"
            onClick={handleToggleWishlist}
            className={`p-2 rounded-xl backdrop-blur-md border transition-all ${
              isFav
                ? 'bg-rose-950/80 border-rose-800/60 text-rose-400'
                : 'bg-stone-950/70 border-stone-800 text-stone-300 hover:text-white hover:border-stone-600'
            }`}
            title={isFav ? 'إزالة من المفضلة' : 'حفظ في المفضلة'}
          >
            <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-400' : ''}`} />
          </button>

          <button
            id={`quick-view-btn-${product.id}`}
            type="button"
            onClick={handleQuickView}
            className="p-2 rounded-xl backdrop-blur-md border bg-stone-950/70 border-stone-800 text-stone-300 hover:text-amber-400 hover:border-amber-500/50 hover:bg-stone-900/90 transition-all shadow-md group/btn"
            title="عرض سريع للمنتج"
            aria-label="عرض سريع"
          >
            <Eye className="w-4 h-4 transition-transform group-hover/btn:scale-110" />
          </button>
        </div>

        {/* Rating Floating Tag */}
        <div className="absolute bottom-3 right-3 bg-stone-950/80 backdrop-blur-sm border border-stone-800 px-2 py-0.5 rounded-lg flex items-center gap-1 text-[11px] text-stone-300 z-10">
          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
          <span className="font-bold">{product.rating}</span>
        </div>
      </div>

      {/* Product Information */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <span className="text-[11px] font-bold text-amber-500/90 uppercase tracking-wider block mb-1">
            {product.subtitle}
          </span>
          <h3 className="text-sm font-bold text-stone-100 line-clamp-1 group-hover:text-amber-300 transition-colors">
            {product.name}
          </h3>
        </div>

        {/* Sizes and Colors Section (Side-by-side as requested) */}
        <div className="space-y-2 pt-1 border-t border-stone-800/50">
          {/* Sizes Row */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-stone-400 mb-1">
              <span>المقاس: <span className="text-amber-400 font-bold">{chosenSize}</span></span>
              {product.sizesStock[chosenSize] > 0 && product.sizesStock[chosenSize] < 5 && (
                <span className="text-[10px] text-amber-400 font-bold animate-pulse">
                  متبقي {product.sizesStock[chosenSize]} فقط!
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-1">
              {sizes.map((sz) => {
                const inStock = (product.sizesStock[sz] || 0) > 0;
                const isSelected = chosenSize === sz;

                return (
                  <button
                    key={sz}
                    id={`card-${product.id}-size-${sz}`}
                    type="button"
                    disabled={!inStock}
                    onClick={(e) => {
                      e.stopPropagation();
                      setChosenSize(sz);
                    }}
                    className={`py-1 rounded-md text-[11px] font-bold border transition-all ${
                      isSelected
                        ? 'bg-amber-500 text-black border-amber-500'
                        : inStock
                        ? 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
                        : 'bg-stone-950/30 border-stone-900 text-stone-600 line-through cursor-not-allowed'
                    }`}
                  >
                    {sz}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Colors Row (Icons/swatches next to sizes) */}
          {colors.length > 0 && (
            <div>
              <div className="flex items-center justify-between text-[11px] text-stone-400 mb-1">
                <span>اللون: <span className="text-stone-300 font-medium">{currentColor?.name}</span></span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {colors.map((clr, idx) => {
                  const isSelected = chosenColorIndex === idx;
                  return (
                    <button
                      key={clr.name}
                      id={`card-${product.id}-color-${idx}`}
                      type="button"
                      title={clr.name}
                      onClick={(e) => {
                        e.stopPropagation();
                        setChosenColorIndex(idx);
                      }}
                      className={`relative w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${
                        isSelected
                          ? 'border-amber-400 scale-110 shadow-sm shadow-amber-950/60'
                          : 'border-stone-700 hover:border-stone-500 opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: clr.hex }}
                    >
                      {isSelected && (
                        <Check className="w-3 h-3 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Pricing and Action */}
        <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-black text-amber-400 font-mono">
                {product.price} ج.م
              </span>
              {product.originalPrice != null && product.originalPrice > product.price && (
                <span className="text-xs font-bold text-stone-500 line-through font-mono">
                  {product.originalPrice}
                </span>
              )}
            </div>
          </div>

          <button
            id={`quick-add-${product.id}`}
            type="button"
            onClick={handleQuickAdd}
            className="py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-amber-950/40"
            title="إضافة سريعة إلى السلة"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>أضف للسلة</span>
          </button>
        </div>
      </div>
    </div>
  );
};
