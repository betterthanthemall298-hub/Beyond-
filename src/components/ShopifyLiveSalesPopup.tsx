import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { CheckCircle2, ShoppingBag, X } from 'lucide-react';

const SAMPLE_BUYERS = [
  { name: 'محمد من القاهرة (التجمع الخامس)', time: 'قبل 3 دقائق' },
  { name: 'كريم من الجيزة (الشيخ زايد)', time: 'قبل 7 دقائق' },
  { name: 'يوسف من الإسكندرية (سموحة)', time: 'قبل 12 دقيقة' },
  { name: 'أحمد من المنصورة', time: 'قبل 18 دقيقة' },
  { name: 'عمر من طنطا', time: 'قبل 24 دقيقة' },
  { name: 'سارة من المعادي', time: 'قبل 35 دقيقة' }
];

export const ShopifyLiveSalesPopup: React.FC = () => {
  const { products, orders, activeView, setSelectedProduct, setActiveView } = useStore();
  const [currentSale, setCurrentSale] = useState<{
    customerText: string;
    productName: string;
    productImage?: string;
    productId?: string;
    timeText: string;
  } | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only show on storefront customer views (not in admin dashboard)
    const isAdminView = (activeView as string) === 'admin';
    if (isAdminView || dismissed) {
      setVisible(false);
      return;
    }

    // Interval to cycle notifications every 28 seconds
    const interval = setInterval(() => {
      if (dismissed) return;

      // Prefer real orders if any exist, otherwise use store products with sample buyer
      if (orders.length > 0) {
        const randomOrder = orders[Math.floor(Math.random() * orders.length)];
        const item = randomOrder.items[0];
        const firstName = randomOrder.customerName ? randomOrder.customerName.split(' ')[0] : 'عميل';
        setCurrentSale({
          customerText: `${firstName} من ${randomOrder.governorate}`,
          productName: item?.productName || 'هودي أوفر سايز فاخر',
          productImage: item?.image,
          productId: item?.productId,
          timeText: 'طلب مؤكد حديثاً'
        });
        setVisible(true);
      } else if (products.length > 0) {
        const randomProduct = products[Math.floor(Math.random() * products.length)];
        const randomBuyer = SAMPLE_BUYERS[Math.floor(Math.random() * SAMPLE_BUYERS.length)];
        setCurrentSale({
          customerText: randomBuyer.name,
          productName: randomProduct.name,
          productImage: randomProduct.images?.[0],
          productId: randomProduct.id,
          timeText: randomBuyer.time
        });
        setVisible(true);
      }

      // Hide after 6 seconds
      setTimeout(() => {
        setVisible(false);
      }, 6000);
    }, 28000);

    // Initial show after 8 seconds of entering site
    const initialTimer = setTimeout(() => {
      if (dismissed) return;
      if (products.length > 0) {
        const p = products[0];
        const b = SAMPLE_BUYERS[0];
        setCurrentSale({
          customerText: b.name,
          productName: p.name,
          productImage: p.images?.[0],
          productId: p.id,
          timeText: b.time
        });
        setVisible(true);
        setTimeout(() => setVisible(false), 6000);
      }
    }, 8000);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimer);
    };
  }, [orders, products, activeView, dismissed]);

  if (!visible || !currentSale || (activeView as string) === 'admin' || dismissed) return null;

  const handleClick = () => {
    if (currentSale.productId) {
      const prod = products.find((p) => p.id === currentSale.productId);
      if (prod) {
        setSelectedProduct(prod);
        setActiveView('product');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  return (
    <div
      id="shopify-live-sales-popup"
      className="fixed bottom-5 right-5 sm:right-6 z-40 max-w-xs sm:max-w-sm w-full animate-in slide-in-from-bottom-5 fade-in duration-300"
    >
      <div
        onClick={handleClick}
        className="bg-stone-900/95 hover:bg-stone-900 border border-stone-700/80 rounded-2xl p-3 shadow-2xl shadow-black/80 backdrop-blur-md text-stone-100 flex items-center gap-3 cursor-pointer group transition-all duration-300"
      >
        {/* Product image thumbnail */}
        <div className="w-12 h-14 rounded-xl overflow-hidden bg-stone-950 border border-stone-800 shrink-0 relative">
          {currentSale.productImage ? (
            <img
              src={currentSale.productImage}
              alt={currentSale.productName}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-amber-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 text-xs">
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold mb-0.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>طلب شراء جديد مؤكد ✓</span>
          </div>
          <p className="font-semibold text-stone-200 truncate">
            {currentSale.customerText}
          </p>
          <p className="text-[11px] text-stone-400 truncate mt-0.5">
            اشترى: <span className="text-amber-400 font-bold">{currentSale.productName}</span>
          </p>
          <div className="flex items-center justify-between text-[10px] text-stone-500 mt-1">
            <span>{currentSale.timeText}</span>
            <span className="text-stone-400 group-hover:text-amber-400 transition-colors">
              عرض المنتج ←
            </span>
          </div>
        </div>

        {/* Close */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setDismissed(true);
            setVisible(false);
          }}
          className="text-stone-500 hover:text-stone-300 p-1 -mr-1 self-start"
          title="إغلاق التنبيهات"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
