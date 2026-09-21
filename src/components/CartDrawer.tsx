import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  X,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  Tag,
  Check,
  ShieldCheck,
  Truck
} from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const {
    isCartOpen,
    setIsCartOpen,
    cart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    appliedCoupon,
    applyCoupon,
    removeAppliedCoupon,
    getCartSubtotal,
    getCartDiscount,
    setIsCheckoutOpen,
    openDeleteModal
  } = useStore();

  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponError, setCouponError] = useState('');

  if (!isCartOpen) return null;

  const subtotal = getCartSubtotal();
  const discount = getCartDiscount();
  const estimatedTotal = Math.max(0, subtotal - discount);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCodeInput.trim()) return;
    setCouponError('');
    const res = applyCoupon(couponCodeInput);
    if (!res.success) {
      setCouponError(res.message);
    } else {
      setCouponCodeInput('');
    }
  };

  const handleClearCartPrompt = () => {
    openDeleteModal({
      title: 'تفريغ سلة المشتريات بالكامل',
      description: 'هل تريد حقاً إزالة جميع قطع الهوديز الموجودة في سلتك؟',
      itemLabel: `عدد العناصر: ${cart.length} قطعة`,
      onConfirm: () => {
        clearCart();
      }
    });
  };

  const handleDeleteItemPrompt = (itemId: string, productName: string, size: string) => {
    openDeleteModal({
      title: 'حذف هذا الهودي من السلة',
      description: 'هل أنت متأكد من رغبتك في حذف هذا الهودي من سلة التسوق؟',
      itemLabel: `${productName} - مقاس (${size})`,
      onConfirm: () => {
        removeFromCart(itemId);
      }
    });
  };

  const handleProceedToCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        id="cart-drawer-panel"
        className="w-full max-w-md bg-stone-950 border-r border-stone-800 h-full flex flex-col shadow-2xl relative animate-in slide-in-from-right duration-300"
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-stone-800/80 flex items-center justify-between bg-stone-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-950/40 border border-amber-800/40 flex items-center justify-center text-amber-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-100">سلة المشتريات</h2>
              <p className="text-xs text-stone-400">
                {cart.length > 0 ? `${cart.length} قطع في انتظارك` : 'سلتك فارغة'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                id="clear-all-cart-btn"
                type="button"
                onClick={handleClearCartPrompt}
                className="text-xs text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/40 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                title="تفريغ السلة بالكامل"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>تفريغ السلة</span>
              </button>
            )}
            <button
              id="close-cart-drawer-btn"
              onClick={() => setIsCartOpen(false)}
              className="text-stone-400 hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-800 transition-colors"
              aria-label="إغلاق السلة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Free shipping progress hint */}
        <div className="bg-stone-900/40 px-4 py-2 border-b border-stone-800/60 flex items-center justify-between text-xs text-stone-300">
          <div className="flex items-center gap-1.5 text-amber-400 font-medium">
            <Truck className="w-4 h-4" />
            <span>شحن لجميع المحافظات الـ 27</span>
          </div>
          <span className="text-stone-400">معاينة قبل الدفع عند الاستلام</span>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-600">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-200">سلتك لا تزال فارغة</h3>
                <p className="text-xs text-stone-500 mt-1 max-w-xs">
                  تصفح تشكيلة الهوديز الشتوية الأوفر سايز الفاخرة واختر ما يناسب ذوقك.
                </p>
              </div>
              <button
                id="browse-hoodies-from-cart-btn"
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-colors"
              >
                تصفح الهوديز الآن
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                id={`cart-item-${item.id}`}
                className="bg-stone-900/80 border border-stone-800/90 rounded-xl p-3 flex gap-3 relative group hover:border-stone-700/80 transition-all"
              >
                {/* Product Thumbnail */}
                <div className="w-20 h-24 rounded-lg bg-stone-950 overflow-hidden border border-stone-800 shrink-0 relative">
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1 right-1 bg-stone-900/90 text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-stone-800">
                    {item.size}
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-stone-200 line-clamp-1">
                        {item.product.name}
                      </h4>

                      {/* Explicit Delete Button */}
                      <button
                        id={`delete-cart-item-${item.id}`}
                        type="button"
                        onClick={() => handleDeleteItemPrompt(item.id, item.product.name, item.size)}
                        className="text-rose-400/90 hover:text-rose-300 bg-rose-950/20 hover:bg-rose-950/60 p-1.5 rounded-lg border border-rose-900/30 transition-all"
                        title="حذف هذا المنتج من السلة"
                        aria-label="حذف هذا المنتج من السلة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-[11px] text-stone-400 mt-0.5">
                      المقاس المختار: <span className="text-amber-400 font-semibold">{item.size}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-800/60">
                    {/* Quantity controls */}
                    <div className="flex items-center gap-1.5 bg-stone-950 px-2 py-1 rounded-lg border border-stone-800">
                      <button
                        id={`decrease-qty-${item.id}`}
                        type="button"
                        onClick={() => {
                          if (item.quantity === 1) {
                            handleDeleteItemPrompt(item.id, item.product.name, item.size);
                          } else {
                            updateCartQuantity(item.id, item.quantity - 1);
                          }
                        }}
                        className="text-stone-400 hover:text-stone-100 p-0.5"
                        title={item.quantity === 1 ? 'حذف من السلة' : 'تقليل الكمية'}
                      >
                        {item.quantity === 1 ? (
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        ) : (
                          <Minus className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <span className="text-xs font-mono font-bold text-stone-200 px-1.5 min-w-[20px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        id={`increase-qty-${item.id}`}
                        type="button"
                        onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                        className="text-stone-400 hover:text-stone-100 p-0.5"
                        title="زيادة الكمية"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Price */}
                    <div className="text-left">
                      <span className="text-sm font-bold text-amber-400 font-mono">
                        {item.product.price * item.quantity} ج.م
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer (Coupons, Totals, Checkout) */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-stone-800 bg-stone-900/90 space-y-3">
            {/* Coupon Section */}
            <div>
              {appliedCoupon ? (
                <div
                  id="applied-coupon-pill"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-bold text-amber-300">{appliedCoupon.code}</span>
                      <span className="text-stone-400 mr-2">
                        (خصم {appliedCoupon.discountPercent}%
                        {appliedCoupon.targetProductName ? ` على ${appliedCoupon.targetProductName}` : ''})
                      </span>
                    </div>
                  </div>

                  {/* Delete / Remove Applied Coupon Button */}
                  <button
                    id="remove-applied-coupon-btn"
                    type="button"
                    onClick={removeAppliedCoupon}
                    className="text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 p-1 rounded-lg border border-rose-800/40 transition-colors"
                    title="حذف كود الخصم"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      id="cart-coupon-input"
                      type="text"
                      placeholder="أدخل كود الخصم (مثال: WINTER20)"
                      value={couponCodeInput}
                      onChange={(e) => setCouponCodeInput(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <button
                    id="apply-coupon-btn"
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold border border-stone-700 transition-colors"
                  >
                    تطبيق
                  </button>
                </form>
              )}
              {couponError && (
                <p className="text-[11px] text-rose-400 mt-1.5 pr-1">{couponError}</p>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-1.5 text-xs text-stone-400 border-t border-stone-800/80 pt-3">
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <span className="font-mono text-stone-200">{subtotal} ج.م</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-400 font-medium">
                  <span>
                    خصم الكوبون ({appliedCoupon?.code}
                    {appliedCoupon?.targetProductName ? ` - خاص بهودي ${appliedCoupon.targetProductName}` : ''}):
                  </span>
                  <span className="font-mono">-{discount} ج.م</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>الشحن:</span>
                <span className="text-amber-400 text-[11px]">يحدد حسب المحافظة في الخطوة التالية</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-stone-100 border-t border-stone-800 pt-2 mt-2">
                <span>الإجمالي التقريبي:</span>
                <span className="text-amber-400 font-mono text-base">{estimatedTotal} ج.م</span>
              </div>
            </div>

            {/* Checkout Action Button */}
            <button
              id="proceed-to-checkout-btn"
              type="button"
              onClick={handleProceedToCheckout}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-950/40"
            >
              <span>متابعة إتمام الطلب</span>
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-2 text-[11px] text-stone-500 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>دفع عند الاستلام مع حق الفتح والمعاينة قبل الاستلام</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
