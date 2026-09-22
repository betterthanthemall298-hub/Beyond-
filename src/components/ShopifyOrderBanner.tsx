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

        {/* Header with iOS Shopify look */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 shadow-sm border border-white/10">
              <img
                src="/shopify-icon-192.png"
                alt="Shopify"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-lime-400 bg-lime-950/80 px-2 py-0.5 rounded-md border border-lime-800/60">
                  Shopify
                </span>
                <span className="text-[10px] text-stone-400">الآن • طلب جديد 💸</span>
              </div>
              <p className="text-sm font-black text-stone-100 mt-0.5 tracking-tight">
                Order #{activeAlert.orderNumber}
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

        {/* Exact Shopify iOS Subtitle Style */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-3 flex flex-col gap-1 text-xs">
          <p className="font-bold text-stone-100 text-xs sm:text-sm tracking-tight text-left dir-ltr font-mono">
            E£{Number(activeAlert.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, {activeAlert.itemsCount || 1} {(activeAlert.itemsCount || 1) === 1 ? 'item' : 'items'} from Online Store - Beyond
          </p>
          <div className="flex items-center justify-between pt-1 border-t border-stone-800/70 text-[11px] text-stone-400">
            <span>العميل: <strong className="text-stone-200">{activeAlert.customerName}</strong></span>
            <span>📍 {activeAlert.governorate}</span>
          </div>
          {activeAlert.itemsSummary && (
            <p className="text-[10px] text-stone-500 truncate mt-0.5">
              {activeAlert.itemsSummary}
            </p>
          )}
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
