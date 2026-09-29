import React from 'react';
import { useStore } from '../store/useStore';
import { isComingSoon } from '../utils/product';
import { Sparkles, Bell } from 'lucide-react';

export const ComingSoon: React.FC = () => {
  const { products, settings } = useStore();

  const items = products.filter(isComingSoon);
  if (settings.comingSoonEnabled === false || items.length === 0) return null;

  const title = settings.comingSoonTitle || 'جديدنا على الطريق';
  const subtitle = settings.comingSoonSubtitle || 'حاجات جديدة بتتجهز عشانك، خليك متابعنا.';

  const whatsappBase =
    settings.whatsappUrl || (settings.whatsappNumber ? `https://wa.me/${settings.whatsappNumber}` : '');
  const notifyLink = whatsappBase
    ? `${whatsappBase}${whatsappBase.includes('?') ? '&' : '?'}text=${encodeURIComponent(
        'عايز أعرف أول ما ينزل الجديد'
      )}`
    : '';

  return (
    <section id="coming-soon-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className="text-center mb-8 sm:mb-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          قريباً
        </span>
        <h2 className="mt-3 text-2xl sm:text-3xl font-black text-stone-100">{title}</h2>
        <p className="mt-2 text-sm text-stone-400">{subtitle}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {items.map((p) => (
          <div key={p.id} className="relative overflow-hidden rounded-2xl border border-stone-800 bg-stone-900/60">
            <span className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full bg-amber-500 text-black text-[10px] font-black">
              قريباً
            </span>
            <div className="aspect-[4/5] bg-stone-950">
              {p.images?.[0] && (
                <img
                  src={p.images[0]}
                  alt={p.name}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-80"
                />
              )}
            </div>
            <div className="p-3 sm:p-4 text-center">
              <h3 className="text-sm font-bold text-stone-100 truncate">{p.name}</h3>
              {p.subtitle && <p className="mt-1 text-[11px] text-stone-500 truncate">{p.subtitle}</p>}
            </div>
          </div>
        ))}
      </div>

      {notifyLink && (
        <div className="mt-8 text-center">
          <a
            href={notifyLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold transition-colors"
          >
            <Bell className="w-4 h-4" />
            نبّهني أول ما ينزل
          </a>
        </div>
      )}
    </section>
  );
};
