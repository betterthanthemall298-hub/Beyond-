import React from 'react';
import { useStore } from '../store/useStore';
import { ProductCard } from './ProductCard';
import { Heart, ArrowRight, ShoppingBag, Sparkles } from 'lucide-react';

export const WishlistPage: React.FC = () => {
  const { wishlist, products, setActiveView, setSelectedProduct } = useStore();

  const wishlistedProducts = products.filter((p) => wishlist.includes(p.id));
  const suggestedProducts = products.filter((p) => !wishlist.includes(p.id)).length > 0
    ? products.filter((p) => !wishlist.includes(p.id)).slice(0, 3)
    : products.slice(0, 3);

  return (
    <div id="wishlist-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800/80 pb-6 mb-8">
        <div>
          <button
            id="wishlist-back-btn"
            type="button"
            onClick={() => {
              setActiveView('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2 text-xs font-bold text-stone-400 hover:text-white transition-colors mb-2 group"
          >
            <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
            <span>العودة للرئيسية</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-950/40 border border-rose-800/50 flex items-center justify-center text-rose-400 shadow-lg shadow-black/40">
              <Heart className="w-5 h-5 fill-rose-500/30" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-stone-100">
                قائمة رغباتك والمفضلة
              </h1>
              <p className="text-xs text-stone-400 mt-0.5">
                {wishlistedProducts.length > 0
                  ? `لديك ${wishlistedProducts.length} منتج محفوظ في قائمة أمنياتك`
                  : 'قائمتك خالية حالياً'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Wishlist Content */}
      {wishlistedProducts.length === 0 ? (
        <div className="bg-stone-900/40 border border-stone-800 rounded-3xl p-10 sm:p-14 text-center max-w-xl mx-auto space-y-4 mb-14">
          <div className="w-16 h-16 rounded-full bg-stone-950 border border-stone-800 flex items-center justify-center mx-auto text-stone-600">
            <Heart className="w-8 h-8" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-stone-200">
            لم تقم بإضافة أي هودي للمفضلة بعد
          </h2>
          <p className="text-xs sm:text-sm text-stone-400 max-w-md mx-auto leading-relaxed">
            اضغط على علامة القلب في أي منتج لحفظه هنا والرجوع إليه بسهولة لاحقاً لإتمام الشراء.
          </p>
          <button
            id="wishlist-empty-browse-btn"
            type="button"
            onClick={() => {
              setActiveView('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="mt-2 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all shadow-md shadow-amber-950/40"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>تصفح الهوديز الآن</span>
          </button>
        </div>
      ) : (
        <div className="mb-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlistedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}

      {/* "You may also like" Section as explicitly requested */}
      {suggestedProducts.length > 0 && (
        <section id="wishlist-suggested-section" className="border-t border-stone-800/80 pt-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h3 className="text-xl sm:text-2xl font-black text-stone-100">
                منتجات قد تعجبك
              </h3>
            </div>
            <button
              id="wishlist-suggested-all-btn"
              type="button"
              onClick={() => {
                setActiveView('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-xs font-bold text-amber-400 hover:underline"
            >
              عرض تشكيلة المتجر
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {suggestedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
