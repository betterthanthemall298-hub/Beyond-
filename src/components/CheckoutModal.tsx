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
  Building2,
  CheckCircle2,
  Package,
  Copy,
  Check,
  MessageCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { OrderItem, Order } from '../types';

export const CheckoutModal: React.FC = () => {
  const {
    isCheckoutOpen,
    setIsCheckoutOpen,
    cart,
    governorates,
    appliedCoupon,
    getCartSubtotal,
    getCartDiscount,
    createOrder,
    setActiveView,
    settings
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
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [copied, setCopied] = useState(false);

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
    setConfirmedOrder(null);
    setCopied(false);
    setIsCheckoutOpen(false);
  };

  const handleCopyOrderNumber = (num: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(num);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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

      const newOrder = await createOrder({
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

      // Show confirmation message screen to the customer
      setConfirmedOrder(newOrder);
      try {
        localStorage.setItem('beyond_last_track_query', newOrder.orderNumber);
      } catch {}
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
        <div className={`absolute top-0 left-0 right-0 h-1.5 ${confirmedOrder ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-500' : 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700'}`} />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
          {confirmedOrder ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
                  <span>تم تأكيد طلبك بنجاح</span>
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    #{confirmedOrder.orderNumber}
                  </span>
                </h3>
                <p className="text-xs text-emerald-400 font-medium">
                  طلبك مسجل وجاري مراجعته وتجهيزه للشحن
                </p>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-base font-bold text-stone-100">
                إتمام الطلب والدفع عند الاستلام
              </h3>
              <p className="text-xs text-stone-400">
                شحن لجميع محافظات مصر الـ 27 مع حق الفتح والمعاينة قبل الدفع
              </p>
            </div>
          )}
          <button
            id="close-checkout-modal-btn"
            onClick={handleClose}
            className="text-stone-400 hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-800 transition-colors"
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {confirmedOrder ? (
            /* Order Confirmed Screen */
            <div id="order-confirmed-success-view" className="space-y-6 text-center animate-in zoom-in-95 duration-200">
              {/* Celebration Icon & Banner */}
              <div className="pt-2">
                <div className="relative inline-flex items-center justify-center">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-emerald-500/20 via-emerald-600/10 to-amber-500/10 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-2xl shadow-emerald-950/60">
                    <CheckCircle2 className="w-12 h-12 sm:w-14 sm:h-14 animate-in zoom-in duration-300" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-lg">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-4 space-y-1.5">
                  <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                    تم استلام طلبك بنجاح! 🎉
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-stone-100">
                    تم تأكيد طلبك بنجاح!
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-300 max-w-lg mx-auto leading-relaxed">
                    شكراً لتسوقك من <span className="text-amber-400 font-bold">Beyond</span>! تم تسجيل طلبك وسيقوم فريق العمل بمراجعته وتجهيزه للتسليم لشركة الشحن.
                  </p>
                </div>
              </div>

              {/* Order Info Card */}
              <div className="bg-stone-950 border border-stone-800/90 rounded-2xl p-4 sm:p-5 text-right space-y-4 max-w-xl mx-auto shadow-xl">
                {/* Order Number & Copy */}
                <div className="flex items-center justify-between border-b border-stone-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-stone-400 font-medium">كود الطلب الخاص بك:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base sm:text-lg font-black text-amber-400">
                      #{confirmedOrder.orderNumber}
                    </span>
                    <button
                      id="copy-confirmed-order-number-btn"
                      type="button"
                      onClick={() => handleCopyOrderNumber(confirmedOrder.orderNumber)}
                      className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-semibold border border-stone-700/80 flex items-center gap-1 transition-colors"
                      title="نسخ كود الطلب"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 text-[11px]">تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-[11px]">نسخ الكود</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-stone-900/50 p-2.5 rounded-xl border border-stone-800/60">
                    <span className="text-stone-400 block text-[11px] mb-0.5">اسم العميل:</span>
                    <span className="font-bold text-stone-200 text-sm">{confirmedOrder.customerName}</span>
                  </div>

                  <div className="bg-stone-900/50 p-2.5 rounded-xl border border-stone-800/60">
                    <span className="text-stone-400 block text-[11px] mb-0.5">رقم الهاتف المسجل:</span>
                    <span className="font-mono font-bold text-stone-200 text-sm" dir="ltr">{confirmedOrder.phone}</span>
                  </div>

                  <div className="sm:col-span-2 bg-stone-900/50 p-2.5 rounded-xl border border-stone-800/60">
                    <span className="text-stone-400 block text-[11px] mb-0.5">عنوان التوصيل:</span>
                    <span className="text-stone-200">
                      {confirmedOrder.address} - {confirmedOrder.center} ({confirmedOrder.governorate})
                    </span>
                  </div>

                  <div className="bg-stone-900/50 p-2.5 rounded-xl border border-stone-800/60">
                    <span className="text-stone-400 block text-[11px] mb-0.5">المبلغ المطلوب عند الاستلام:</span>
                    <span className="font-mono font-black text-amber-400 text-base">{confirmedOrder.total} ج.م</span>
                  </div>

                  <div className="bg-stone-900/50 p-2.5 rounded-xl border border-stone-800/60">
                    <span className="text-stone-400 block text-[11px] mb-0.5">المدة التقديرية للتوصيل:</span>
                    <div className="flex items-center gap-1.5 text-stone-200 font-bold">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>{currentGov?.deliveryDays || '2 - 3 أيام عمل'}</span>
                    </div>
                  </div>
                </div>

                {/* Ordered Items Mini List */}
                <div className="border-t border-stone-800/80 pt-3">
                  <span className="text-[11px] text-stone-400 font-bold block mb-2">
                    المنتجات المطلوبة ({confirmedOrder.items?.length || 0}):
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {confirmedOrder.items?.map((it, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs bg-stone-900/80 px-3 py-2 rounded-xl border border-stone-800/60"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-stone-800 flex items-center justify-center font-mono font-bold text-[11px] text-amber-400">
                            {it.quantity}×
                          </span>
                          <span className="font-bold text-stone-200">{it.productName}</span>
                          <span className="text-[11px] text-stone-400">({it.size})</span>
                        </div>
                        <span className="font-mono font-bold text-amber-400">
                          {it.price * it.quantity} ج.م
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Inspection & Cash on Delivery Badge */}
              <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-3 max-w-xl mx-auto flex items-center justify-center gap-2 text-xs text-emerald-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>ضمان المعاينة:</strong> يحق لك فتح الشحنة بالكامل ومعاينة وتجربة الهودي قبل دفع أي مليم للمندوب.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xl mx-auto pt-1">
                <button
                  id="confirmed-order-track-btn"
                  type="button"
                  onClick={() => {
                    localStorage.setItem('beyond_last_track_query', confirmedOrder.orderNumber);
                    handleClose();
                    setActiveView('tracking');
                  }}
                  className="w-full sm:flex-1 py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-950/40"
                >
                  <Package className="w-4 h-4" />
                  <span>تتبع حالة طلبك الآن</span>
                </button>

                <button
                  id="confirmed-order-continue-shopping-btn"
                  type="button"
                  onClick={handleClose}
                  className="w-full sm:flex-1 py-3.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs sm:text-sm transition-colors border border-stone-700"
                >
                  <span>متابعة تصفح المتجر</span>
                </button>
              </div>

              {/* WhatsApp Support Direct Link */}
              {settings.whatsappNumber && (
                <div className="pt-2">
                  <a
                    href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`مرحباً Beyond، قمت بعمل طلب رقم #${confirmedOrder.orderNumber} باسم ${confirmedOrder.customerName} وأريد الاستفسار عن حالة التوصيل.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 font-semibold hover:underline transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>تواصل معنا عبر واتساب بخصوص طلبك</span>
                  </a>
                </div>
              )}
            </div>
          ) : (
            /* Checkout Form */
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
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                    />
                    <User className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
                  </div>
                </div>

                {/* Primary Phone */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                    رقم الهاتف المحمول <span className="text-amber-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="checkout-phone-input"
                      type="tel"
                      required
                      dir="ltr"
                      placeholder="01012345678"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setPhoneError('');
                      }}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 font-mono text-left"
                    />
                    <Phone className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
                  </div>
                  {phoneError && (
                    <p className="text-[11px] text-rose-400 mt-1">{phoneError}</p>
                  )}
                </div>

                {/* Alternate Phone */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                    رقم هاتف إضافي (اختياري)
                  </label>
                  <div className="relative">
                    <input
                      id="checkout-alt-phone-input"
                      type="tel"
                      dir="ltr"
                      placeholder="01112345678"
                      value={alternatePhone}
                      onChange={(e) => setAlternatePhone(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 font-mono text-left"
                    />
                    <Phone className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
                  </div>
                </div>

                {/* Governorate Selection */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                    المحافظة <span className="text-amber-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="checkout-governorate-select"
                      value={selectedGovernorate}
                      onChange={(e) => setSelectedGovernorate(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500 appearance-none"
                    >
                      {governorates.map((g) => (
                        <option key={g.name} value={g.name}>
                          {g.name} — شحن {g.cost} ج.م ({g.deliveryDays || '2-4 أيام'})
                        </option>
                      ))}
                    </select>
                    <Building2 className="w-4 h-4 text-stone-500 absolute left-3 top-2.5 pointer-events-none" />
                  </div>
                </div>

                {/* Center / City */}
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                    المركز / المدينة / الحي <span className="text-amber-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="checkout-center-input"
                      type="text"
                      required
                      placeholder="مثال: مدينة نصر / الدقي / بنها"
                      value={center}
                      onChange={(e) => setCenter(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                    />
                    <MapPin className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
                  </div>
                </div>

                {/* Detailed Street Address */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                    العنوان بالتفصيل (اسم الشارع - رقم العقار - الشقة وعلامة مميزة) <span className="text-amber-500">*</span>
                  </label>
                  <div className="relative">
                    <textarea
                      id="checkout-address-input"
                      required
                      rows={2}
                      placeholder="مثال: شارع التحرير - عمارة 15 - الدور الثالث شقة 5 - بجوار صيدلية العزبي"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 resize-none"
                    />
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
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-black font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-950/50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>جاري تأكيد وتسجيل طلبك...</span>
                  </>
                ) : (
                  <>
                    <span>تأكيد الطلب الآن (الدفع عند الاستلام)</span>
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
