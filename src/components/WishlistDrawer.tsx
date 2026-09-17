import React from 'react';
import { useStore } from '../store/useStore';
import { X, Heart, Trash2, ShoppingBag } from 'lucide-react';

export const WishlistDrawer: React.FC = () => {
  const {
    isWishlistOpen,
    setIsWishlistOpen,
    wishlist,
    products,
    removeFromWishlist,
    addToCart,
    setSelectedProduct,
    openDeleteModal
  } = useStore();

  if (!isWishlistOpen) return null;

  const wishlistProducts = products.filter((p) => wishlist.includes(p.id));

  const handleDeleteWishlistItemPrompt = (productId: string, productName: string) => {
    openDeleteModal({
      title: 'حذف من قائمة المفضلة',
      description: 'هل تريد إزالة هذا الهودي من قائمة رغباتك المفضلة؟',
      itemLabel: productName,
      onConfirm: () => {
        removeFromWishlist(productId);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="wishlist-drawer-panel"
        className="w-full max-w-md bg-stone-950 border-r border-stone-800 h-full flex flex-col shadow-2xl relative animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-800/80 flex items-center justify-between bg-stone-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-950/40 border border-rose-800/40 flex items-center justify-center text-rose-400">
              <Heart className="w-5 h-5 fill-rose-400/20" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-100">قائمة المفضلة</h2>
              <p className="text-xs text-stone-400">
                {wishlistProducts.length > 0
                  ? `${wishlistProducts.length} قطع محفوظة`
                  : 'لا توجد عناصر مفضلة'}
              </p>
            </div>
          </div>

          <button
            id="close-wishlist-drawer-btn"
            onClick={() => setIsWishlistOpen(false)}
            className="text-stone-400 hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {wishlistProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-600">
                <Heart className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-200">قائمة أمنياتك فارغة</h3>
                <p className="text-xs text-stone-500 mt-1 max-w-xs">
                  اضغط على أيقونة القلب على أي هودي لحفظه والرجوع إليه في أي وقت.
                </p>
              </div>
            </div>
          ) : (
            wishlistProducts.map((product) => (
              <div
                key={product.id}
                id={`wishlist-item-${product.id}`}
                className="bg-stone-900/80 border border-stone-800 rounded-xl p-3 flex gap-3 group relative"
              >
                <div
                  className="w-20 h-24 rounded-lg bg-stone-950 overflow-hidden border border-stone-800 shrink-0 cursor-pointer"
                  onClick={() => {
                    setSelectedProduct(product);
                    setIsWishlistOpen(false);
                  }}
                >
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <h4
                        className="text-xs sm:text-sm font-bold text-stone-200 line-clamp-1 cursor-pointer hover:text-amber-400 transition-colors"
                        onClick={() => {
                          setSelectedProduct(product);
                          setIsWishlistOpen(false);
                        }}
                      >
                        {product.name}
                      </h4>

                      {/* Delete from Wishlist Button */}
                      <button
                        id={`delete-wishlist-item-${product.id}`}
                        type="button"
                        onClick={() => handleDeleteWishlistItemPrompt(product.id, product.name)}
                        className="text-rose-400 hover:text-rose-300 bg-rose-950/20 hover:bg-rose-950/60 p-1.5 rounded-lg border border-rose-900/30 transition-all"
                        title="حذف من المفضلة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs font-bold text-amber-400 font-mono mt-1">
                      {product.price} ج.م
                    </p>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      id={`add-to-cart-from-wishlist-${product.id}`}
                      type="button"
                      onClick={() => {
                        addToCart(product, 'L', product.colors[0]?.name, product.colors[0]?.hex, 1);
                      }}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>إضافة سريعة (L)</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
