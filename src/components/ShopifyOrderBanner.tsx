import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import {
  onShopifyOrderAlert,
  ShopifyOrderAlertData,
  playOrderNotificationSound
} from '../lib/notifications';
import {
  ShoppingBag,
  ExternalLink,
  Volume2,
  X,
  CheckCircle2,
  Sparkles
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

    // Auto-dismiss after 12 seconds
    const timer = setTimeout(() => {
      setVisible(false);
    }, 12000);

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
      id="shopify-realtime-order-banner"
      className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 z-[120] max-w-md w-full animate-in slide-in-from-top-4 fade-in duration-300"
    >
      <div className="bg-stone-950/95 border-2 border-emerald-500/70 rounded-2xl p-4 shadow-2xl shadow-emerald-950/40 backdrop-blur-xl text-stone-100 flex flex-col gap-3 relative overflow-hidden">
        {/* Glowing emerald highlight */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 animate-pulse" />

        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800/60">
                  Shopify Alert • طلب جديد 💸
                </span>
                <span className="text-[10px] text-stone-400">الآن</span>
              </div>
              <p className="text-xs font-bold text-stone-200 mt-0.5">
                طلب وارد #{activeAlert.orderNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              id="shopify-banner-replay-sound-btn"
              type="button"
              onClick={() => playOrderNotificationSound()}
              className="p-1.5 rounded-lg text-stone-400 hover:text-emerald-400 hover:bg-stone-900 transition-colors"
              title="إعادة تشغيل نغمة الكاشير (Cha-Ching)"
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              id="shopify-banner-close-btn"
              type="button"
              onClick={() => setVisible(false)}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-900 transition-colors"
              aria-label="إغلاق التنبيه"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Customer & Total Details */}
        <div className="bg-stone-900/80 border border-stone-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs">
          <div>
            <p className="font-bold text-stone-100 flex items-center gap-1.5">
              <span>{activeAlert.customerName}</span>
              <span className="text-stone-500">•</span>
              <span className="text-stone-300 font-normal">{activeAlert.governorate}</span>
            </p>
            {activeAlert.itemsSummary && (
              <p className="text-[11px] text-stone-400 mt-0.5 truncate max-w-[220px]">
                {activeAlert.itemsSummary}
              </p>
            )}
          </div>
          <div className="text-left shrink-0">
            <span className="text-emerald-400 font-black text-sm">
              {activeAlert.total} ج.م
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-0.5">
          <button
            id="shopify-banner-view-order-btn"
            type="button"
            onClick={handleOpenOrder}
            className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-950/50"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>معاينة الطلب في لوحة الإدارة</span>
          </button>
          <button
            id="shopify-banner-dismiss-btn"
            type="button"
            onClick={() => setVisible(false)}
            className="py-2 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-semibold transition-colors"
          >
            تخطي
          </button>
        </div>
      </div>
    </div>
  );
};
