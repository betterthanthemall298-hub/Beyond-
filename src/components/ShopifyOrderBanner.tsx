import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import {
  onShopifyOrderAlert,
  ShopifyOrderAlertData,
  playOrderNotificationSound
} from '../lib/notifications';
import {
  Bell,
  ExternalLink,
  Volume2,
  X
} from 'lucide-react';

export const ShopifyOrderBanner: React.FC = () => {
  const { setActiveView, isAdminLoggedIn } = useStore();
  const [activeAlert, setActiveAlert] = useState<ShopifyOrderAlertData | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = onShopifyOrderAlert((data) => {
      setActiveAlert(data);
      setVisible(true);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!visible || !activeAlert) return;

    const timer = setTimeout(() => {
      setVisible(false);
    }, 10000);

    return () => clearTimeout(timer);
  }, [visible, activeAlert]);

  if (!visible || !activeAlert || !isAdminLoggedIn) return null;

  const handleOpenOrder = () => {
    setVisible(false);
    setActiveView('admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      id="new-order-banner"
      className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 z-[120] max-w-md w-full animate-in slide-in-from-top-4 fade-in duration-300"
    >
      <div className="bg-stone-950/95 border-2 border-amber-500/70 rounded-2xl p-4 shadow-2xl backdrop-blur-xl text-stone-100 flex flex-col gap-3 relative overflow-hidden">
        {/* Subtle top indicator */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600" />

        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <p className="text-sm font-black text-amber-400 tracking-tight">
                أوردر جديد
              </p>
              <p className="text-[11px] text-stone-400">
                طلب رقم #{activeAlert.orderNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              id="order-banner-replay-sound-btn"
              type="button"
              onClick={() => playOrderNotificationSound()}
              className="p-1.5 rounded-lg text-stone-400 hover:text-amber-400 hover:bg-stone-900 transition-colors"
              title="إعادة تشغيل نغمة التنبيه"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              id="order-banner-close-btn"
              type="button"
              onClick={() => setVisible(false)}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-900 transition-colors"
              aria-label="إغلاق التنبيه"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Minimal Order Details: Customer Name and Price Only */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-3 flex flex-col gap-1.5 text-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="text-stone-400">اسم العميل:</span>
            <strong className="text-stone-100 font-bold">{activeAlert.customerName}</strong>
          </div>
          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-stone-800">
            <span className="text-stone-400">سعر الأوردر:</span>
            <strong className="text-amber-400 font-extrabold text-sm">{activeAlert.total} ج.م</strong>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-0.5">
          <button
            id="order-banner-view-order-btn"
            type="button"
            onClick={handleOpenOrder}
            className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>عرض في لوحة الإدارة</span>
          </button>
          <button
            id="order-banner-dismiss-btn"
            type="button"
            onClick={() => setVisible(false)}
            className="py-2 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-semibold transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
