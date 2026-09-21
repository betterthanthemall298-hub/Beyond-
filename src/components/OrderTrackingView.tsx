import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import {
  Search,
  Package,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  Trash2,
  Phone,
  MapPin,
  MessageCircle,
  AlertCircle
} from 'lucide-react';
import { OrderStatus } from '../types';

export const OrderTrackingView: React.FC = () => {
  const { orders, products, cancelOrder, deleteOrder, openDeleteModal, settings } = useStore();
  const [searchInput, setSearchInput] = useState('');
  const [searched, setSearched] = useState(false);

  const cleanQuery = searchInput.trim().toLowerCase();

  const matchedOrders = orders.filter((o) => {
    if (!cleanQuery) return false;
    const matchNumber = o.orderNumber.toLowerCase().includes(cleanQuery);
    const matchPhone = o.phone.includes(cleanQuery);
    return matchNumber || matchPhone;
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
  };

  const handleCancelOrderPrompt = (orderId: string, orderNumber: string) => {
    openDeleteModal({
      title: 'إلغاء وحذف الطلب',
      description: 'هل تريد حقاً إلغاء هذا الطلب وحذفه؟ إذا تم الشحن بالفعل قد يستغرق التحديث وقتاً أطول.',
      itemLabel: `رقم الطلب: ${orderNumber}`,
      onConfirm: () => {
        cancelOrder(orderId);
      }
    });
  };

  const handleDeletePermanentlyPrompt = (orderId: string, orderNumber: string) => {
    openDeleteModal({
      title: 'حذف الطلب نهائياً من السجلات',
      description: 'سيتم مسح هذا الطلب نهائياً من قاعدة بيانات المتجر.',
      itemLabel: `رقم الطلب: ${orderNumber}`,
      onConfirm: () => {
        deleteOrder(orderId);
      }
    });
  };

  const getStatusStep = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 1;
      case 'processing':
        return 2;
      case 'shipped':
        return 3;
      case 'delivered':
        return 4;
      case 'cancelled':
        return 0;
      default:
        return 1;
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-amber-950/50 border border-amber-800/40 text-amber-400 text-xs font-bold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>قيد المراجعة</span>
          </span>
        );
      case 'processing':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-blue-950/50 border border-blue-800/40 text-blue-400 text-xs font-bold flex items-center gap-1">
            <Package className="w-3.5 h-3.5" />
            <span>جاري التجهيز والتغليف</span>
          </span>
        );
      case 'shipped':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-purple-950/50 border border-purple-800/40 text-purple-400 text-xs font-bold flex items-center gap-1">
            <Truck className="w-3.5 h-3.5" />
            <span>تم التسليم لشركة الشحن</span>
          </span>
        );
      case 'delivered':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-emerald-950/50 border border-emerald-800/40 text-emerald-400 text-xs font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>تم التوصيل بنجاح</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-lg bg-rose-950/50 border border-rose-800/40 text-rose-400 text-xs font-bold flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" />
            <span>تم إلغاء الطلب</span>
          </span>
        );
    }
  };

  return (
    <div id="order-tracking-view" className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-900 border border-stone-800 text-amber-400 text-xs font-bold mb-3">
          <Package className="w-4 h-4" />
          <span>تتبع الشحنات</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-black text-stone-100">
          تتبع حالة شحنتك
        </h2>
        <p className="text-xs sm:text-sm text-stone-400 mt-2">
          أدخل رقم الهاتف لمعرفة حالة طلبك وخط سير الشحنة
        </p>
      </div>

      {/* Search Bar */}
      <form
        onSubmit={handleSearch}
        className="bg-stone-900/80 border border-stone-800 rounded-2xl p-3 sm:p-4 mb-8 shadow-xl flex flex-col sm:flex-row gap-2.5"
      >
        <div className="relative flex-1">
          <input
            id="tracking-search-input"
            type="tel"
            required
            placeholder="أدخل رقم الهاتف"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 pl-10 text-xs sm:text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 font-mono"
          />
          <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-3.5" />
        </div>
        <button
          id="tracking-search-submit-btn"
          type="submit"
          className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold text-xs sm:text-sm transition-colors shrink-0 shadow-md shadow-amber-950/30"
        >
          بحث عن الطلب
        </button>
      </form>

      {/* Results Display */}
      {searched && (
        <div className="space-y-6">
          {matchedOrders.length === 0 ? (
            <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-8 text-center text-stone-400 space-y-3">
              <AlertCircle className="w-10 h-10 text-stone-600 mx-auto" />
              <h3 className="text-base font-bold text-stone-200">لا توجد طلبات مطابقة</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                تأكد من كتابة رقم الهاتف بشكل صحيح كما تم إدخاله أثناء الطلب.
              </p>
            </div>
          ) : (
            matchedOrders.map((order) => {
              const step = getStatusStep(order.status);
              const isCancelled = order.status === 'cancelled';

              return (
                <div
                  key={order.id}
                  id={`tracked-order-${order.id}`}
                  className="bg-stone-900/80 border border-stone-800 rounded-2xl p-5 sm:p-7 shadow-xl space-y-6"
                >
                  {/* Top Order Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-800/80 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-stone-400">كود الطلب:</span>
                        <span className="font-mono font-black text-amber-400 text-lg">
                          {order.orderNumber}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">تاريخ التسجيل: {order.createdAt}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusBadge(order.status)}

                      {/* Explicit Cancel/Delete Order Button */}
                      {!isCancelled ? (
                        <button
                          id={`cancel-order-btn-${order.id}`}
                          type="button"
                          onClick={() => handleCancelOrderPrompt(order.id, order.orderNumber)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 transition-colors flex items-center gap-1.5"
                          title="إلغاء الطلب"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>إلغاء الطلب</span>
                        </button>
                      ) : (
                        <button
                          id={`delete-cancelled-order-btn-${order.id}`}
                          type="button"
                          onClick={() => handleDeletePermanentlyPrompt(order.id, order.orderNumber)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 transition-colors flex items-center gap-1.5"
                          title="حذف من السجلات نهائياً"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف السجل</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Status Timeline Stepper */}
                  {!isCancelled && (
                    <div className="py-2">
                      <div className="grid grid-cols-4 gap-2 text-center text-xs relative">
                        {/* Progress Line */}
                        <div className="absolute top-4 left-6 right-6 h-0.5 bg-stone-800 -z-0">
                          <div
                            className="h-full bg-amber-500 transition-all duration-500"
                            style={{
                              width: `${((step - 1) / 3) * 100}%`
                            }}
                          />
                        </div>

                        {/* Step 1: Received */}
                        <div className="flex flex-col items-center gap-2 relative z-10">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
                              step >= 1
                                ? 'bg-amber-500 text-black border-amber-500 shadow-md shadow-amber-950/40'
                                : 'bg-stone-900 text-stone-500 border-stone-800'
                            }`}
                          >
                            1
                          </div>
                          <span className={step >= 1 ? 'text-stone-200 font-bold' : 'text-stone-500'}>
                            تم الاستلام
                          </span>
                        </div>

                        {/* Step 2: Processing */}
                        <div className="flex flex-col items-center gap-2 relative z-10">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
                              step >= 2
                                ? 'bg-amber-500 text-black border-amber-500 shadow-md shadow-amber-950/40'
                                : 'bg-stone-900 text-stone-500 border-stone-800'
                            }`}
                          >
                            2
                          </div>
                          <span className={step >= 2 ? 'text-stone-200 font-bold' : 'text-stone-500'}>
                            جاري التجهيز
                          </span>
                        </div>

                        {/* Step 3: Shipped */}
                        <div className="flex flex-col items-center gap-2 relative z-10">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
                              step >= 3
                                ? 'bg-amber-500 text-black border-amber-500 shadow-md shadow-amber-950/40'
                                : 'bg-stone-900 text-stone-500 border-stone-800'
                            }`}
                          >
                            3
                          </div>
                          <span className={step >= 3 ? 'text-stone-200 font-bold' : 'text-stone-500'}>
                            مع المندوب
                          </span>
                        </div>

                        {/* Step 4: Delivered */}
                        <div className="flex flex-col items-center gap-2 relative z-10">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
                              step >= 4
                                ? 'bg-emerald-500 text-black border-emerald-500 shadow-md shadow-emerald-950/40'
                                : 'bg-stone-900 text-stone-500 border-stone-800'
                            }`}
                          >
                            4
                          </div>
                          <span className={step >= 4 ? 'text-emerald-400 font-bold' : 'text-stone-500'}>
                            تم التوصيل
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Order Items */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-stone-400">المنتجات المطلوبة:</h4>
                    <div className="space-y-2">
                      {order.items.map((item, idx) => {
                        const matchingProduct = products.find((p) => p.id === item.productId);
                        const printSubtitle = item.subtitle || matchingProduct?.subtitle;
                        const itemImg = item.image || item.images?.[0] || matchingProduct?.images?.[0] || '';
                        const colorName = item.colorName || (matchingProduct?.colors && matchingProduct.colors[0]?.name);
                        const colorHex = item.colorHex || (matchingProduct?.colors && matchingProduct.colors[0]?.hex);

                        return (
                          <div
                            key={idx}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-stone-950/60 border border-stone-800/80 text-xs"
                          >
                            <div className="flex items-center gap-3">
                              {itemImg ? (
                                <img
                                  src={itemImg}
                                  alt={item.productName}
                                  referrerPolicy="no-referrer"
                                  className="w-14 h-16 rounded-xl object-cover border border-stone-700/80 shrink-0"
                                />
                              ) : null}
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-bold text-stone-200">{item.productName}</p>
                                  {printSubtitle && (
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
                                      طبعة: {printSubtitle}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-stone-400 text-[11px] mt-1">
                                  <span>
                                    المقاس: <strong className="text-amber-400 font-semibold">{item.size}</strong>
                                  </span>
                                  <span>•</span>
                                  {colorName && (
                                    <span className="flex items-center gap-1.5">
                                      {colorHex && (
                                        <span
                                          className="w-2.5 h-2.5 rounded-full border border-stone-600 inline-block shrink-0"
                                          style={{ backgroundColor: colorHex }}
                                        />
                                      )}
                                      <span>اللون: <strong className="text-stone-300">{colorName}</strong></span>
                                    </span>
                                  )}
                                  {colorName && <span>•</span>}
                                  <span>الكمية: <strong className="text-stone-200">{item.quantity}</strong></span>
                                </div>
                              </div>
                            </div>
                            <span className="font-mono font-bold text-amber-400 text-sm">
                              {item.price * item.quantity} ج.م
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Customer & Address Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-stone-950/60 p-4 rounded-xl border border-stone-800">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-stone-300">
                        <Phone className="w-3.5 h-3.5 text-amber-500" />
                        <span>الهاتف: {order.phone}</span>
                      </div>
                      <div className="flex items-start gap-1.5 text-stone-300">
                        <MapPin className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                        <span>
                          العنوان: {order.governorate}
                          {order.center ? ` - المركز: ${order.center}` : ''}
                          {' '} - {order.address}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 text-left sm:border-r sm:border-stone-800 sm:pr-4">
                      <div className="flex justify-between sm:justify-end gap-3 text-stone-400">
                        <span>المجموع الفرعي:</span>
                        <span className="font-mono text-stone-200">{order.subtotal} ج.م</span>
                      </div>
                      <div className="flex justify-between sm:justify-end gap-3 text-stone-400">
                        <span>الشحن:</span>
                        <span className="font-mono text-stone-200">+{order.shippingCost} ج.م</span>
                      </div>
                      {order.discount > 0 && (
                        <div className="flex justify-between sm:justify-end gap-3 text-emerald-400">
                          <span>الخصم ({order.couponCode}):</span>
                          <span className="font-mono">-{order.discount} ج.م</span>
                        </div>
                      )}
                      <div className="flex justify-between sm:justify-end gap-3 font-bold text-stone-100 border-t border-stone-800 pt-1 mt-1">
                        <span>المبلغ المستحق:</span>
                        <span className="font-mono text-amber-400 text-sm">{order.total} ج.م</span>
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp Support Button */}
                  <div className="flex justify-end pt-1">
                    <a
                      href={`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(
                        `مرحباً نوكتورن هوديز، أريد الاستفسار عن طلبي رقم: ${order.orderNumber}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-stone-950 border border-stone-800 hover:border-emerald-700/60 text-stone-300 hover:text-emerald-400 text-xs font-semibold flex items-center gap-2 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-400" />
                      <span>تواصل عبر واتساب بخصوص هذا الطلب</span>
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
