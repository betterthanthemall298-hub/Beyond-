import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  X,
  Truck,
  ShieldCheck,
  Phone,
  User,
  MapPin,
  FileText,
  ArrowRight,
  Building2
} from 'lucide-react';
import { OrderItem } from '../types';

export const CheckoutModal: React.FC = () => {
  const {
    isCheckoutOpen,
    setIsCheckoutOpen,
    cart,
    governorates,
    appliedCoupon,
    getCartSubtotal,
    getCartDiscount,
    createOrder
  } = useStore();

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [selectedGovernorate, setSelectedGovernorate] = useState('القاهرة');
  const [center, setCenter] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isCheckoutOpen) return null;

  const currentGov = governorates.find((g) => g.name === selectedGovernorate) || governorates[0];
  const shippingCost = currentGov.cost;
  const subtotal = getCartSubtotal();
  const discount = getCartDiscount();
  const grandTotal = Math.max(0, subtotal - discount + shippingCost);

  const validateEgyptianPhone = (p: string) => {
    const clean = p.replace(/\s+/g, '');
    const regex = /^01[0125][0-9]{8}$/;
    return regex.test(clean);
  };

  const handleClose = () => {
    setCustomerName('');
    setPhone('');
    setAlternatePhone('');
    setCenter('');
    setAddress('');
    setNotes('');
    setPhoneError('');
    setIsCheckoutOpen(false);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!customerName.trim()) {
      alert('برجاء كتابة الاسم بالكامل');
      return;
    }

    if (!validateEgyptianPhone(phone)) {
      setPhoneError('برجاء إدخال رقم محمول مصري صحيح مكون من 11 رقماً ويبدأ بـ 01 (مثل: 01012345678)');
      return;
    }
    setPhoneError('');

    if (!center.trim()) {
      alert('برجاء كتابة المركز أو المدينة التابع لها');
      return;
    }

    if (!address.trim() || address.trim().length < 5) {
      alert('برجاء كتابة العنوان بالتفصيل (اسم الشارع - رقم العقار / المنزل - رقم الشقة وعلامة مميزة)');
      return;
    }

    setIsSubmitting(true);
    try {
      const orderItems: OrderItem[] = cart.map((item) => {
        const firstImg = item.product.images?.[0] || '';
        const isRemoteUrl = firstImg.startsWith('http');
        return {
          productId: item.productId,
          productName: item.product.name,
          subtitle: item.product.subtitle || '',
          image: isRemoteUrl ? firstImg : '',
          size: item.size,
          colorName: item.colorName,
          colorHex: item.colorHex,
          price: item.product.price,
          quantity: item.quantity
        };
      });

      await createOrder({
        customerName: customerName.trim(),
        phone: phone.trim(),
        alternatePhone: alternatePhone.trim() || undefined,
        governorate: selectedGovernorate,
        center: center.trim(),
        address: address.trim(),
        notes: notes.trim() || undefined,
        items: orderItems,
        subtotal,
        shippingCost,
        discount,
        couponCode: appliedCoupon?.code,
        total: grandTotal
      });

      // Directly close the checkout modal without showing any confirmation message screen
      handleClose();
    } catch (err) {
      console.error('Failed to submit order:', err);
      alert('حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div
        id="checkout-modal-panel"
        className="w-full max-w-2xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col relative"
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700" />

        {/* Modal Header */}
        <div className="p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
          <div>
            <h3 className="text-base font-bold text-stone-100">
              إتمام الطلب والدفع عند الاستلام
            </h3>
            <p className="text-xs text-stone-400">
              شحن لجميع محافظات مصر مع حق الفتح والمعاينة
            </p>
          </div>
          <button
            id="close-checkout-modal-btn"
            onClick={handleClose}
            className="text-stone-400 hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <form id="checkout-form" onSubmit={handleSubmitOrder} className="space-y-5">
              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                    الاسم بالكامل <span className="text-amber-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="checkout-name-input"
                      type="text"
                      required
                      placeholder="مثال: محمد أحمد محمود"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 pl-9 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                    />
                    <User className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
                  </div>
                </div>

                {/* Primary Phone */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                    رقم الهاتف المحمول (مصر) <span className="text-amber-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="checkout-phone-input"
                      type="tel"
                      required
                      placeholder="01012345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 pl-9 text-xs font-mono text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                    />
                    <Phone className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
                  </div>
                  {phoneError && (
                    <p className="text-[11px] text-rose-400 mt-1">{phoneError}</p>
                  )}
                </div>

                {/* Alternate Phone */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                    رقم هاتف بديل (اختياري)
                  </label>
                  <div className="relative">
                    <input
                      id="checkout-alt-phone-input"
                      type="tel"
                      placeholder="رقم آخر للتواصل في حال عدم الرد"
                      value={alternatePhone}
                      onChange={(e) => setAlternatePhone(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 pl-9 text-xs font-mono text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                    />
                    <Phone className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
                  </div>
                </div>

                {/* Governorate Select (All 27 Egyptian Governorates) */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                    المحافظة <span className="text-amber-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="checkout-gov-select"
                      value={selectedGovernorate}
                      onChange={(e) => setSelectedGovernorate(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      {governorates.map((gov) => (
                        <option key={gov.name} value={gov.name} className="bg-stone-900 text-stone-100">
                          {gov.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Center / District (المركز) */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                    المركز <span className="text-amber-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="checkout-center-input"
                      type="text"
                      required
                      placeholder="اسم المركز أو الحي (مثال: مركز زفتى، المحلة، مدينة نصر...)"
                      value={center}
                      onChange={(e) => setCenter(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 pl-9 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                    />
                    <Building2 className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
                  </div>
                </div>

                {/* Detailed Street Address */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                    العنوان بالتفصيل <span className="text-amber-500">*</span>
                  </label>
                  <div className="relative">
                    <textarea
                      id="checkout-address-input"
                      required
                      rows={2}
                      placeholder="اسم القرية أو المنطقة - اسم الشارع - رقم العقار / المنزل - رقم الشقة وعلامة مميزة"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 resize-none"
                    />
                    <MapPin className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
                  </div>
                </div>

                {/* Delivery Notes */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                    ملاحظات لمندوب الشحن (اختياري)
                  </label>
                  <div className="relative">
                    <input
                      id="checkout-notes-input"
                      type="text"
                      placeholder="مثال: الاتصال قبل الوصول بنصف ساعة، التوصيل بعد الساعة 4 عصراً"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                    />
                    <FileText className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
                  </div>
                </div>
              </div>

              {/* Order Cost Summary */}
              <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between text-stone-400">
                  <span>سعر الهوديز ({cart.length} قطع):</span>
                  <span className="font-mono text-stone-200">{subtotal} ج.م</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>
                      خصم الكوبون ({appliedCoupon?.code}
                      {appliedCoupon?.targetProductName ? ` - خاص بهودي ${appliedCoupon.targetProductName}` : ''}):
                    </span>
                    <span className="font-mono">-{discount} ج.م</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-400">
                  <span>الشحن لمحافظة {selectedGovernorate}:</span>
                  <span className="font-mono text-stone-200">{shippingCost} ج.م</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-stone-100 border-t border-stone-800 pt-2">
                  <span>المبلغ الإجمالي عند الاستلام:</span>
                  <span className="text-amber-400 font-mono text-base">{grandTotal} ج.م</span>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="flex items-center justify-between text-[11px] text-stone-400 bg-stone-950/40 p-3 rounded-xl border border-stone-800/60">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                  <span>دفع كاش عند الاستلام</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-amber-500" />
                  <span>معاينة وقياس قبل الدفع</span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                id="submit-order-btn"
                type="submit"
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-950/50"
              >
                <span>تأكيد الطلب الآن (الدفع عند الاستلام)</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
            </form>
        </div>
      </div>
    </div>
  );
};
