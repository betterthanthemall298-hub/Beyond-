import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Tag,
  ShieldCheck,
  Truck,
  RotateCcw,
  CheckCircle2,
  X
} from 'lucide-react';

export const CartPage: React.FC = () => {
  const {
    cart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    getCartSubtotal,
    getCartDiscount,
    appliedCoupon,
    applyCoupon,
    removeAppliedCoupon,
    setActiveView,
    setIsCheckoutOpen,
    openDeleteModal
  } = useStore();

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

  const subtotal = getCartSubtotal();
  const discount = getCartDiscount();
  const total = Math.max(0, subtotal - discount);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    if (!couponInput.trim()) return;

    const res = applyCoupon(couponInput.trim());
    if (!res.success) {
      setCouponError(res.message);
    } else {
      setCouponInput('');
    }
  };

  const handleRemoveItemPrompt = (itemId: string, productName: string, size: string) => {
    openDeleteModal({
      title: 'حذف المنتج من السلة',
      description: 'هل أنت متأكد من حذف هذه القطعة من سلة المشتريات الخاصة بك؟',
      itemLabel: `${productName} (مقاس ${size})`,
      onConfirm: () => {
        removeFromCart(itemId);
      }
    });
  };

  const handleClearCartPrompt = () => {
    openDeleteModal({
      title: 'تفريغ السلة بالكامل',
      description: 'هل تريد حذف جميع المنتجات الموجودة في سلة المشتريات؟',
      itemLabel: `${cart.length} منتجات في السلة`,
      onConfirm: () => {
        clearCart();
      }
    });
  };

  return (
    <div id="cart-page-container" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-500 mb-1">
            <button
              type="button"
              onClick={() => setActiveView('home')}
              className="hover:text-amber-400 transition-colors"
            >
              الرئيسية
            </button>
            <span>/</span>
            <span className="text-stone-300">سلة المشتريات</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-stone-100 flex items-center gap-3">
            <span>سلة مشترياتك</span>
            {cart.length > 0 && (
              <span className="text-sm font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                {cart.length} منتجات
              </span>
            )}
          </h1>
        </div>

        <button
          id="continue-shopping-btn"
          type="button"
          onClick={() => setActiveView('catalog')}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-white text-xs font-bold transition-all shadow-sm"
        >
          <ArrowRight className="w-4 h-4 text-amber-400" />
          <span>متابعة تصفح الهوديز</span>
        </button>
      </div>

      {cart.length === 0 ? (
        /* Empty Cart State */
        <div className="bg-stone-900/40 border border-stone-800 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-5 shadow-2xl">
          <div className="w-20 h-20 rounded-3xl bg-stone-950 border border-stone-800 text-stone-600 flex items-center justify-center mx-auto shadow-inner">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-100">سلة المشتريات فارغة حالياً</h2>
            <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto leading-relaxed">
              لم تقم بإضافة أي هودي حتى الآن. تصفح تشكيلة الهوديز الأوفر سايز واختر قطعتك الشتوية المفضلة.
            </p>
          </div>
          <button
            id="empty-cart-browse-btn"
            type="button"
            onClick={() => setActiveView('catalog')}
            className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold text-xs transition-colors shadow-lg shadow-amber-950/40"
          >
            تصفح كولكشن الهوديز الآن
          </button>
        </div>
      ) : (
        /* Cart Full Page Content Grid */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Items List (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-stone-400">القطع المحددة في طلبك</span>
              <button
                id="cart-clear-all-btn"
                type="button"
                onClick={handleClearCartPrompt}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 hover:underline"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>تفريغ السلة بالكامل</span>
              </button>
            </div>

            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.id}
                  id={`cart-page-item-${item.id}`}
                  className="bg-stone-900/70 border border-stone-800/90 hover:border-stone-700/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all shadow-md"
                >
                  {/* Thumbnail & Info */}
                  <div className="flex items-center gap-4 min-w-0">
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      referrerPolicy="no-referrer"
                      className="w-20 h-24 sm:w-22 sm:h-26 rounded-xl object-cover border border-stone-800 bg-stone-950 shrink-0"
                    />

                    <div className="min-w-0 space-y-1">
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">
                        {item.product.subtitle}
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-stone-100 truncate">
                        {item.product.name}
                      </h3>

                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-stone-950 border border-stone-800 text-stone-300 font-bold">
                          المقاس: <span className="text-amber-400">{item.size}</span>
                        </span>

                        {item.colorName && (
                          <span className="px-2 py-0.5 rounded-md bg-stone-950 border border-stone-800 text-stone-300 flex items-center gap-1.5">
                            {item.colorHex && (
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-stone-600 inline-block"
                                style={{ backgroundColor: item.colorHex }}
                              />
                            )}
                            <span>اللون: {item.colorName}</span>
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-amber-400 font-mono font-bold pt-1">
                        {item.product.price} ج.م للقطعة
                      </div>
                    </div>
                  </div>

                  {/* Quantity & Item Subtotal & Delete */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t sm:border-t-0 border-stone-800 pt-3 sm:pt-0">
                    {/* Quantity Controls */}
                    <div className="flex items-center bg-stone-950 border border-stone-800 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center transition-colors"
                        title="إنقاص الكمية"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-mono font-bold text-stone-200">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white flex items-center justify-center transition-colors"
                        title="زيادة الكمية"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Subtotal */}
                    <div className="text-left font-mono">
                      <span className="text-base font-black text-amber-400">
                        {item.product.price * item.quantity} ج.م
                      </span>
                    </div>

                    {/* Delete Item Button */}
                    <button
                      id={`cart-delete-item-btn-${item.id}`}
                      type="button"
                      onClick={() => handleRemoveItemPrompt(item.id, item.product.name, item.size)}
                      className="p-2 rounded-xl text-stone-500 hover:text-rose-400 bg-stone-950 hover:bg-rose-950/30 border border-stone-800 hover:border-rose-800/40 transition-colors"
                      title="حذف هذا المنتج"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Shopping Guarantees */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
              <div className="p-3.5 rounded-xl bg-stone-950/60 border border-stone-800 text-xs text-stone-300 flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
                <span>دفع كاش عند الاستلام</span>
              </div>
              <div className="p-3.5 rounded-xl bg-stone-950/60 border border-stone-800 text-xs text-stone-300 flex items-center gap-2.5">
                <Truck className="w-4 h-4 text-amber-500 shrink-0" />
                <span>حق فتح الشحنة والمعاينة</span>
              </div>
              <div className="p-3.5 rounded-xl bg-stone-950/60 border border-stone-800 text-xs text-stone-300 flex items-center gap-2.5">
                <RotateCcw className="w-4 h-4 text-amber-500 shrink-0" />
                <span>استبدال مقاس خلال 14 يوماً</span>
              </div>
            </div>
          </div>

          {/* Order Summary & Checkout Card (4 cols) */}
          <div className="lg:col-span-4 bg-stone-900/80 border border-stone-800 rounded-3xl p-6 space-y-6 shadow-2xl sticky top-24">
            <h2 className="text-lg font-bold text-stone-100 border-b border-stone-800 pb-3">
              ملخص الحساب
            </h2>

            {/* Promo Code Input */}
            <div>
              <label className="block text-xs text-stone-400 mb-1.5 font-medium">
                كوبون الخصم الترويجي:
              </label>

              {appliedCoupon ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>الكوبون {appliedCoupon.code} (خصم {appliedCoupon.discountPercent}%)</span>
                  </div>
                  <button
                    type="button"
                    onClick={removeAppliedCoupon}
                    className="text-stone-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      id="cart-coupon-input"
                      type="text"
                      placeholder="أدخل الكود (مثل: WINTER20)"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-400 uppercase placeholder-stone-600 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      id="cart-apply-coupon-btn"
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-colors"
                    >
                      تطبيق
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-[11px] text-rose-400">{couponError}</p>
                  )}
                </form>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-3 text-xs border-t border-stone-800 pt-4">
              <div className="flex justify-between text-stone-400">
                <span>المجموع الفرعي:</span>
                <span className="font-mono text-stone-200 font-bold">{subtotal} ج.م</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>الخصم ({appliedCoupon?.code}):</span>
                  <span className="font-mono">-{discount} ج.م</span>
                </div>
              )}

              <div className="flex justify-between text-stone-400">
                <span>الشحن والتوصيل:</span>
                <span className="text-stone-300">يُحسب عند اختيار المحافظة</span>
              </div>

              <div className="flex justify-between items-baseline text-stone-100 text-base font-black border-t border-stone-800 pt-3">
                <span>الإجمالي التقريبي:</span>
                <span className="text-xl font-mono text-amber-400">{total} ج.م</span>
              </div>
            </div>

            {/* Checkout Action Button */}
            <button
              id="cart-proceed-to-checkout-btn"
              type="button"
              onClick={() => setIsCheckoutOpen(true)}
              className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-amber-950/50"
            >
              <ShoppingBag className="w-5 h-5" />
              <span>متابعة إتمام الطلب والدفع</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
